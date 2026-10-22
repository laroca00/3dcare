"use client";

import Link from "next/link";
import Image from "next/image";
import { type CSSProperties, type RefObject, useEffect, useRef, useState } from "react";
import type { Dictionary, Locale } from "@/i18n/config";
import { PART_IDS, type PartId } from "@/scene/parts";
import { MUG_SHAPES, SHAPES, mugWidth, type MugShapeId } from "@/scene/mugShapes";
import { initialQuality } from "@/scene/quality";
import type { SceneHandle } from "@/scene/runScene";
import { progressFor, splitProgress } from "@/scene/scrollProgress";
import { quadTransform } from "@/scene/quadTransform";
import { LAYERS, heroLooks, revealMotion, slicerPanel } from "@/scene/storyMotion";
import { packageMotion } from "@/scene/packageMotion";
import { packageCards } from "@/content/package";
import { SCENES, SCENE_SVH, at, localProgress, smoothstep } from "@/scene/timeline";
import { readTheme, useTheme } from "@/theme/useTheme";
import emblemEn from "@/assets/eu/co-funded-en-neg.png";
import emblemTr from "@/assets/eu/co-funded-tr-neg.png";
import { RevealText } from "./RevealText";
import { WORDMARK, drawPlan, drawScale } from "./mugPlan";
import { makeSouvenirCard } from "./souvenirCard";
import { smoothWheel } from "./smoothWheel";
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

/** Line icons for the closing numbers, in the opening drawing's style (24 × 24). */
const DELIVER_ICONS = [
  // Ten models: a mug.
  "M5 8h10v9a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3zM15 10h2a2 2 0 0 1 0 4h-2",
  // One training package: a laptop.
  "M4 6h16v10H4zM2 19h20",
  // Trainers and professionals: two people.
  "M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM3 20a5 5 0 0 1 10 0M16 11a3 3 0 1 0 0-6M15 15a5 5 0 0 1 6 5",
  // New learning centres: a house with a printer inside.
  "M3 11l9-7 9 7v9H3zM9 20v-5h6v5",
];

/** Story progress at which steps 2 and 3 of making a model begin; step 4 is the closing part. */
const STEP_STARTS = [at("meet", 0), at("use", 0.09)];
/** Closing-part progress at which step 4 begins. */
const OUTRO_STEP = 0.04;

/** Which of the four steps of making a model the story is showing. */
function stepAt(story: number, outro: number) {
  if (outro > OUTRO_STEP) return 4;
  if (story < STEP_STARTS[0]) return 1;
  if (story < STEP_STARTS[1]) return 2;
  return 3;
}

/** Leaves along three twigs for the material's room: x, y, angle, size (in a 100 × 100 box). */
const LEAVES: [number, number, number, number][] = [
  [8, 12, 30, 3], [16, 20, -20, 3.4], [24, 18, 50, 2.8], [33, 28, -35, 3.6], [41, 26, 40, 3], [50, 36, -15, 3.4],
  [57, 42, 55, 3], [65, 52, -30, 3.6], [72, 60, 35, 3.2], [80, 70, -40, 3.4], [88, 78, 25, 3], [36, 12, -60, 2.8],
  [47, 9, 20, 3], [58, 6, -40, 3.2], [68, 4, 10, 2.8], [44, 40, 70, 3], [38, 50, -50, 3.4], [32, 60, 30, 3],
  [62, 22, -25, 3.2], [74, 30, 45, 2.8], [84, 40, -30, 3.2], [92, 52, 20, 3],
];

/** How long the rest of the story takes to play when the visitor presses "Print", in milliseconds. */
const PRINT_MS = 14000;
/** The slicer is laid out at this size, then fitted onto the printer's screen. */
const SCREEN_W = 760;
const SCREEN_H = 420;

