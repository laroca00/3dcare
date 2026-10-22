"use client";

import Image from "next/image";
import { type CSSProperties, useEffect, useRef, useState } from "react";
import { unboxingCards } from "@/content/unboxing";
import type { Dictionary, Locale } from "@/i18n/config";
import { initialQuality } from "@/scene/quality";
import { progressFor } from "@/scene/scrollProgress";
import { unboxingMotion } from "@/scene/unboxingMotion";
import type { Unboxing as Scene } from "@/scene/unboxing";

type Mode = "pending" | "live" | "static";

function canRenderWebGL() {
  try {
    return Boolean(document.createElement("canvas").getContext("webgl2"));
  } catch {
    return false;
  }
}

/**
 * After the home story the mug goes into its box: what every model comes
 * with is listed beside it, the box opens again and the pictures come out of
 * it as a strip of cards that scrolls past. With reduced motion or without
 * WebGL there is no box, and the strip is a plain row that scrolls sideways.
 */
export function Unboxing({ lang, t }: { lang: Locale; t: Dictionary["home"] }) {
  const sectionRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stripRef = useRef<HTMLOListElement>(null);
  const [mode, setMode] = useState<Mode>("pending");

  useEffect(() => {
    const section = sectionRef.current!;
    const canvas = canvasRef.current!;
    const strip = stripRef.current!;
    const live = !matchMedia("(prefers-reduced-motion: reduce)").matches && canRenderWebGL();
    queueMicrotask(() => setMode(live ? "live" : "static"));
    if (!live) return;

    let scene: Scene | null = null;
    let cancelled = false;
    let frame = 0;

    function update() {
      frame = 0;
      const rect = section.getBoundingClientRect();
      const p = progressFor(rect.top, rect.height, window.innerHeight);
      const m = unboxingMotion(p);
      section.style.setProperty("--intro", String(1 - m.dive));
      section.style.setProperty("--contents", String(Math.min(m.close, 1 - m.open)));
      section.style.setProperty("--dive", String(m.dive));
      section.style.setProperty("--cards", String(m.cards));
      // The strip slides from its first card to its last.
      const travel = Math.max(strip.scrollWidth - strip.parentElement!.clientWidth, 0);
      strip.style.transform = `translateX(${-m.slide * travel}px)`;
      scene?.render(p);
    }
    const request = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    const onResize = () => {
      scene?.resize();
      request();
    };

    // The 3D box loads once the section comes near.
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || scene) return;
        io.disconnect();
        void import("@/scene/unboxing").then(({ startUnboxing }) => {
          if (cancelled) return;
          scene = startUnboxing(canvas, initialQuality({ width: window.innerWidth, dpr: window.devicePixelRatio, cores: navigator.hardwareConcurrency || 4 }));
          request();
        });
      },
      { rootMargin: "100% 0px" },
    );
    io.observe(section);
    window.addEventListener("scroll", request, { passive: true });
    window.addEventListener("resize", onResize);
    request();
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      io.disconnect();
      window.removeEventListener("scroll", request);
      window.removeEventListener("resize", onResize);
      scene?.dispose();
    };
  }, []);

  return (
    <section className="unbox" ref={sectionRef} data-mode={mode} aria-labelledby="unbox-title">
      <div className="unbox__stage">
        <canvas className="unbox__canvas" ref={canvasRef} aria-hidden="true" />
        <div className="unbox__intro container">
          <p className="unbox__kicker">[ 3D Care ]</p>
          <h2 id="unbox-title">{t.unboxTitle}</h2>
          <ul className="unbox__contents">
            {t.unboxContents.map((item, i) => (
              <li key={item} style={{ "--i": i } as CSSProperties}>
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div className="unbox__cards">
          <p className="unbox__cards-title container">{t.unboxCardsTitle}</p>
          <div className="unbox__viewport">
            <ol className="unbox__strip" ref={stripRef}>
              {unboxingCards.map((card) => (
                <li key={card.image.src} className="unbox__card" style={{ "--ratio": card.image.width / card.image.height } as CSSProperties}>
                  <figure>
                    <Image src={card.image} alt={card.alt[lang]} sizes="(min-width: 900px) 50vw, 90vw" />
                    <figcaption>
                      <strong>{card.title[lang]}</strong>
                      <span>{card.spec[lang]}</span>
                    </figcaption>
                  </figure>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}
