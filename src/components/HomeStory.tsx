"use client";

import Link from "next/link";
import { type CSSProperties, useEffect, useRef, useState } from "react";
import type { Dictionary, Locale } from "@/i18n/config";
import { PART_IDS, type PartId } from "@/scene/parts";
import { initialQuality } from "@/scene/quality";
import type { SceneHandle } from "@/scene/runScene";
import { progressFor } from "@/scene/scrollProgress";
import { SCENES, localProgress, smoothstep } from "@/scene/timeline";
import { readTheme, useTheme } from "@/theme/useTheme";
import { POSTERS, STILLS } from "./storyStills";

type Mode = "pending" | "live" | "stills";

/** Length of the line from a part to its label, in pixels. */
const LEADER = 44;

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
  const labelsRef = useRef<HTMLDivElement>(null);
  const labelRefs = useRef<Partial<Record<PartId, HTMLButtonElement | null>>>({});
  const leaderRefs = useRef<Partial<Record<PartId, SVGGElement | null>>>({});
  const sceneRef = useRef<SceneHandle | null>(null);
  const cardTitleRef = useRef<HTMLHeadingElement>(null);
  const [mode, setMode] = useState<Mode>("pending");
  const [ready, setReady] = useState(false);
  const [still, setStill] = useState(false);
  // The part whose information card is open.
  const [selected, setSelected] = useState<PartId | null>(null);

  useEffect(() => {
    const section = sectionRef.current!;
    const canvas = canvasRef.current!;
    const labelLayer = labelsRef.current!;
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
    // Part labels can be reached by keyboard only while the printer is apart.
    labelLayer.inert = true;

    function measure() {
      if (fixed === null) {
        const rect = section.getBoundingClientRect();
        progress = progressFor(rect.top, rect.height, window.innerHeight);
      }
      beats.forEach((beat, i) => beat.style.setProperty("--reveal", String(localProgress(progress, SCENES[i].id) * 2)));
      // The caption shows while the printer is apart, and goes before the next text scrolls in.
      const apart = localProgress(progress, "explode");
      const caption = Math.min(smoothstep(apart / 0.12), 1 - smoothstep((apart - 0.88) / 0.12));
      section.style.setProperty("--caption", String(caption));
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
        isVisible: () => visible,
        onGrabbable(target) {
          if (target) section.dataset.grab = target;
          else delete section.dataset.grab;
          labelLayer.inert = target !== "printer";
          if (target !== "printer") setSelected(null);
        },
        onHoverPart(id) {
          for (const part of PART_IDS) labelRefs.current[part]?.classList.toggle("story__label--hot", part === id);
        },
        onSelectPart: setSelected,
        onLabels(positions) {
          // Labels sit at the end of a short line drawn outwards from the
          // middle of the parts, like callouts on a technical drawing.
          const visibleOnes = positions.filter((p) => p.opacity > 0);
          const cx = visibleOnes.reduce((sum, p) => sum + p.x, 0) / (visibleOnes.length || 1);
          const cy = visibleOnes.reduce((sum, p) => sum + p.y, 0) / (visibleOnes.length || 1);
          const width = canvas.clientWidth;
          for (const { id, x, y, opacity } of positions) {
            const el = labelRefs.current[id];
            const leader = leaderRefs.current[id];
            if (!el || !leader) continue;
            let dx = x - cx;
            let dy = y - cy;
            const length = Math.hypot(dx, dy) || 1;
            dx /= length;
            dy /= length;
            const endX = x + dx * LEADER;
            const endY = y + dy * LEADER * 0.6;
            // Labels point away from the middle, and never run off either edge.
            let flip = dx < 0;
            if (flip && endX - el.offsetWidth < 8) flip = false;
            if (!flip && endX + el.offsetWidth > width - 8) flip = true;
            el.classList.toggle("story__label--flip", flip);
            el.style.transform = `translate(${flip ? endX - el.offsetWidth : endX}px, ${endY - el.offsetHeight / 2}px)`;
            el.style.opacity = String(opacity);
            const [line, dot] = leader.children as unknown as [SVGLineElement, SVGCircleElement];
            line.setAttribute("x1", String(x));
            line.setAttribute("y1", String(y));
            line.setAttribute("x2", String(endX));
            line.setAttribute("y2", String(endY));
            dot.setAttribute("cx", String(x));
            dot.setAttribute("cy", String(y));
            leader.style.opacity = String(opacity);
          }
        },
      });
      if (cancelled) {
        started.dispose();
        return;
      }
      handle = started;
      sceneRef.current = started;
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
      sceneRef.current = null;
    };
  }, [t.story.labels]);

  // The open card: the scene focuses on its part, its label stays lit, Escape closes it.
  useEffect(() => {
    sceneRef.current?.setSelected(selected);
    const section = sectionRef.current!;
    for (const part of PART_IDS) labelRefs.current[part]?.classList.toggle("story__label--selected", part === selected);
    if (!selected) {
      delete section.dataset.card;
      return;
    }
    section.dataset.card = selected;
    cardTitleRef.current?.focus({ preventScroll: true });
    const label = labelRefs.current[selected];
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      label?.focus({ preventScroll: true });
      setSelected(null);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [selected]);

  /** Closes the card and hands focus back to the part's label. */
  function closeCard() {
    if (selected) labelRefs.current[selected]?.focus({ preventScroll: true });
    setSelected(null);
  }

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
      <div
        className="story__stage"
        style={{ "--poster-light": `url(${POSTERS.light.src})`, "--poster-dark": `url(${POSTERS.dark.src})` } as CSSProperties}
      >
        <canvas ref={canvasRef} className="story__canvas" aria-hidden="true" />
        <svg className="story__leaders" aria-hidden="true">
          {PART_IDS.map((id) => (
            <g
              key={id}
              ref={(el) => {
                leaderRefs.current[id] = el;
              }}
            >
              <line />
              <circle r="3" />
            </g>
          ))}
        </svg>
        {/* Part labels: each opens the part's card. The story text lists the same parts. */}
        <div className="story__labels" ref={labelsRef}>
          {PART_IDS.map((id) => (
            <button
              key={id}
              type="button"
              className="story__label"
              aria-expanded={selected === id}
              onClick={() => setSelected(selected === id ? null : id)}
              ref={(el) => {
                labelRefs.current[id] = el;
              }}
            >
              {t.story.labels[id]}
            </button>
          ))}
        </div>
        <p className="story__hint story__hint--mug" aria-hidden="true">
          {t.story.dragHint.mug}
        </p>
        {/* While the printer is apart in the middle of the stage, its text is a caption at the bottom. */}
        <div className="story__caption" aria-hidden="true">
          <p className="story__caption-title">{rest[1].title}</p>
          <p>{rest[1].text}</p>
          <p className="story__caption-hint">{t.story.dragHint.printer}</p>
        </div>
        {selected && (
          <div className="story__card" role="region" aria-labelledby="part-card-title">
            <button type="button" className="story__card-close" onClick={closeCard}>
              <span aria-hidden="true">×</span>
              <span className="visually-hidden">{t.story.close}</span>
            </button>
            <p className="story__card-kicker">{t.story.partsListTitle}</p>
            <h3 id="part-card-title" ref={cardTitleRef} tabIndex={-1}>
              {t.story.labels[selected]}
            </h3>
            <p>{t.story.parts[selected].what}</p>
            <p className="story__card-tip">
              <strong>{t.story.repairTip}</strong> {t.story.parts[selected].repair}
            </p>
          </div>
        )}
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
          // The taken-apart scene shows its text as the stage's caption instead.
          <div className={`story__beat${i === 1 ? " story__beat--caption" : ""}`} data-beat key={scene.title}>
            <div className="story__text">
              <h2>{scene.title}</h2>
              <p>{scene.text}</p>
            </div>
            {stillFrame(i + 1)}
            {i === 1 && (
              <>
                <h3 className="visually-hidden">{t.story.partsListTitle}</h3>
                <ul className="visually-hidden">
                  {PART_IDS.map((id) => (
                    <li key={id}>
                      {t.story.labels[id]}: {t.story.parts[id].what}
                    </li>
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
