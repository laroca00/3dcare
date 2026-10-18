"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { Dictionary, Locale } from "@/i18n/config";
import { PART_IDS } from "@/scene/parts";
import { initialQuality } from "@/scene/quality";
import type { SceneHandle } from "@/scene/runScene";
import { progressFor } from "@/scene/scrollProgress";
import { SCENES, localProgress } from "@/scene/timeline";
import type { Theme } from "@/theme/theme";
import { PrintFigure } from "./PrintFigure";

type Mode = "pending" | "live" | "stills";

const readTheme = (): Theme => (document.documentElement.dataset.theme === "dark" ? "dark" : "light");

function canRenderWebGL() {
  try {
    return Boolean(document.createElement("canvas").getContext("webgl2"));
  } catch {
    return false;
  }
}

/**
 * The scroll story at the top of the home page: a sticky 3D stage with the
 * story text scrolling over it. Text and a static picture render first; the
 * 3D scene loads after the page has painted.
 */
export function HomeStory({ lang, t }: { lang: Locale; t: Dictionary["home"] }) {
  const sectionRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mode, setMode] = useState<Mode>("pending");
  const [ready, setReady] = useState(false);
  const [still, setStill] = useState(false);

  useEffect(() => {
    const section = sectionRef.current!;
    const canvas = canvasRef.current!;
    const params = new URLSearchParams(location.search);
    // ?story=0.5 freezes the story at one moment (used to render still frames).
    const fixed = params.has("story") ? Number(params.get("story")) : null;
    const forcedTheme = params.get("theme");
    if (fixed !== null && (forcedTheme === "light" || forcedTheme === "dark")) {
      document.documentElement.dataset.theme = forcedTheme;
    }
    // A frozen frame shows the stage alone, filling the window.
    if (fixed !== null) document.documentElement.dataset.storyStill = "1";

    const beats = [...section.querySelectorAll<HTMLElement>("[data-beat]")];
    let progress = fixed ?? 0;
    let handle: SceneHandle | null = null;
    let visible = true;
    let cancelled = false;

    function measure() {
      if (fixed === null) {
        const rect = section.getBoundingClientRect();
        progress = progressFor(rect.top, rect.height, window.innerHeight);
      }
      beats.forEach((beat, i) => beat.style.setProperty("--reveal", String(localProgress(progress, SCENES[i].id) * 2)));
      if (visible) handle?.invalidate();
    }

    const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const live = !reducedMotion && canRenderWebGL();
    // Deciding after mount keeps server and client markup identical.
    queueMicrotask(() => {
      if (!cancelled) setMode(live ? "live" : "stills");
      if (!cancelled && fixed !== null) setStill(true);
    });

    measure();
    window.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("resize", measure);

    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) handle?.invalidate();
    });
    io.observe(section);

    const themeObserver = new MutationObserver(() => handle?.setTheme(readTheme()));
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

    let idle = 0;
    if (live) {
      const load = async () => {
        const { startScene } = await import("@/scene/runScene");
        if (cancelled) return;
        handle = startScene(canvas, {
          theme: readTheme(),
          quality: initialQuality({
            width: window.innerWidth,
            dpr: window.devicePixelRatio,
            cores: navigator.hardwareConcurrency || 4,
          }),
          getProgress: () => progress,
          labels: t.story.labels,
        });
        handle.invalidate();
        requestAnimationFrame(() =>
          requestAnimationFrame(() => {
            if (cancelled) return;
            setReady(true);
            if (fixed !== null) document.documentElement.dataset.storyReady = "1";
          }),
        );
      };
      idle = window.requestIdleCallback
        ? window.requestIdleCallback(() => void load(), { timeout: 1500 })
        : window.setTimeout(() => void load(), 200);
    }

    return () => {
      cancelled = true;
      if (window.cancelIdleCallback) window.cancelIdleCallback(idle);
      else clearTimeout(idle);
      window.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
      io.disconnect();
      themeObserver.disconnect();
      handle?.dispose();
    };
  }, [t.story.labels]);

  const [first, ...rest] = t.story.scenes;

  return (
    <section
      ref={sectionRef}
      className={`story story--${mode}${ready ? " story--ready" : ""}${still ? " story--still" : ""}`}
      aria-labelledby="story-title"
    >
      <div className="story__stage">
        <div className="story__fallback" aria-hidden="true">
          <PrintFigure label="" />
        </div>
        <canvas ref={canvasRef} className="story__canvas" aria-hidden="true" />
      </div>

      <div className="story__beats container">
        <div className="story__beat story__beat--intro" data-beat>
          <h1 id="story-title">{t.title}</h1>
          <p className="lead">{t.lead}</p>
          <p className="actions">
            <Link href={`/${lang}/models/`} className="btn btn--primary">
              {t.browse}
            </Link>
            <Link href={`/${lang}/training/`} className="btn btn--secondary">
              {t.training}
            </Link>
          </p>
          {first.text && <p>{first.text}</p>}
        </div>
        {rest.map((scene, i) => (
          <div className="story__beat" data-beat key={scene.title}>
            <h2>{scene.title}</h2>
            <p>{scene.text}</p>
            {i === 1 && (
              <>
                <h3 className="visually-hidden">{t.story.partsListTitle}</h3>
                <ul className="visually-hidden">
                  {PART_IDS.map((id) => (
                    <li key={id}>{t.story.labels[id]}</li>
                  ))}
                </ul>
              </>
            )}
            {i === rest.length - 1 && (
              <p className="actions">
                <Link href={`/${lang}/models/`} className="btn btn--primary">
                  {t.browse}
                </Link>
              </p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
