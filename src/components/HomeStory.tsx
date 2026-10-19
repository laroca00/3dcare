"use client";

import Link from "next/link";
import { type CSSProperties, useEffect, useRef, useState } from "react";
import type { Dictionary, Locale } from "@/i18n/config";
import { PART_IDS, type PartId } from "@/scene/parts";
import { initialQuality } from "@/scene/quality";
import type { SceneHandle } from "@/scene/runScene";
import { progressFor } from "@/scene/scrollProgress";
import { quadTransform } from "@/scene/quadTransform";
import { LAYERS, slicerPanel } from "@/scene/storyMotion";
import { SCENES, localProgress, smoothstep } from "@/scene/timeline";
import { readTheme, useTheme } from "@/theme/useTheme";
import emblemEn from "@/assets/eu/co-funded-en-neg.png";
import emblemTr from "@/assets/eu/co-funded-tr-neg.png";
import { makeSouvenirCard } from "./souvenirCard";
import { POSTERS, STILLS } from "./storyStills";

type Mode = "pending" | "live" | "stills";

/** Length of the line from a part to its label, in pixels. */
const LEADER = 44;

/** Filament colours offered in the slicer: the project's own three, then white and coral. */
const FILAMENTS = [
  { id: "teal", color: 0x2aa898 },
  { id: "violet", color: 0x6f52c9 },
  { id: "yellow", color: 0xf5c400 },
  { id: "white", color: 0xeef1ef },
  { id: "coral", color: 0xff7a59 },
] as const;
type FilamentId = (typeof FILAMENTS)[number]["id"];

/** How long the rest of the story takes to play when the visitor presses "Print", in milliseconds. */
const PRINT_MS = 14000;
/** The slicer is laid out at this size, then fitted onto the printer's screen. */
const SCREEN_W = 760;
const SCREEN_H = 420;