/** The mug as the slicer draws it: one line per layer, with its handles (10 px per cm). */
function MugLayers({ color, shape }: { color: string; shape: MugShapeId }) {
  const { blocks, sides } = SHAPES[shape];
  const lines = [];
  const step = 150 / LAYERS;
  for (let layer = 0; layer < LAYERS; layer++) {
    const y = 176 - layer * step;
    lines.push(<line key={`w${layer}`} x1={70} x2={150} y1={y} y2={y} />);
  }
  blocks.forEach((b, i) => {
    // One line per layer: the first slice of it.
    if (b.slice?.from) return;
    const y = 176 - b.layer * step;
    for (const side of sides) {
      const [x1, x2] = [b.x - b.width / 2, b.x + b.width / 2].map((x) => Math.round((110 + side * Math.max(x, 4) * 10) * 100) / 100);
      lines.push(<line key={`h${i}${side}`} x1={x1} x2={x2} y1={y} y2={y} />);
    }
  });
  return (
    <svg className="story__screen-mug" viewBox="0 0 220 200" aria-hidden="true" stroke={color} strokeWidth={Math.min(2.4, step * 0.55)} strokeLinecap="round">
      {lines}
    </svg>
  );
}

/** The package's pictures, each with a title and a short line. */
function PackageStrip({ lang, stripRef }: { lang: Locale; stripRef?: RefObject<HTMLOListElement | null> }) {
  return (
    <ol className="story__package-strip" ref={stripRef}>
      {packageCards.map((card) => (
        <li key={card.image.src} style={{ "--ratio": card.image.width / card.image.height } as CSSProperties}>
          <figure>
            <Image src={card.image} alt={card.alt[lang]} sizes="(min-width: 900px) 50vw, 90vw" />
            <figcaption>
              <strong>{card.title[lang]}</strong>
              <span>{card.note[lang]}</span>
            </figcaption>
          </figure>
        </li>
      ))}
    </ol>
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
  const revealCaptionRef = useRef<HTMLDivElement>(null);
  const selectionRef = useRef<HTMLDivElement>(null);
  const planRef = useRef<SVGSVGElement>(null);
  const scaleRef = useRef<HTMLDivElement>(null);
  const packageStripRef = useRef<HTMLOListElement>(null);
  // The package's pictures load once the story gets near them.
  const [packageNear, setPackageNear] = useState(false);
  const [filament, setFilament] = useState<FilamentId>("teal");
  const [shape, setShape] = useState<MugShapeId>("double");
  const shapeRef = useRef<MugShapeId>("double");
  const [step, setStep] = useState(1);
  // Share of the section's scroll that the story takes; the closing part has the rest.
  const storyShareRef = useRef(1);
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
    const revealCaption = revealCaptionRef.current!;
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
    // ?outro=0.5 freezes the closing part (used to render still frames).
    const fixedOutro = params.has("outro") ? Number(params.get("outro")) : null;
    const outroBeat = section.querySelector<HTMLElement>("[data-outro]")!;
    let progress = fixed ?? 0;
    let outro = fixedOutro ?? 0;
    let handle: SceneHandle | null = null;
    let visible = true;
    let cancelled = false;
    // Part labels can be reached by keyboard only while the printer is apart.
    labelLayer.inert = true;
    slicer.inert = true;

    function measure() {
      if (fixed === null) {
        const rect = section.getBoundingClientRect();
        const scrollable = rect.height - window.innerHeight;
        storyShareRef.current = scrollable > 0 ? (scrollable - outroBeat.offsetHeight) / scrollable : 1;
        const overall = progressFor(rect.top, rect.height, window.innerHeight);
        const split = splitProgress(overall, storyShareRef.current);
        progress = split.story;
        outro = split.outro;
        // The thin bar on the right fills with the whole section; the scroll hint goes once the visitor starts.
        section.style.setProperty("--progress", String(overall));
        section.style.setProperty("--scroll-hint", String(1 - smoothstep(overall / 0.015)));
      }
      outroBeat.style.setProperty("--reveal", String(outro * 2.2));
      // At the very end the stage fades into the page.
      section.style.setProperty("--fade", String(smoothstep((outro - 0.8) / 0.2)));
      setStep(stepAt(progress, outro));
      beats.forEach((beat, i) => beat.style.setProperty("--reveal", String(localProgress(progress, SCENES[i].id) * 2)));
      // The caption shows while the printer is apart, and goes before the next text scrolls in.
      const apart = localProgress(progress, "explode");
      const caption = Math.min(smoothstep(apart / 0.12), 1 - smoothstep((apart - 0.88) / 0.12));
      section.style.setProperty("--caption", String(caption));
      // When the mug takes over, its text is a caption under it, with the giant line.
      const hero = revealMotion(localProgress(progress, "reveal")).type;
      revealCaption.style.setProperty("--caption", String(hero));
      // While the mug stands in front of the line, it invites a touch.
      if (live && hero > 0.6) section.dataset.hero = "1";
      else delete section.dataset.hero;
      // The thermal camera's colour scale, and the leaf shadows in the material's room.
      const looks = heroLooks(progress);
      section.style.setProperty("--thermal", String(looks.thermal));
      section.style.setProperty("--leaves", String(looks.material));
      // The open model package: what it holds is listed while it is shut, then
      // its pictures come out and slide past.
      const pk = packageMotion(localProgress(progress, "package"));
      section.style.setProperty("--pk-contents", String(pk.contents));
      section.style.setProperty("--pk-cards", String(pk.cards));
      if (progress > at("material", 0)) setPackageNear(true);
      const strip = packageStripRef.current;
      if (strip) {
        const travel = Math.max(strip.scrollWidth - window.innerWidth, 0);
        strip.style.transform = `translateX(${-pk.slide * travel}px)`;
      }
      if (live && pk.cards > 0.5) section.dataset.package = "1";
      else delete section.dataset.package;
      // The slicer panel opens before printing; it can be used only while it shows.
      const panel = slicerPanel(progress);
      section.style.setProperty("--slicer", String(panel));
      // At the end of the story the souvenir card can be made.
      if (live && localProgress(progress, "use") > 0.75 && outro < 0.08) section.dataset.end = "1";
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
    // The mouse wheel glides through the live story.
    const stopWheel = live && fixed === null ? smoothWheel() : () => {};
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
        getOutro: () => outro,
        labels: t.story.labels,
        giantType: t.story.scenes[4].title,
        packageLabel: t.story.packageLabel,
        handUrl: `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/3d/first-person-hands.glb`,
        isVisible: () => visible,
        frozen: fixed !== null,
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
        onTouchMug(touching) {
          if (touching) section.dataset.glow = "1";
          else delete section.dataset.glow;
        },
        onSelection(box, [width, depth, height]) {
          // At the start the drawing is "selected", as in a design program, with its size.
          const selection = selectionRef.current;
          if (!selection) return;
          selection.style.visibility = box ? "visible" : "hidden";
          if (!box) return;
          selection.style.transform = `translate(${box.x}px, ${box.y}px)`;
          selection.style.width = `${box.width}px`;
          selection.style.height = `${box.height}px`;
          selection.style.opacity = String(box.opacity);
          selection.dataset.size = `${width} × ${depth} × ${height} cm`;
        },
        onMug(frame) {
          // The mug's plan and the close-up's scale, drawn over the mug.
          if (planRef.current) drawPlan(planRef.current, frame, shapeRef.current);
          if (scaleRef.current) drawScale(scaleRef.current, frame);
        },
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
      started.setShape(shapeRef.current);
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
      stopWheel();
      io.disconnect();
      themeObserver.disconnect();
      handle?.dispose();
      sceneRef.current = null;
    };
  }, [t.story.labels, t.story.scenes, t.story.packageLabel]);

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

  // The chosen handles go to the slicer preview, the mug and its plan.
  useEffect(() => {
    shapeRef.current = shape;
    sceneRef.current?.setShape(shape);
  }, [shape]);

  /**
   * "Print": the page scrolls on by itself to the end of the story, as if the
   * printer had started. Any scroll, touch, click or key press takes over.
   */
  function startPrint() {
    const section = sectionRef.current!;
    const from = window.scrollY;
    // The end of the story, just before the closing part.
    const to = section.getBoundingClientRect().top + window.scrollY + storyShareRef.current * (section.offsetHeight - window.innerHeight);
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

  /** Scrolls to where one of the four steps begins. */
  function goToStep(index: number) {
    const section = sectionRef.current!;
    const share = storyShareRef.current;
    const at = index === 0 ? 0 : index < 3 ? STEP_STARTS[index - 1] * share : share + OUTRO_STEP * 1.5 * (1 - share);
    const top = section.getBoundingClientRect().top + window.scrollY + at * (section.offsetHeight - window.innerHeight);
    window.scrollTo({ top: Math.ceil(top) + 2, behavior: "smooth" });
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
        details: t.story.souvenir.details.replace("{shape}", t.story.slicer.models[shape]).replace("{colour}", colour),
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
        {/* At the start the printer's drawing is selected, as in a design program. */}
        <div className="story__selection" ref={selectionRef} aria-hidden="true" data-file={t.story.selectionFile}>
          {["nw", "n", "ne", "e", "se", "s", "sw", "w"].map((handle) => (
            <span key={handle} className={`story__handle story__handle--${handle}`} />
          ))}
        </div>
        {/* The mug's plan: outline, dimensions, and construction circles that gather into the wordmark. */}
        <svg className="story__plan" ref={planRef} aria-hidden="true">
          <path className="story__plan-axis" />
          <path className="story__plan-dims" />
          <path className="story__plan-outline" />
          <text data-dim="diameter">{t.story.plan.diameter}</text>
          <text data-dim="width">{`${new Intl.NumberFormat(lang).format(mugWidth(shape))} cm`}</text>
          <text data-dim="height">{t.story.plan.height}</text>
          <g className="story__plan-circles">
            {WORDMARK.map((_, i) => (
              <circle key={i} />
            ))}
          </g>
        </svg>
        {/* Up close, a mark the height of one real layer. */}
        <div className="story__scale" ref={scaleRef} aria-hidden="true">
          <span>{t.story.layerScale}</span>
        </div>
        {/* The thermal camera's colour scale. */}
        <p className="story__thermal" aria-hidden="true">
          <span>{t.story.thermal.hot}</span>
          <span>{t.story.thermal.cold}</span>
        </p>
        {/* The open model package: what it holds, then its pictures as a strip that slides past. */}
        <ul className="story__package-contents" aria-hidden="true">
          {t.story.packageContents.map((item, i) => (
            <li key={item} style={{ "--i": i } as CSSProperties}>
              {item}
            </li>
          ))}
        </ul>
        {mode === "live" && packageNear && (
          <div className="story__package-cards" aria-hidden="true">
            <p className="story__package-title">{t.story.packageCardsTitle}</p>
            <PackageStrip lang={lang} stripRef={packageStripRef} />
          </div>
        )}
        {/* Leaf shadows drift across the material's room. */}
        <div className="story__leaves" aria-hidden="true">
          <svg viewBox="0 0 100 100" preserveAspectRatio="none">
            {LEAVES.map(([x, y, angle, size], i) => (
              <ellipse key={i} cx={x} cy={y} rx={size} ry={size * 0.42} transform={`rotate(${angle} ${x} ${y})`} />
            ))}
            <path d="M0 6 C 30 20, 55 40, 95 85 M30 22 C 45 12, 58 8, 72 2 M50 36 C 42 46, 36 56, 28 66 M58 22 C 70 28, 82 36, 96 54" />
          </svg>
        </div>
        <div className="story__fade" aria-hidden="true" />
        {/* The story is also how a model is made: its four steps, the current one underlined. */}
        <nav className="story__chapters" aria-label={t.story.chapters}>
          <ol>
            {t.process.map((item, i) => (
              <li key={item.title}>
                <button
                  type="button"
                  className={i < step ? "is-done" : undefined}
                  aria-current={step === i + 1 ? "step" : undefined}
                  onClick={() => goToStep(i)}
                >
                  <span className="story__chapter-number">0{i + 1}</span>
                  <span className="story__chapter-name">{item.title}</span>
                </button>
              </li>
            ))}
          </ol>
        </nav>
        <div className="story__progress" aria-hidden="true" />
        <p className="story__scroll-hint" aria-hidden="true">
          <span>{t.story.scrollHint}</span>
        </p>
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
        <p className="story__hint story__hint--glow" aria-hidden="true">
          <span className="story__hint-pointer">{t.story.glowHint.pointer}</span>
          <span className="story__hint-touch">{t.story.glowHint.touch}</span>
        </p>
        {/* While the printer is apart in the middle of the stage, its text is a caption at the bottom. */}
        <div className="story__caption" aria-hidden="true">
          <p className="story__caption-title">{rest[1].title}</p>
          <p>{rest[1].text}</p>
          <p className="story__caption-hint">{t.story.dragHint.printer}</p>
        </div>
        <div className="story__caption story__caption--reveal" ref={revealCaptionRef} aria-hidden="true">
          <p>{rest[3].text}</p>
        </div>
        {/* The slicer, on the printer's own screen: preview the mug, pick a filament colour, press Print. */}
        <div className="story__screen" ref={screenRef}>
          <div className="story__slicer" ref={slicerRef} role="group" aria-labelledby="slicer-title">
            <p className="story__screen-bar">
              <span>3D Care</span>
              <span>{t.story.slicer.kicker}</span>
            </p>
            <div className="story__screen-body">
              <div>
                <MugLayers color={`#${FILAMENTS.find((f) => f.id === filament)!.color.toString(16).padStart(6, "0")}`} shape={shape} />
                <p className="story__slicer-note">{t.story.slicer.adapted}</p>
              </div>
              <div>
                <h3 id="slicer-title">{t.story.slicer.models[shape]}</h3>
                <p className="story__slicer-details">{t.story.slicer.details}</p>
                {/* The same mug for different hands: two loops, one loop, or a T-grip for a closed fist. */}
                <fieldset className="story__shapes">
                  <legend>{t.story.slicer.shape}</legend>
                  {MUG_SHAPES.map((id) => (
                    <label key={id} className="story__shape">
                      <input type="radio" name="mug-shape" value={id} checked={shape === id} onChange={() => setShape(id)} />
                      <span>{t.story.slicer.shapes[id]}</span>
                    </label>
                  ))}
                </fieldset>
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
        <div className="story__beat story__beat--intro" data-beat style={{ minHeight: `${SCENE_SVH[0][1]}svh` }}>
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
          // The taken-apart scene and the mug's entrance show their text on the stage instead.
          <div
            className={`story__beat${i === 1 || i === 3 ? " story__beat--caption" : ""}${SCENES[i + 1].id === "package" ? " story__beat--package" : ""}`}
            data-beat
            key={scene.title}
            // Each text is as tall as its scene's share of the scroll, so they arrive together.
            style={{ minHeight: `${SCENE_SVH[i + 1][1]}svh` }}
          >
            {/* Each line rises from behind its own mask as the story reaches it. */}
            <div className="story__text">
              <RevealText as="h2" text={scene.title} />
              <RevealText as="p" text={scene.text} first={2} />
            </div>
            {stillFrame(i + 1)}
            {/* The package's pictures: a sideways row for still frames, and for screen readers. */}
            {SCENES[i + 1].id === "package" && (
              <div className={mode === "live" ? "visually-hidden" : "story__package-row"}>
                <p className="story__package-title">{t.story.packageCardsTitle}</p>
                <PackageStrip lang={lang} />
              </div>
            )}
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
        {/* The close: what the project will deliver, while the ten tools are drawn in on the table. */}
        <div className="story__beat story__beat--outro" data-outro>
          <h2>{t.deliversTitle}</h2>
          <dl className="delivers story__delivers">
            {t.delivers.map((item, i) => (
              <div key={item.text} style={{ "--i": i } as CSSProperties}>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d={DELIVER_ICONS[i]} />
                </svg>
                <dt>{item.value}</dt>
                <dd>{item.text}</dd>
              </div>
            ))}
          </dl>
          <p className="story__publish">
            <strong>4/4 · {t.process[3].title}.</strong> {t.process[3].text}
          </p>
        </div>
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
