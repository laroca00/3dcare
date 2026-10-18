"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { Dictionary, Locale } from "@/i18n/config";
import { PART_IDS, type PartId } from "@/scene/parts";
import { initialQuality } from "@/scene/quality";
import type { SceneHandle } from "@/scene/runScene";
import { progressFor } from "@/scene/scrollProgress";
import { SCENES, localProgress } from "@/scene/timeline";
import { readTheme, useTheme } from "@/theme/useTheme";
import { STILLS } from "./storyStills";

type Mode = "pending" | "live" | "stills";

function canRenderWebGL() {
  try {
    return Boolean(document.createElement("canvas").getContext("webgl2"));
  } catch {
    return false;
  }
}

/**
 * The scroll story at the top of the home page: a sticky 3D stage with the
 * story text scrolling over it. The text renders first; the 3D scene loads on
 * the visitor's first interaction. Without WebGL or with reduced motion, the
 * story is told with still frames instead.
 */
export function HomeStory({ lang, t }: { lang: Locale; t: Dictionary["home"] }) {
  const sectionRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const labelRefs = useRef<Partial<Record<PartId, HTMLSpanElement | null>>>({});
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

    const INTENT = ["scroll", "wheel", "pointermove", "pointerdown", "touchstart", "keydown"] as const;
    let loading = false;
    const load = async () => {
      if (loading) return;
      loading = true;
      INTENT.forEach((type) => window.removeEventListener(type, load));
      const { startScene } = await import("@/scene/runScene");
      if (cancelled) return;
      const started = await startScene(canvas, {
        theme: readTheme(),
        quality: initialQuality({
          width: window.innerWidth,
          dpr: window.devicePixelRatio,
          cores: navigator.hardwareConcurrency || 4,
        }),
        getProgress: () => progress,
        labels: t.story.labels,
        ending: fixed !== null && params.get("ending") === "table" ? "table" : "hand",
        onLabels(positions) {
          for (const { id, x, y, opacity } of positions) {
            const el = labelRefs.current[id];
            if (!el) continue;
            el.style.transform = `translate(${x}px, ${y}px)`;
            el.style.opacity = String(opacity);
          }
        },
      });
      if (cancelled) {
        started.dispose();
        return;
      }
      handle = started;
      handle.invalidate();
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          if (cancelled) return;
          setReady(true);
          if (fixed !== null) document.documentElement.dataset.storyReady = "1";
        }),
      );
    };

    if (live) {
      // At the top of the page the story has not started yet, so the scene can
      // wait for the visitor's first scroll, touch or key press. This keeps its
      // set-up work out of the page's first seconds. Frozen frames load at once.
      if (fixed !== null) void load();
      else INTENT.forEach((type) => window.addEventListener(type, load, { passive: true, once: true }));
    }

    return () => {
      cancelled = true;
      INTENT.forEach((type) => window.removeEventListener(type, load));
      window.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
      io.disconnect();
      themeObserver.disconnect();
      handle?.dispose();
    };
  }, [t.story.labels]);

  const [first, ...rest] = t.story.scenes;
  const theme = useTheme() ?? "light";
  // Reduced motion or no WebGL: each part of the story gets its still frame.
  const stillFrame = (i: number) =>
    mode === "stills" && (
      <img
        className="story__still"
        src={STILLS[theme][i].src}
        width={STILLS[theme][i].width}
        height={STILLS[theme][i].height}
        alt={t.story.stillAlt[i]}
        loading={i === 0 ? "eager" : "lazy"}
      />
    );

  return (
    <section
      ref={sectionRef}
      className={`story story--${mode}${ready ? " story--ready" : ""}${still ? " story--still" : ""}`}
      aria-labelledby="story-title"
    >
      <div className="story__stage">
        <canvas ref={canvasRef} className="story__canvas" aria-hidden="true" />
        {/* Part labels; screen readers get the same list in the story text. */}
        <div className="story__labels" aria-hidden="true">
          {PART_IDS.map((id) => (
            <span
              key={id}
              className="story__label"
              ref={(el) => {
                labelRefs.current[id] = el;
              }}
            >
              {t.story.labels[id]}
            </span>
          ))}
        </div>
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
          {stillFrame(0)}
        </div>
        {rest.map((scene, i) => (
          <div className="story__beat" data-beat key={scene.title}>
            <h2>{scene.title}</h2>
            <p>{scene.text}</p>
            {stillFrame(i + 1)}
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