/** The mug as the slicer draws it: one line per layer, with both handles. */
function MugLayers({ color }: { color: string }) {
  const lines = [];
  for (let layer = 0; layer < LAYERS; layer++) {
    const y = 176 - layer * 5;
    lines.push(<line key={`w${layer}`} x1={70} x2={150} y1={y} y2={y} />);
    const arm = [5, 6, 7, 22, 23, 24].includes(layer);
    const grip = layer >= 8 && layer <= 21;
    if (arm) lines.push(<line key={`a${layer}`} x1={36} x2={70} y1={y} y2={y} />, <line key={`b${layer}`} x1={150} x2={184} y1={y} y2={y} />);
    if (grip) lines.push(<line key={`g${layer}`} x1={34} x2={44} y1={y} y2={y} />, <line key={`h${layer}`} x1={176} x2={186} y1={y} y2={y} />);
  }
  return (
    <svg className="story__screen-mug" viewBox="0 0 220 200" aria-hidden="true" stroke={color} strokeWidth="2.4" strokeLinecap="round">
      {lines}
    </svg>
  );
}

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
  const slicerRef = useRef<HTMLDivElement>(null);
  const screenRef = useRef<HTMLDivElement>(null);
  const [filament, setFilament] = useState<FilamentId>("teal");
  // The souvenir card, once made: its picture and an address to show and download it.
  const [souvenir, setSouvenir] = useState<{ blob: Blob; url: string } | null>(null);
  const souvenirTitleRef = useRef<HTMLHeadingElement>(null);
  const souvenirButtonRef = useRef<HTMLButtonElement>(null);
  const filamentRef = useRef<FilamentId>("teal");
  const [mode, setMode] = useState<Mode>("pending");
  const [ready, setReady] = useState(false);
  const [still, setStill] = useState(false);
  // The part whose information card is open.
  const [selected, setSelected] = useState<PartId | null>(null);

  useEffect(() => {
    const section = sectionRef.current!;
    const canvas = canvasRef.current!;
    const labelLayer = labelsRef.current!;
    const slicer = slicerRef.current!;
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
    slicer.inert = true;

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
      // The slicer panel opens before printing; it can be used only while it shows.
      const panel = slicerPanel(progress);
      section.style.setProperty("--slicer", String(panel));
      // At the end of the story the souvenir card can be made.
      if (live && localProgress(progress, "use") > 0.75) section.dataset.end = "1";
      else delete section.dataset.end;
      const open = live && panel > 0.5;
      slicer.inert = !open;
      if (open) section.dataset.slicer = "1";
      else delete section.dataset.slicer;
      if (visible) handle?.invalidate();
    }

    // Deciding after mount keeps server and client markup identical.
    queueMicrotask(() => {
      if (!cancelled) setMode(live ? "live" : "stills");
      if (!cancelled && fixed !== null) setStill(true);
    });

    const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const live = !reducedMotion && canRenderWebGL();

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
        onScreen(corners) {
          // The slicer sits on the printer's screen, in perspective.
          const screen = screenRef.current;
          if (!screen) return;
          screen.style.visibility = corners ? "visible" : "hidden";
          if (corners) screen.style.transform = quadTransform(SCREEN_W, SCREEN_H, corners);
        },
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
      started.setFilament(FILAMENTS.find((f) => f.id === filamentRef.current)!.color);
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

  // The chosen filament colour goes to the spool, the slicer preview and the mug.
  useEffect(() => {
    filamentRef.current = filament;
    sceneRef.current?.setFilament(FILAMENTS.find((f) => f.id === filament)!.color);
  }, [filament]);

  /**
   * "Print": the page scrolls on by itself to the end of the story, as if the
   * printer had started. Any scroll, touch, click or key press takes over.
   */
  function startPrint() {
    const section = sectionRef.current!;
    const from = window.scrollY;
    const to = section.getBoundingClientRect().top + window.scrollY + section.offsetHeight - window.innerHeight;
    const start = performance.now();
    let raf = 0;
    const takeOver = ["wheel", "touchstart", "keydown", "pointerdown"] as const;
    const stop = () => {
      cancelAnimationFrame(raf);
      takeOver.forEach((type) => window.removeEventListener(type, stop));
    };
    const step = (now: number) => {
      const t = Math.min((now - start) / PRINT_MS, 1);
      window.scrollTo(0, from + (to - from) * smoothstep(t));
      if (t < 1) raf = requestAnimationFrame(step);
      else stop();
    };
    raf = requestAnimationFrame(step);
    takeOver.forEach((type) => window.addEventListener(type, stop, { passive: true }));
  }

  /** Makes the souvenir card from a picture of the mug as it is on the table now. */
  async function openSouvenir() {
    const picture = sceneRef.current?.snapshot();
    if (!picture) return;
    const colour = t.story.slicer.colors[filament];
    const blob = await makeSouvenirCard(
      picture,
      {
        title: t.story.souvenir.title,
        details: t.story.souvenir.details.replace("{colour}", colour),
        tagline: t.title,
        url: location.origin + location.pathname,
      },
      (lang === "tr" ? emblemTr : emblemEn).src,
    );
    setSouvenir({ blob, url: URL.createObjectURL(blob) });
  }

  function closeSouvenir() {
    if (souvenir) URL.revokeObjectURL(souvenir.url);
    setSouvenir(null);
    souvenirButtonRef.current?.focus({ preventScroll: true });
  }

  async function shareSouvenir() {
    if (!souvenir) return;
    const file = new File([souvenir.blob], t.story.souvenir.fileName, { type: "image/png" });
    try {
      await navigator.share({ files: [file], title: t.story.souvenir.title, text: t.title });
    } catch {
      // Cancelled by the visitor, or not allowed: the download link is still there.
    }
  }

  // The souvenir dialog: focus goes to its heading, Escape closes it.
  useEffect(() => {
    if (!souvenir) return;
    souvenirTitleRef.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      URL.revokeObjectURL(souvenir.url);
      setSouvenir(null);
      souvenirButtonRef.current?.focus({ preventScroll: true });
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [souvenir]);

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
        {/* The slicer, on the printer's own screen: preview the mug, pick a filament colour, press Print. */}
        <div className="story__screen" ref={screenRef}>
          <div className="story__slicer" ref={slicerRef} role="group" aria-labelledby="slicer-title">
            <p className="story__screen-bar">
              <span>3D Care</span>
              <span>{t.story.slicer.kicker}</span>
            </p>
            <div className="story__screen-body">
              <MugLayers color={`#${FILAMENTS.find((f) => f.id === filament)!.color.toString(16).padStart(6, "0")}`} />
              <div>
                <h3 id="slicer-title">{t.story.slicer.model}</h3>
                <p className="story__slicer-details">{t.story.slicer.details}</p>
                <fieldset className="story__swatches">
                  <legend>{t.story.slicer.color}</legend>
                  {FILAMENTS.map((f) => (
                    <label key={f.id} className="story__swatch" style={{ "--swatch": `#${f.color.toString(16).padStart(6, "0")}` } as CSSProperties}>
                      <input type="radio" name="filament" value={f.id} checked={filament === f.id} onChange={() => setFilament(f.id)} />
                      <span className="visually-hidden">{t.story.slicer.colors[f.id]}</span>
                    </label>
                  ))}
                </fieldset>
                <button type="button" className="story__slicer-print" onClick={startPrint}>
                  <span aria-hidden="true">▶</span> {t.story.slicer.print}
                </button>
              </div>
            </div>
          </div>
        </div>
        <button type="button" className="story__souvenir-cta" ref={souvenirButtonRef} onClick={openSouvenir}>
          {t.story.souvenir.cta}
        </button>
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
      {/* Outside the sticky stage, so the dialog sits above the story text and the navigation. */}
      {souvenir && (
        <div className="story__souvenir" role="dialog" aria-modal="true" aria-labelledby="souvenir-title">
          <div className="story__souvenir-box">
            <h3 id="souvenir-title" ref={souvenirTitleRef} tabIndex={-1}>
              {t.story.souvenir.heading}
            </h3>
            {/* eslint-disable-next-line @next/next/no-img-element -- a card made in the browser, shown from a blob URL */}
            <img src={souvenir.url} width={1080} height={1350} alt={t.story.souvenir.alt} />
            <p className="story__souvenir-actions">
              <a className="btn btn--primary" href={souvenir.url} download={t.story.souvenir.fileName}>
                {t.story.souvenir.download}
              </a>
              {typeof navigator !== "undefined" &&
                navigator.canShare?.({ files: [new File([souvenir.blob], t.story.souvenir.fileName, { type: "image/png" })] }) && (
                  <button type="button" className="btn btn--secondary" onClick={shareSouvenir}>
                    {t.story.souvenir.share}
                  </button>
                )}
              <button type="button" className="btn btn--secondary" onClick={closeSouvenir}>
                {t.story.souvenir.close}
              </button>
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
