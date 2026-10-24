import * as THREE from "three";
import type { Theme } from "../theme/theme";
import { type DeskItem, createDesk } from "./desk";
import { createDrawing } from "./drawing";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { TAARenderPass } from "three/addons/postprocessing/TAARenderPass.js";
import { LineMaterial } from "three/addons/lines/LineMaterial.js";
import { BokehPass } from "three/addons/postprocessing/BokehPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import type { Pass } from "three/addons/postprocessing/Pass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { centerAmount, explodeAmount, setExplode, spinTurn } from "./explode";
import type { MugShapeId } from "./mugShapes";
import type { PartId } from "./parts";
import { TYPE_LAYER, createGiantType } from "./giantType";
import { createMugGlow } from "./mugGlow";
import { BOX, createPackageBox } from "./box";
import { packageMotion } from "./packageMotion";
import { type Hand, loadHand } from "./hand";
import { createPrintJob } from "./printJob";
import { BED_SURFACE_Y, NOZZLE_HOME, SCREEN_SIZE, buildPrinter, type PrinterPart } from "./printer";
import type { Point } from "./quadTransform";
import { QualityController, type QualityLevel } from "./quality";
import { STEAM_LAYER, createSteam } from "./steam";
import { LAYERS, LAYER_HEIGHT, MUG_RADIUS, endingMotion, heroLooks, labelOpacity, nozzlePath, printProgress, revealMotion, screenZoom, slicerProgress } from "./storyMotion";
import { createLineup } from "./lineup";
import { FLOOR_LAYER, createStudio } from "./studio";
import { clamp01, localProgress, smoothstep } from "./timeline";

export interface LabelPosition {
  id: PartId;
  /** Pixels from the canvas's top left. */
  x: number;
  y: number;
  opacity: number;
}

export interface SceneOptions {
  theme: Theme;
  quality: QualityLevel;
  getProgress: () => number;
  /** 0..1 progress of the closing part after the story (0 while the story runs). */
  getOutro?: () => number;
  labels: Record<PartId, string>;
  /** The line that glows behind the freshly printed mug. */
  giantType: string;
  /** The label printed on the open model package's box. */
  packageLabel?: string;
  /** Called after each frame with where the part labels belong on screen. */
  onLabels?: (labels: LabelPosition[]) => void;
  /** Whether the stage is on screen; the steam only keeps animating while it is. */
  isVisible?: () => boolean;
  /** A frozen frame (for still images): nothing moves on its own. */
  frozen?: boolean;
  /** Called when what the visitor can drag to turn changes: the printer while apart, the mug at the end. */
  onGrabbable?: (target: GrabTarget | null) => void;
  /** Called when the pointer moves onto or off a part of the taken-apart printer. */
  onHoverPart?: (id: PartId | null) => void;
  /** Called when the visitor clicks or taps a part of the taken-apart printer (null: empty space). */
  onSelectPart?: (id: PartId | null) => void;
  /**
   * Called after each frame with the printer screen's corners on the canvas
   * (top left, top right, bottom left, bottom right), while the camera is up close to it.
   */
  onScreen?: (corners: [Point, Point, Point, Point] | null) => void;
  /**
   * Called after each frame with where the printer's drawing is on the canvas,
   * for the selection box drawn round it at the start (null once it has gone),
   * and its size in cm (width, depth, height).
   */
  onSelection?: (box: { x: number; y: number; width: number; height: number; opacity: number; growing: boolean } | null, size: [number, number, number]) => void;
  /** Called when the pointer moves onto or off the freshly printed mug (or a finger presses it), while it stands in front of the giant line. */
  onTouchMug?: (touching: boolean) => void;
  /** Called after each frame with where the mug is on the canvas, while its plan or its layers are shown (null otherwise). */
  onMug?: (frame: MugFrame | null) => void;
  /** Called as the scene is set up, with how far along it is (0..1). */
  onProgress?: (done: number) => void;
  /** Where the hand that reaches for the mug is loaded from. */
  handUrl?: string;
}

/**
 * The mug's side as seen from the camera, for drawings laid over it: canvas
 * pixels of the base's centre, and pixels per cm to the right and upwards.
 * In the close-up, `scale` spans one real layer on the wall.
 */
export interface MugFrame {
  origin: Point;
  right: Point;
  up: Point;
  plan: number;
  gather: number;
  scale: { x: number; top: number; bottom: number; opacity: number } | null;
}

export type GrabTarget = "printer" | "mug";

export interface SceneHandle {
  setTheme(theme: Theme): void;
  /** Draws a frame now and returns a square picture of the mug, for the souvenir card. */
  snapshot(): HTMLCanvasElement;
  /** The part whose information card is open; the camera focuses on it. */
  setSelected(id: PartId | null): void;
  /** Filament colour chosen in the slicer: the spool, the preview and the printed mug. */
  setFilament(color: number): void;
  /** Handles chosen in the slicer: the preview and the printed mug. */
  setShape(id: MugShapeId): void;
  /** Starts the opening (the drawing growing in); call once the canvas is on screen. */
  startIntro(): void;
  /** Requests one frame. The scene draws only when asked or while a transition runs. */
  invalidate(): void;
  dispose(): void;
}

/** Lets the browser handle input and paint between the heavier set-up steps. */
const yieldToMain = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

/** How much of the drawing shows at the very top of the page. */
const DRAWING_START = 0.4;

/** Lens finish per theme: darkened corners and a fine film grain. */
const LENS: Record<Theme, { vignette: number; grain: number }> = {
  dark: { vignette: 0.38, grain: 0.035 },
  light: { vignette: 0.06, grain: 0.02 },
};

const LensShader = {
  name: "LensShader",
  uniforms: { tDiffuse: { value: null }, vignette: { value: 0.3 }, grain: { value: 0.03 }, time: { value: 0 }, tilt: { value: 0 } },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float vignette;
    uniform float grain;
    uniform float time;
    uniform float tilt;
    varying vec2 vUv;
    float random(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    void main() {
      vec4 color = texture2D(tDiffuse, vUv);
      // Tilt-shift: away from the middle band the picture softens, like a lens with a shallow focus.
      float soft = tilt * smoothstep(0.26, 0.56, length((vUv - 0.5) * vec2(0.85, 1.2)));
      if (soft > 0.01) {
        vec2 r = vec2(soft * 0.005, soft * 0.009);
        vec4 sum = color;
        for (int i = 0; i < 8; i++) {
          float a = float(i) * 0.785398;
          sum += texture2D(tDiffuse, vUv + vec2(cos(a), sin(a)) * r);
          sum += texture2D(tDiffuse, vUv + vec2(cos(a + 0.39), sin(a + 0.39)) * r * 0.5);
        }
        color = sum / 17.0;
      }
      float edge = smoothstep(0.25, 0.85, length((vUv - 0.5) * vec2(1.0, 0.8)));
      // A touch of colour fringing towards the corners, as a real lens has.
      // (Not while the picture is softened: the fringe would show on the blurred edges.)
      if (soft <= 0.01) {
        vec2 shift = (vUv - 0.5) * edge * 0.0035;
        color.r = texture2D(tDiffuse, vUv + shift).r;
        color.b = texture2D(tDiffuse, vUv - shift).b;
      }
      color.rgb *= 1.0 - vignette * edge;
      color.rgb += (random(vUv * 1000.0 + time) - 0.5) * grain;
      gl_FragColor = color;
    }`,
};

/** Replaces invalid (NaN or infinite) pixels with black and caps extreme highlights before the glow. */
const FiniteShader = {
  name: "FiniteShader",
  uniforms: { tDiffuse: { value: null } },
  vertexShader: LensShader.vertexShader,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    varying vec2 vUv;
    void main() {
      vec4 color = texture2D(tDiffuse, vUv);
      bool invalid = any(isnan(color)) || any(isinf(color));
      // A grazing reflection can be thousands of times too bright; capped, it cannot flood the glow.
      gl_FragColor = invalid ? vec4(0.0, 0.0, 0.0, 1.0) : vec4(min(color.rgb, vec3(4.0)), color.a);
    }`,
};

/** Last scene: where the camera ends up relative to the mug, and where it looks. */
const CLOSE_UP_WIDE = new THREE.Vector3(48, 26, 40);
const CLOSE_UP_NARROW = new THREE.Vector3(60, 34, 66);
const FOCUS_WIDE = new THREE.Vector3(-6, 7, 8);
const FOCUS_NARROW = new THREE.Vector3(0, -3, 0);
/** When the mug takes over: how far it rises off the bed and comes towards the camera, in cm. */
const REVEAL_RISE = 16;
const REVEAL_FORWARD = 22;
/** How far the printer slides back into the dark behind it, and aside, out of the giant line's way. */
const REVEAL_SLIDE = 80;
const REVEAL_ASIDE = 105;
/** How far the camera is from the mug then; narrow screens need more room for the handles. */
const REVEAL_DISTANCE_WIDE = 54;
const REVEAL_DISTANCE_NARROW = 82;
/** How far the mug moves aside, beside the text, while it is looked at on wide screens (cm). */
const HERO_ASIDE = 8;
/** In the close-up the camera is this far from the wall (cm), looking at this height on it. */
const MACRO_DISTANCE = 6.5;
const MACRO_HEIGHT = 7.2;
/** In the close-up the camera stands a little above and to the side, so the rim and the mug's edge stay in the picture. */
const MACRO_RISE = 1.6;
const MACRO_SIDE = -2.4;
/** Real layer height (cm), for the close-up's scale. */
const REAL_LAYER = 0.03;
/** At the very top the camera looks down on the desk from here (relative to where it aims). */
const DESK_WIDE = new THREE.Vector3(0, 240, 44);
const DESK_NARROW = new THREE.Vector3(0, 330, 46);
/** The mat lies a little turned, as if put down by hand. */
const DESK_TURN = 0.13;
/** How far the mug lowers into the open model package (cm). */
const PACKAGE_DROP = 14;
/** How far behind the mug the giant line glows. */
const TYPE_BEHIND = 40;
/** The close: where the camera ends up above the ten tools. */
const OUTRO_WIDE = new THREE.Vector3(14, 80, 130);
const OUTRO_NARROW = new THREE.Vector3(0, 120, 190);

export async function startScene(canvas: HTMLCanvasElement, opts: SceneOptions): Promise<SceneHandle> {
  const quality = new QualityController(opts.quality);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: opts.quality === 2, powerPreference: "high-performance" });
  // Neutral tone mapping leaves the site colours (background, teal) as they are.
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.shadowMap.enabled = opts.quality > 0;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  // The mug's logo is clipped to the layers printed so far.
  renderer.localClippingEnabled = true;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 1, 1000);

  const printer = buildPrinter(opts.quality);
  // The printer's own size (before the drawing and the print are added to it),
  // for the selection box round its drawing at the start.
  printer.root.updateMatrixWorld(true);
  const printerBox = new THREE.Box3().setFromObject(printer.root).applyMatrix4(printer.root.matrixWorld.clone().invert());
  const printerSize = printerBox.getSize(new THREE.Vector3());
  const sizeCm: [number, number, number] = [Math.round(printerSize.x), Math.round(printerSize.z), Math.round(printerSize.y)];
  opts.onProgress?.(0.3);
  await yieldToMain();
  const stage = new THREE.Group();
  stage.add(printer.root);
  const PRINTER_Y = -32;
  printer.root.position.y = PRINTER_Y;
  scene.add(stage);
  const studio = createStudio(renderer, scene, opts.theme, opts.quality, stage, printer.root.position.y);
  opts.onProgress?.(0.45);
  await yieldToMain();
  const drawing = createDrawing(printer, opts.theme);
  opts.onProgress?.(0.55);
  await yieldToMain();
  const job = createPrintJob(printer.bedSurface, opts.quality);
  // Everything in the printer beside the branch from its root to the mug.
  const mugBranch = new Set<THREE.Object3D>();
  for (let o: THREE.Object3D | null = job.object; o && o !== printer.root.parent; o = o.parent) mugBranch.add(o);
  const besideMug = [...mugBranch].filter((o) => o !== job.object).flatMap((o) => o.children.filter((c) => !mugBranch.has(c)));
  const hiddenForPackage: THREE.Object3D[] = [];
  // Loads alongside the rest of the set-up.
  const handLoading = opts.handUrl ? loadHand(opts.handUrl).catch(() => null) : Promise.resolve(null);
  let hand: Hand | null = null;
  const steam = createSteam(opts.theme);
  // The closing: the project's other nine tools, sketched beside the mug.
  const lineup = createLineup(opts.theme);
  stage.add(lineup.object);
  // The opening desk under the drawing: a cutting mat, a pencil and a ruler.
  const desk = createDesk(PRINTER_Y, () => handle?.invalidate());
  stage.add(desk.object);
  const giantType = await createGiantType(opts.giantType, opts.theme);
  opts.onProgress?.(0.65);
  // The glow behind the mug while it is touched or held.
  const mugGlow = createMugGlow(opts.theme);
  scene.add(mugGlow.object);
  let glowAmount = 0;
  // The open model package the mug goes into at the end of "design and print".
  const box = createPackageBox(opts.packageLabel ?? "");
  scene.add(box.object);
  scene.add(giantType.object);
  camera.layers.enable(TYPE_LAYER);
  // Line drawings (the opening drawing, the tool sketches) stay out of the floor's contact shadow.
  const lineObjects: THREE.Object3D[] = [];
  stage.traverse((o) => {
    if ((o as THREE.Mesh).material instanceof LineMaterial) lineObjects.push(o);
  });
  // The desk is flat on the floor; it stays out of the contact shadow too.
  const noContactShadow = [...lineObjects, desk.object];
  scene.add(steam.object);
  camera.layers.enable(STEAM_LAYER);
  camera.layers.enable(FLOOR_LAYER);
  // The blur's depth pass looks through this camera, which leaves the steam and the floor out.
  const depthCamera = new THREE.PerspectiveCamera();


  // Lens: depth of field (the last scene, and the part in focus while the
  // printer is apart), a soft glow on the brightest highlights at full
  // quality, then vignette and grain. The lowest quality renders directly.
  const composer = new EffectComposer(
    renderer,
    new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: opts.quality === 2 ? 4 : 0 }),
  );
  const bokeh = new BokehPass(scene, depthCamera, { focus: 100, aperture: 0, maxblur: 0.012 });
  const focusUniforms = bokeh.uniforms as Record<"focus" | "aperture" | "maxblur", THREE.IUniform<number>>;
  const lens = new ShaderPass(LensShader);
  // At full quality the scene is drawn through a temporal anti-aliasing pass:
  // while anything moves it renders normally (with MSAA); once the picture
  // holds still, it blends 32 slightly shifted renders over the next frames,
  // so thin lines and edges come out clean.
  const taa = opts.quality === 2 ? new TAARenderPass(scene, camera) : null;
  if (taa) taa.sampleLevel = 1;
  composer.addPass(taa ?? new RenderPass(scene, camera));
  composer.addPass(bokeh);
  const glowPasses: Pass[] = [];
  if (opts.quality === 2) {
    // A stray invalid pixel would otherwise spread through the glow as black blocks.
    const finite = new ShaderPass(FiniteShader);
    // Only light sources glow (the hot nozzle, the screen), not bright reflections.
    const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.4, 0.32, 1.4);
    composer.addPass(finite);
    composer.addPass(bloom);
    glowPasses.push(finite, bloom);
  }
  composer.addPass(new OutputPass());
  composer.addPass(lens);
  function applyLens(theme: Theme) {
    lens.uniforms.vignette.value = LENS[theme].vignette;
    lens.uniforms.grain.value = LENS[theme].grain;
  }
  applyLens(opts.theme);

  function applyPixelRatio(level: QualityLevel) {
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, level === 2 ? 2 : level === 1 ? 1.5 : 1));
    // The glow and the floor reflection are the first to go on a slow device.
    for (const pass of glowPasses) pass.enabled = level === 2;
    studio.setReflection(level === 2);
    composer.setPixelRatio(renderer.getPixelRatio());
  }
  applyPixelRatio(quality.level);

  let wide = true;
  function resize() {
    const { clientWidth: w, clientHeight: h } = canvas;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    composer.setSize(w, h);
    drawing.setResolution(w, h);
    job.setResolution(w, h);
    lineup.setResolution(w, h);
    camera.aspect = w / h;
    // Wide screens keep the text on the left and the printer on the right.
    wide = camera.aspect > 1.1;
    stage.position.y = wide ? 4 : 16;
    camera.updateProjectionMatrix();
    handle.invalidate();
  }
  const resizeObserver = new ResizeObserver(resize);

  const mugWorld = new THREE.Vector3();
  const mugMiddle = new THREE.Vector3();
  const bedWorld = new THREE.Vector3();
  const revealDir = new THREE.Vector3();
  const hover = new THREE.Vector3();
  const revealView = new THREE.Vector3();
  const typeCenter = new THREE.Vector3();
  const slide = new THREE.Vector3();
  const aside = new THREE.Vector3();
  const stageTurn = new THREE.Quaternion();
  const mugTurn = new THREE.Quaternion();
  const mugFront = new THREE.Vector3();
  const anchor = new THREE.Vector3();

  const home = new THREE.Vector3();
  const lookAt = new THREE.Vector3();
  const closeUp = new THREE.Vector3();
  const mugFocus = new THREE.Vector3();
  const mugTop = new THREE.Vector3();
  const partFocus = new THREE.Vector3();
  const viewSpace = new THREE.Vector3();

  // Mouse position over the window, -1..1, eased towards.
  const parallax = { x: 0, y: 0, toX: 0, toY: 0 };
  function onWindowPointerMove(e: PointerEvent) {
    if (e.pointerType !== "mouse") return;
    parallax.toX = (e.clientX / window.innerWidth) * 2 - 1;
    parallax.toY = -((e.clientY / window.innerHeight) * 2 - 1);
    handle.invalidate();
  }
  window.addEventListener("pointermove", onWindowPointerMove, { passive: true });
  /** Eases the parallax; returns true while it still needs frames. */
  function updateParallax(dt: number) {
    const ease = 1 - Math.exp(-4 * dt);
    parallax.x += (parallax.toX - parallax.x) * ease;
    parallax.y += (parallax.toY - parallax.y) * ease;
    return Math.abs(parallax.toX - parallax.x) > 0.002 || Math.abs(parallax.toY - parallax.y) > 0.002;
  }

  // When the visitor stops scrolling, the scene keeps breathing for a few
  // seconds: the camera floats a little, the fan turns, a cursor blinks on the
  // printer's screen. Then it settles and stops drawing frames.
  const breath = { amount: 0, lastProgress: -1, lastActivity: 0, fan: 0, clock: 0 };
  const BREATH_FOR_MS = 9000;
  /** Advances the breathing; returns true while it needs frames. */
  function updateBreath(now: number, dt: number, progress: number) {
    if (Math.abs(progress - breath.lastProgress) > 1e-5 || drag.spin) breath.lastActivity = now;
    breath.lastProgress = progress;
    const idle = now - breath.lastActivity;
    const target = !opts.frozen && idle > 500 && idle < BREATH_FOR_MS && (opts.isVisible?.() ?? true) ? 1 : 0;
    breath.amount += (target - breath.amount) * (1 - Math.exp(-1.6 * dt));
    if (target === 0 && breath.amount < 0.002) breath.amount = 0;
    breath.clock += dt * breath.amount;
    breath.fan += dt * breath.amount * 2.5;
    return breath.amount > 0 || target > 0;
  }

  // Depth of field on the hovered or selected part while the printer is apart.
  let selected: PrinterPart | null = null;
  let focusAmount = 0;

  const screenCenter = new THREE.Vector3();
  const screenNormal = new THREE.Vector3();
  const screenView = new THREE.Vector3();

  /** Where the camera sees the printer's screen filling most of the view. */
  function screenCloseUp() {
    printer.screen.getWorldPosition(screenCenter);
    printer.screen.getWorldDirection(screenNormal);
    const tanV = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const tanH = tanV * camera.aspect;
    const distance = Math.max(SCREEN_SIZE.width / 2 / (tanH * (wide ? 0.55 : 0.92)), SCREEN_SIZE.height / 2 / (tanV * 0.6));
    return screenView.copy(screenCenter).addScaledVector(screenNormal, distance);
  }

  const orbitOffset = new THREE.Vector3();
  const UP = new THREE.Vector3(0, 1, 0);

  const outroLook = new THREE.Vector3();
  const outroView = new THREE.Vector3();

  const deskEye = new THREE.Vector3();
  const deskTarget = new THREE.Vector3();
  const boxCenter = new THREE.Vector3();
  const boxView = new THREE.Vector3();
  const boxAside = new THREE.Vector3();
  const sideways = new THREE.Vector3();
  const wallPoint = new THREE.Vector3();
  const macroView = new THREE.Vector3();

  function placeCamera(use: number, apart: number, center: number, mug: THREE.Vector3, zoom: number, printed: number, outro: number, reveal: number, above: number, looks: ReturnType<typeof heroLooks>, pk: ReturnType<typeof packageMotion>) {
    // The camera moves in while the printer is apart, so the parts fill the
    // stage. In the last scene it follows the mug to the table and frames it
    // close up, beside the text on wide screens.
    const push = smoothstep(use);
    const near = smoothstep(apart);
    camera.position.set(85 - near * 10, 46 - near * 6, (wide ? 140 : 190) + near * (wide ? 40 : 85));
    home.set(wide ? 20 * (1 - center) + near * 4 : near * 3, 2 - near * (wide ? 13 : 18), 0);
    // At the very top the camera looks down on the desk, then comes down as the drawing becomes the printer.
    // At the very top the camera looks almost straight down on the desk,
    // with the printer's drawing in the middle of the picture.
    if (above > 0) camera.position.lerp(deskEye.copy(deskTarget).add(wide ? DESK_WIDE : DESK_NARROW), smoothstep(above));
    // While printing, the camera swings slowly round the printer and back,
    // like a print time-lapse, coming a little closer on the way.
    const swing = Math.sin(Math.PI * printed);
    if (swing > 0) {
      orbitOffset.copy(camera.position).sub(home).applyAxisAngle(UP, swing * 0.7).multiplyScalar(1 - swing * 0.14);
      camera.position.copy(home).add(orbitOffset);
    }
    // When the mug takes over, the camera comes round in front of it and
    // centres it, leaving the printer behind in the dark.
    const hero = smoothstep(reveal);
    mugMiddle.copy(mug).y += (LAYERS * LAYER_HEIGHT) / 2;
    revealView.copy(mugMiddle).addScaledVector(revealDir, wide ? REVEAL_DISTANCE_WIDE : REVEAL_DISTANCE_NARROW).y += 3;
    camera.position.lerp(revealView, hero);
    lookAt.copy(home).lerp(mugMiddle, hero);
    // On narrow screens the text fills the top, so the desk sits lower in the view.
    if (above > 0) lookAt.lerp(deskTarget, smoothstep(above));
    if (!wide && above > 0) lookAt.z -= smoothstep(above) * 30;
    // While the mug is looked at, it stands beside the text on wide screens.
    if (wide && looks.hero > 0) {
      sideways.crossVectors(revealDir, UP).multiplyScalar(HERO_ASIDE * smoothstep(looks.hero));
      camera.position.add(sideways);
      lookAt.add(sideways);
    }
    // Up close on its wall, where the real layers show.
    if (looks.macro > 0) {
      const ease = smoothstep(looks.macro);
      wallPoint.copy(mug).addScaledVector(revealDir, MUG_RADIUS + 0.2).y += MACRO_HEIGHT;
      macroView.copy(wallPoint).addScaledVector(revealDir, MACRO_DISTANCE).addScaledVector(sideways.crossVectors(revealDir, UP), MACRO_SIDE);
      macroView.y += MACRO_RISE;
      camera.position.lerp(macroView, ease);
      lookAt.lerp(wallPoint, ease);
    }
    // The package: the camera steps back to see the box beside the text,
    // then looks down into it while the pictures come out.
    if (pk.frame > 0) {
      const ease = smoothstep(pk.frame);
      const dive = smoothstep(pk.dive);
      boxAside.crossVectors(revealDir, UP).multiplyScalar(wide ? 11 * (1 - dive) : 0);
      boxView.copy(boxCenter).addScaledVector(revealDir, wide ? 70 : 105).add(boxAside).y += wide ? 34 : 48;
      camera.position.lerp(boxView, ease);
      lookAt.lerp(boxView.copy(boxCenter).add(boxAside), ease);
      if (dive > 0) {
        boxView.copy(boxCenter).addScaledVector(revealDir, 0.6).y += 28;
        camera.position.lerp(boxView, dive);
        lookAt.lerp(boxView.copy(boxCenter).setY(boxCenter.y - BOX.height / 2), dive);
      }
    }
    closeUp.copy(mug).add(wide ? CLOSE_UP_WIDE : CLOSE_UP_NARROW);
    camera.position.lerp(closeUp, push);
    mugFocus.copy(mug).add(wide ? FOCUS_WIDE : FOCUS_NARROW);
    lookAt.lerp(mugFocus, push);
    // At the close the camera rises and pulls back over the ten tools on the table.
    if (outro > 0) {
      const ease = smoothstep(outro / 0.45);
      lineup.object.localToWorld(outroLook.set(30, 4, -8));
      // On wide screens the tools sit to the right of the numbers.
      if (wide) outroLook.x -= 26;
      outroView.copy(outroLook).add(wide ? OUTRO_WIDE : OUTRO_NARROW);
      camera.position.lerp(outroView, ease);
      lookAt.lerp(outroLook, ease);
    }
    // Before printing, the camera moves in to the printer's screen.
    if (zoom > 0) {
      const ease = smoothstep(zoom);
      camera.position.lerp(screenCloseUp(), ease);
      lookAt.lerp(screenCenter, ease);
    }
    // The camera drifts a little with the mouse, keeping its aim (less when up close),
    // and floats gently while the visitor pauses.
    const still = Math.max(zoom, smoothstep(looks.macro), smoothstep(pk.dive));
    const float = breath.amount * (1 - still);
    camera.position.x += parallax.x * 3 * (1 - still) + Math.sin(breath.clock * 0.55) * 0.9 * float;
    camera.position.y += parallax.y * 2 * (1 - still) + Math.sin(breath.clock * 0.41 + 1) * 0.6 * float;
    camera.lookAt(lookAt);
  }

  const corner = new THREE.Vector3();
  const SCREEN_CORNERS: [number, number][] = [
    [-1, 1],
    [1, 1],
    [-1, -1],
    [1, -1],
  ];
  /** Reports where the screen's corners are on the canvas, for the slicer laid over it. */
  function updateScreen(zoom: number) {
    if (!opts.onScreen) return;
    if (zoom < 0.5) return opts.onScreen(null);
    camera.updateMatrixWorld();
    const { clientWidth: w, clientHeight: h } = canvas;
    const corners = SCREEN_CORNERS.map(([sx, sy]) => {
      corner.set((sx * SCREEN_SIZE.width) / 2, (sy * SCREEN_SIZE.height) / 2, 0.01);
      printer.screen.localToWorld(corner).project(camera);
      return [((corner.x + 1) / 2) * w, ((1 - corner.y) / 2) * h] as Point;
    });
    opts.onScreen(corners as [Point, Point, Point, Point]);
  }

  const boxCorner = new THREE.Vector3();
  /** Reports the outline of the drawing's footprint on the mat, while the selection box shows. */
  function updateSelection(opacity: number, grow: number) {
    if (!opts.onSelection) return;
    if (opacity <= 0 || grow <= 0) return opts.onSelection(null, sizeCm);
    const { clientWidth: w, clientHeight: h } = canvas;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (let i = 0; i < 4; i++) {
      boxCorner.set(i & 1 ? printerBox.max.x : printerBox.min.x, printerBox.min.y, i & 2 ? printerBox.max.z : printerBox.min.z);
      printer.root.localToWorld(boxCorner).project(camera);
      const x = ((boxCorner.x + 1) / 2) * w;
      const y = ((1 - boxCorner.y) / 2) * h;
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
    // While the drawing grows, its size counts up with it.
    const size = sizeCm.map((cm) => Math.round(cm * printer.root.scale.x)) as [number, number, number];
    opts.onSelection({ x: minX, y: minY, width: maxX - minX, height: maxY - minY, opacity, growing: grow < 1 }, size);
  }

  const onScreen = (v: THREE.Vector3): Point => {
    const { clientWidth: w, clientHeight: h } = canvas;
    v.project(camera);
    return [((v.x + 1) / 2) * w, ((1 - v.y) / 2) * h];
  };
  const mugPoint = new THREE.Vector3();
  const mugAcross = new THREE.Vector3();
  /** Reports the mug's side on the canvas while its plan or its close-up shows. */
  function updateMug(looks: ReturnType<typeof heroLooks>) {
    if (!opts.onMug) return;
    if (looks.plan <= 0 && looks.macro <= 0) return opts.onMug(null);
    camera.updateMatrixWorld();
    mugAcross.crossVectors(revealDir, UP).negate();
    const origin = onScreen(mugPoint.copy(mugWorld));
    const right = onScreen(mugPoint.copy(mugWorld).add(mugAcross));
    const up = onScreen(mugPoint.copy(mugWorld).add(UP));
    let scale: MugFrame["scale"] = null;
    if (looks.macro > 0) {
      // One real layer on the wall facing the camera, from one ridge to the next.
      const bottom = Math.round(MACRO_HEIGHT / REAL_LAYER) * REAL_LAYER;
      wallPoint.copy(mugWorld).addScaledVector(revealDir, MUG_RADIUS + 0.2).addScaledVector(mugAcross, 0.25);
      const [x, low] = onScreen(mugPoint.copy(wallPoint).setY(mugWorld.y + bottom));
      const [, high] = onScreen(mugPoint.copy(wallPoint).setY(mugWorld.y + bottom + REAL_LAYER));
      scale = { x, top: high, bottom: low, opacity: smoothstep((looks.macro - 0.6) / 0.4) };
    }
    opts.onMug({
      origin,
      right: [right[0] - origin[0], right[1] - origin[1]],
      up: [up[0] - origin[0], up[1] - origin[1]],
      plan: looks.plan,
      gather: looks.gather,
      scale,
    });
  }

  function updateLabels(apart: number) {
    if (!opts.onLabels) return;
    const opacity = labelOpacity(apart);
    const { clientWidth: w, clientHeight: h } = canvas;
    opts.onLabels(
      printer.parts.map((part) => {
        anchor.copy(part.labelAnchor).applyMatrix4(part.object.matrixWorld).project(camera);
        return { id: part.id, x: ((anchor.x + 1) / 2) * w, y: ((1 - anchor.y) / 2) * h, opacity };
      }),
    );
  }

  // While the printer is apart the visitor can drag a part to turn it on its
  // own, or the space around the parts to turn the whole printer. Once the mug
  // is on the table it can be turned too. Touch screens keep vertical swipes
  // for scrolling (touch-action: pan-y).
  interface Spin {
    yaw: number;
    pitch: number;
    /** Radians per second the turn keeps going at after the visitor lets go. */
    spin: number;
  }
  const newSpin = (): Spin => ({ yaw: 0, pitch: 0, spin: 0 });
  const printerSpin = newSpin();
  const mugSpin = newSpin();
  const partSpins = new Map(printer.parts.map((part) => [part, newSpin()] as const));
  const drag = { spin: null as Spin | null, maxPitch: 0, x: 0, y: 0, at: 0, startX: 0, startY: 0, part: null as PrinterPart | null };
  const offset = new THREE.Vector3();
  let grabbable: GrabTarget | null = null;
  let hovered: PrinterPart | null = null;

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const partObjects = printer.parts.map((part) => part.object);
  function partAt(e: PointerEvent): PrinterPart | null {
    const rect = canvas.getBoundingClientRect();
    pointer.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObjects(partObjects, true)[0];
    if (!hit) return null;
    return printer.parts.find((part) => hit.object === part.object || part.object.getObjectById(hit.object.id)) ?? null;
  }
  function setHovered(part: PrinterPart | null) {
    if (part === hovered) return;
    hovered = part;
    canvas.dataset.part = part ? "1" : "";
    opts.onHoverPart?.(part?.id ?? null);
  }

  // While the mug stands in front of the giant line, pointing at it (or
  // pressing it on a touch screen) lights the screen's edges.
  let heroMug = false;
  let touchingMug = false;
  function mugAt(e: PointerEvent) {
    const rect = canvas.getBoundingClientRect();
    pointer.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    return raycaster.intersectObject(job.object, true).length > 0;
  }
  function setTouchingMug(touching: boolean) {
    if (touching === touchingMug) return;
    touchingMug = touching;
    canvas.dataset.mug = touching ? "1" : "";
    opts.onTouchMug?.(touchingMug || handHolding);
    handle.invalidate();
  }
  let handHolding = false;
  function setHandHolding(holding: boolean) {
    if (holding === handHolding) return;
    handHolding = holding;
    opts.onTouchMug?.(touchingMug || handHolding);
  }

  // At the top the pencil and the ruler on the desk can be picked up and
  // moved: they lift a little under the pointer and more while held, and the
  // pencil draws on the mat as it goes.
  let deskActive = false;
  let deskHover: DeskItem | null = null;
  let deskHeld: { item: DeskItem; offset: THREE.Vector3 } | null = null;
  const deskPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const deskPoint = new THREE.Vector3();
  function aim(e: PointerEvent) {
    const rect = canvas.getBoundingClientRect();
    pointer.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
  }
  function deskItemAt(e: PointerEvent): DeskItem | null {
    aim(e);
    const hit = raycaster.intersectObjects(desk.items.map((i) => i.object), true)[0];
    return hit ? (desk.items.find((i) => i.object === hit.object || i.object.getObjectById(hit.object.id)) ?? null) : null;
  }
  /** Where the pointer meets the mat's top. */
  function onDesk(e: PointerEvent) {
    aim(e);
    deskPlane.constant = -desk.topY();
    return raycaster.ray.intersectPlane(deskPlane, deskPoint);
  }
  function setDeskHover(item: DeskItem | null) {
    if (item === deskHover) return;
    deskHover = item;
    desk.setHover(item);
    canvas.dataset.desk = item ? "1" : "";
    handle.invalidate();
  }

  function onPointerDown(e: PointerEvent) {
    if (deskActive && e.button === 0) {
      // The item under the pointer, or the one it was over when the cursor showed a hand.
      const item = deskItemAt(e) ?? deskHover;
      const at = item && onDesk(e);
      if (item && at) {
        const offset = item.object.getWorldPosition(new THREE.Vector3()).sub(at).setY(0);
        deskHeld = { item, offset };
        desk.setHeld(item);
        canvas.setPointerCapture(e.pointerId);
        canvas.dataset.dragging = "1";
        handle.invalidate();
        return;
      }
    }
    if (heroMug && e.button === 0 && mugAt(e)) setTouchingMug(true);
    if (!grabbable || e.button !== 0) return;
    const part = grabbable === "printer" ? partAt(e) : null;
    if (part) setHovered(part);
    drag.spin = grabbable === "mug" ? mugSpin : part ? partSpins.get(part)! : printerSpin;
    // Tilting is for mice; on touch screens vertical swipes scroll the page.
    drag.maxPitch = e.pointerType !== "mouse" || grabbable === "mug" ? 0 : part ? 1.2 : 0.4;
    drag.spin.spin = 0;
    drag.part = part;
    drag.x = drag.startX = e.clientX;
    drag.y = drag.startY = e.clientY;
    drag.at = e.timeStamp;
    canvas.setPointerCapture(e.pointerId);
    canvas.dataset.dragging = "1";
  }
  function onPointerMove(e: PointerEvent) {
    if (deskHeld) {
      const at = onDesk(e);
      if (at) desk.moveTo(deskHeld.item, at.add(deskHeld.offset));
      handle.invalidate();
      return;
    }
    if (deskActive && e.pointerType === "mouse") setDeskHover(deskItemAt(e));
    if (heroMug && (e.pointerType === "mouse" || touchingMug)) setTouchingMug(mugAt(e));
    const turned = drag.spin;
    if (!turned) {
      if (grabbable === "printer" && e.pointerType === "mouse") setHovered(partAt(e));
      return;
    }
    const dyaw = (e.clientX - drag.x) * 0.008;
    turned.yaw += dyaw;
    turned.pitch = Math.min(Math.max(turned.pitch + (e.clientY - drag.y) * 0.006, -drag.maxPitch), drag.maxPitch);
    turned.spin = dyaw / Math.max((e.timeStamp - drag.at) / 1000, 1 / 120);
    drag.x = e.clientX;
    drag.y = e.clientY;
    drag.at = e.timeStamp;
    handle.invalidate();
  }
  function onPointerUp(e: PointerEvent) {
    if (deskHeld) {
      deskHeld = null;
      desk.setHeld(null);
      delete canvas.dataset.dragging;
      if (e.pointerType !== "mouse") setDeskHover(null);
      handle.invalidate();
      return;
    }
    if (e.pointerType !== "mouse") setTouchingMug(false);
    if (!drag.spin) return;
    // A press without a drag is a click: it opens the part's card, or closes it on empty space.
    if (grabbable === "printer" && Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY) < 6) {
      drag.spin.spin = 0;
      opts.onSelectPart?.(drag.part?.id ?? null);
    }
    drag.spin = null;
    delete canvas.dataset.dragging;
    if (e.pointerType !== "mouse") setHovered(null);
    handle.invalidate();
  }
  function onPointerLeave() {
    if (!deskHeld) setDeskHover(null);
    setTouchingMug(false);
    if (!drag.spin) setHovered(null);
  }
  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerup", onPointerUp);
  canvas.addEventListener("pointercancel", onPointerUp);
  canvas.addEventListener("pointerleave", onPointerLeave);

  /** Advances one turn; returns true while it still needs frames. */
  function step(turned: Spin, active: boolean, dt: number) {
    if (drag.spin === turned) return true;
    if (active) {
      turned.yaw += turned.spin * dt;
      turned.spin *= Math.exp(-3 * dt);
      if (Math.abs(turned.spin) < 0.01) turned.spin = 0;
      return turned.spin !== 0;
    }
    // Once the printer goes back together, or the mug leaves the table, it
    // eases back to the story's angle, the short way round.
    turned.spin = 0;
    if (!turned.yaw && !turned.pitch) return false;
    turned.yaw = Math.atan2(Math.sin(turned.yaw), Math.cos(turned.yaw));
    const ease = 1 - Math.exp(-5 * dt);
    turned.yaw -= turned.yaw * ease;
    turned.pitch -= turned.pitch * ease;
    if (Math.abs(turned.yaw) < 1e-3 && Math.abs(turned.pitch) < 1e-3) turned.yaw = turned.pitch = 0;
    return true;
  }

  /** Advances every turn; returns true while any of them still needs frames. */
  function updateTurn(dt: number, canGrab: GrabTarget | null) {
    if (canGrab !== grabbable) {
      grabbable = canGrab;
      opts.onGrabbable?.(grabbable);
      if (grabbable !== "printer") setHovered(null);
    }
    let moving = step(printerSpin, grabbable === "printer", dt);
    for (const turned of partSpins.values()) moving = step(turned, grabbable === "printer", dt) || moving;
    return step(mugSpin, grabbable === "mug", dt) || moving;
  }

  let raf = 0;
  let introStart = 0;
  /** The opening's drawing waits a moment after the scene appears, then grows for this long. */
  const INTRO_DELAY = 650;
  const INTRO_MS = 2200;
  let last = 0;

  // Frames asked for from outside (scrolling, the pointer, a running
  // transition) mean the picture changed; frames the anti-aliasing asks for
  // to finish its blend do not.
  let dirty = true;
  let stillFrames = 0;
  const TAA_SAMPLES = 32;

  function frame(now: number) {
    raf = 0;
    stillFrames = dirty ? 0 : stillFrames + 1;
    dirty = false;
    if (taa) taa.accumulate = stillFrames >= 1 && quality.level === 2;
    // Only consecutive frames say something about the device's speed.
    if (last && now - last < 100) {
      const before = quality.level;
      if (quality.sample(now - last) !== before) applyPixelRatio(quality.level);
    }
    const dt = last ? Math.min((now - last) / 1000, 0.1) : 0;
    last = now;
    const transitioning = studio.update(dt);

    const p = opts.getProgress();
    const breathing = updateBreath(now, dt, p);
    printer.setIdle(breath.fan, breath.amount > 0.5 && Math.floor(now / 530) % 2 === 0);

    // 1. Drawing → object. The drawing is already under way at the top of the
    //    page, matching the poster frame shown before the scene loads.
    const draw = localProgress(p, "draw");
    // The opening: the printer's drawing grows out from its corner, as if
    // scaled up by its selection handle. The poster frame (frozen at the very
    // top) shows the desk alone; other frozen frames show it full size.
    const grow = opts.frozen ? (p === 0 ? 0 : 1) : introStart ? clamp01((now - introStart) / INTRO_MS) : 0;
    const growEase = grow >= 1 ? 1 : 1 - Math.pow(1 - grow, 3) * Math.cos(grow * 4.2);
    printer.root.scale.setScalar(Math.max(growEase, 0.001));
    printer.root.visible = grow > 0;
    const growing = grow < 1 && !opts.frozen;
    // The pencil and the ruler can be picked up while the desk is in view.
    deskActive = draw < 0.25 && !opts.frozen;
    if (!deskActive && (deskHover || deskHeld)) {
      deskHeld = null;
      desk.setHeld(null);
      setDeskHover(null);
    }
    const deskMoving = desk.update(dt);
    drawing.setReveal(DRAWING_START + (1 - DRAWING_START) * smoothstep(draw / 0.6), smoothstep((draw - 0.55) / 0.45));
    desk.setAmount(1 - smoothstep((draw - 0.5) / 0.45));

    // 2–3. Turn, then take apart.
    const apart = explodeAmount(p);
    const u = localProgress(p, "use");
    const end = endingMotion(u);
    const turning = updateTurn(dt, apart > 0.6 ? "printer" : end.travel === 1 ? "mug" : null);
    // The printer turns once on its own axis while it moves to the middle of
    // the stage, then comes apart there.
    const center = centerAmount(p);
    stage.position.x = (wide ? 34 : 0) * (1 - center);
    stage.rotation.y =
      -0.7 + localProgress(p, "meet") * 1.4 + spinTurn(p) + localProgress(p, "explode") * 0.3 - localProgress(p, "print") * 0.3 + printerSpin.yaw;
    stage.rotation.x = printerSpin.pitch;
    // The mat lies square to the view while the printer's drawing stands on it at an angle.
    // ...square to the camera looking down on it, turned a few degrees like a mat put down by hand.
    const deskView = wide ? DESK_WIDE : DESK_NARROW;
    desk.object.rotation.y = -stage.rotation.y + Math.atan2(deskView.x, deskView.z) + DESK_TURN;
    // The middle of the printer's drawing, where the opening camera aims.
    printer.root.getWorldPosition(deskTarget);
    deskTarget.y += 6;
    setExplode(printer.parts, apart, 0.07);
    // Parts the visitor has turned, each around its own middle.
    for (const [part, turned] of partSpins) {
      part.object.rotation.set(turned.pitch, turned.yaw, 0);
      if (!turned.yaw && !turned.pitch) continue;
      offset.copy(part.center).applyQuaternion(part.object.quaternion);
      part.object.position.add(part.center).sub(offset);
    }
    printer.filament.visible = printer.headCable.visible = apart < 0.02;

    // 4. Print the mug while the tool follows the nozzle path.
    const printed = printProgress(p);
    const r = localProgress(p, "reveal");
    const reveal = revealMotion(r);
    const slicer = slicerProgress(p);
    job.setProgress(printed);
    // Before printing, the slicer draws the mug as toolpaths on the bed.
    job.setPreview(slicer, printed);
    const target = nozzlePath(printed);
    const toolOn = printed > 0 ? 1 - reveal.lift : 0;
    printer.setToolPosition(
      target.x * toolOn,
      (NOZZLE_HOME.z - target.z) * toolOn,
      // The head waits above the preview until the print starts.
      (BED_SURFACE_Y + target.y + 0.1 - NOZZLE_HOME.y) * toolOn + reveal.lift * 8 + (printed > 0 ? 0 : smoothstep(slicer) * 5),
    );
    // The hotend glows while it prints and cools as the head lifts away.
    printer.setPrinting(printed, printed > 0 ? smoothstep(printed / 0.04) * (1 - reveal.lift) : 0);

    // 5. The mug takes over: it rises off the bed towards the camera, turning
    //    once, in front of a giant line, while the printer slides back into
    //    the dark. Its hover point is found in the world (towards where the
    //    camera watched the print from), then expressed on the bed, which
    //    carries the mug.
    printer.root.position.set(0, PRINTER_Y, 0);
    stage.updateMatrixWorld(true);
    printer.bedSurface.getWorldPosition(bedWorld);
    revealDir.set(85, 46, wide ? 140 : 190).sub(bedWorld).setY(0).normalize();
    hover.copy(bedWorld).addScaledVector(revealDir, REVEAL_FORWARD).setY(bedWorld.y + REVEAL_RISE);
    // Part way up while it rises; it stays there in the world while the printer slides away.
    hover.sub(bedWorld).multiplyScalar(reveal.rise).add(bedWorld);
    // The printer comes back as the mug goes down to the table beside it.
    const away = smoothstep(reveal.rise) * (1 - end.travel);
    if (away > 0) {
      aside.crossVectors(revealDir, UP);
      slide.copy(revealDir).multiplyScalar(-REVEAL_SLIDE).addScaledVector(aside, -REVEAL_ASIDE);
      slide.applyQuaternion(stageTurn.copy(stage.quaternion).invert()).multiplyScalar(away);
      printer.root.position.add(slide);
      stage.updateMatrixWorld(true);
    }
    printer.bedSurface.worldToLocal(hover);
    // The package scene: the mug lowers into the box and is hidden while it is shut.
    const pk = packageMotion(localProgress(p, "package"));

    // 6. The mug comes down to the table beside the printer, is filled with
    //    coffee and starts to steam, while the printer behind it blurs.
    const stay = 1 - end.travel;
    job.object.position.set(
      hover.x * stay + end.travel * 34,
      hover.y * stay + Math.sin(Math.PI * end.travel) * 6 - end.travel * BED_SURFACE_Y + end.bounce - pk.drop * PACKAGE_DROP,
      hover.z * stay + end.travel * 18,
    );
    // Ends with a handle on each side, as seen from the camera.
    job.object.rotation.y = reveal.turn + smoothstep(u / 0.5) * 0.2 + mugSpin.yaw;
    // Once it has stopped turning, and while it is looked at, the mug turns
    // its logo to the camera, so a hand can reach the handle on the right and
    // its plan shows a handle on each side; up close it turns a little
    // further, so the camera finds plain wall between the logo and a handle.
    // It lets go of that pose as it goes down to the table.
    const looks = heroLooks(p);
    const facingCamera = Math.max(smoothstep(looks.hero), smoothstep(pk.box), smoothstep((r - 0.55) / 0.15) * (1 - smoothstep(u / 0.4)));
    if (facingCamera > 0) {
      stage.updateMatrixWorld(true);
      job.object.getWorldQuaternion(mugTurn);
      mugFront.set(0, 0, 1).applyQuaternion(mugTurn);
      const facing = Math.atan2(revealDir.x, revealDir.z) - Math.atan2(mugFront.x, mugFront.z) + Math.PI * 0.28 * smoothstep(looks.macro);
      job.object.rotation.y += Math.atan2(Math.sin(facing), Math.cos(facing)) * facingCamera;
    }
    hand?.update(reveal.reach, reveal.grip);
    // While the hand holds the mug, the screen's edges light up as if the visitor touched it.
    setHandHolding(reveal.grip > 0.9 && !opts.frozen);
    job.setLooks(looks.thermal, looks.cool, looks.macro);
    job.setCoffee(end.pour);
    stage.updateMatrixWorld(true);
    job.syncClip();
    job.object.getWorldPosition(mugWorld);
    job.object.visible = !(pk.close > 0.999 && pk.open < 0.001);
    // The box stands under the mug's hovering place, its label turning to the camera.
    box.object.position.copy(mugWorld).y += (pk.drop - 1) * PACKAGE_DROP;
    boxCenter.copy(box.object.position).y += BOX.height / 2;
    box.object.rotation.y = Math.atan2(revealDir.x, revealDir.z) + (1 - pk.turn) * 0.6;
    box.update(pk.close, pk.open, pk.box);
    // The printer waits off to the side; it stays out of the package's
    // picture, all but the branch that carries the mug.
    // Only parts that were showing are hidden, and only they come back.
    const printerHidden = pk.frame >= 0.5;
    if (printerHidden && !hiddenForPackage.length) {
      for (const o of besideMug) if (o.visible) hiddenForPackage.push(o);
    }
    if (printerHidden) for (const o of hiddenForPackage) o.visible = false;
    else if (hiddenForPackage.length) {
      for (const o of hiddenForPackage) o.visible = true;
      hiddenForPackage.length = 0;
    }
    const zoom = screenZoom(p);
    const outro = opts.getOutro?.() ?? 0;
    // The tools stand in two rows on the table, starting at the mug.
    stage.worldToLocal(lineup.object.position.copy(mugWorld));
    lineup.object.rotation.y = -stage.rotation.y + 0.15;
    lineup.object.updateMatrixWorld();
    lineup.setReveal((outro - 0.08) / 0.5);
    placeCamera(u, apart, center, mugWorld, zoom, printed, outro, r / 0.5, 1 - draw / 0.8, looks, pk);
    heroMug = reveal.type > 0.6 && !opts.frozen;
    if (!heroMug) setTouchingMug(false);
    // The line sits a little above the mug's middle, so the mug covers the lower half of the letters.
    giantType.update(camera, typeCenter.copy(mugMiddle).setY(mugMiddle.y + 2.5), TYPE_BEHIND, reveal.type, wide);
    // The glow fades in while the mug is touched or held, and out again.
    const glowTarget = (touchingMug || handHolding) && reveal.type > 0.3 ? 1 : 0;
    glowAmount += (glowTarget - glowAmount) * (1 - Math.exp(-5 * dt));
    if (Math.abs(glowTarget - glowAmount) < 0.003) glowAmount = glowTarget;
    mugGlow.update(camera, mugMiddle, TYPE_BEHIND + 30, glowAmount, now / 1000);
    const glowing = glowAmount > 0;
    // The light follows the story, from a cool blueprint to a warm morning.
    studio.setStory(p);
    // The morning comes as the mug lands on the table.
    // At the close the sunbeam fades, so it does not glare as the camera rises.
    const morning = smoothstep((u - 0.3) / 0.4);
    // Warm daylight through a window falls across the opening desk too.
    // Sunlight through a window falls across the opening desk, as in a photograph.
    const openingSun = (1 - smoothstep(draw / 0.5)) * 1.15;
    studio.setSunSpread(morning > 0 ? 0 : 1 - smoothstep(draw / 0.5));
    // The plant's leaves in the window sway while the scene breathes and lean with the pointer, like a breeze.
    if (openingSun > 0) studio.setLeaves(breath.clock * 1.6, parallax.x * 0.8);
    studio.setMorning(morning, morning > 0 ? mugWorld : deskTarget, Math.max(morning * (1 - smoothstep(outro / 0.25)), openingSun));
    // The opening is shot like a miniature: sharp in the middle, softly blurred towards the edges.
    lens.uniforms.tilt.value = (1 - smoothstep(draw / 0.35)) * (quality.level === 2 ? 1 : 0.6);
    // Its corners fall off into warm shade.
    lens.uniforms.vignette.value = LENS.dark.vignette + 0.22 * (1 - smoothstep(draw / 0.35));
    mugTop.copy(mugWorld).y += LAYERS * LAYER_HEIGHT;
    steam.update(mugTop, end.steam, now / 1000);
    const steaming = end.steam > 0 && (opts.isVisible?.() ?? true);
    const drifting = updateParallax(dt);

    // Focus: on the mug in the last scene, on the selected or hovered part while apart.
    const inFocus = grabbable === "printer" ? (selected ?? hovered) : null;
    const focusTarget = inFocus ? 1 : 0;
    focusAmount += (focusTarget - focusAmount) * (1 - Math.exp(-6 * dt));
    if (Math.abs(focusTarget - focusAmount) < 0.01) focusAmount = focusTarget;
    const focusing = focusAmount !== focusTarget;
    const mugBlur = smoothstep(u / 0.6);
    if (inFocus) inFocus.object.localToWorld(partFocus.copy(inFocus.center));
    // At the close everything comes into focus for the overview.
    const aperture = Math.max(mugBlur * 0.0004 * (1 - smoothstep(outro / 0.3)), focusAmount * 0.00022);

    studio.renderShadow(noContactShadow);
    if (quality.level > 0) {
      bokeh.enabled = aperture > 0.000004;
      if (bokeh.enabled) {
        depthCamera.copy(camera);
        depthCamera.layers.set(0);
        // The blur measures depth along the view, not straight-line distance.
        camera.updateMatrixWorld();
        focusUniforms.focus.value = -viewSpace.copy(mugBlur > focusAmount ? mugWorld : partFocus).applyMatrix4(camera.matrixWorldInverse).z;
        focusUniforms.aperture.value = aperture;
        // A part in focus keeps the rest only softly blurred, without halos round its edges.
        focusUniforms.maxblur.value = mugBlur > focusAmount ? 0.012 : 0.004;
      }
      lens.uniforms.time.value = (now / 1000) % 100;
      composer.render();
    } else {
      renderer.render(scene, camera);
    }
    updateLabels(apart);
    updateSelection(1 - smoothstep(draw / 0.3), grow);
    updateScreen(zoom);
    updateMug(looks);
    if (transitioning || turning || steaming || drifting || focusing || breathing || glowing || growing || deskMoving) handle.invalidate();
    // Once still, keep drawing until the anti-aliasing blend is complete.
    else if (taa && quality.level === 2 && (taa as unknown as { accumulateIndex: number }).accumulateIndex < TAA_SAMPLES && !raf) raf = requestAnimationFrame(frame);
  }

  const handle: SceneHandle = {
    setTheme(theme) {
      studio.setTheme(theme);
      drawing.setTheme(theme);
      steam.setTheme(theme);
      lineup.setTheme(theme);
      giantType.setTheme(theme);
      mugGlow.setTheme(theme);
      desk.setTheme(theme);
      applyLens(theme);
      handle.invalidate();
    },
    setFilament(color) {
      printer.setFilament(color);
      job.setColor(color);
      handle.invalidate();
    },
    setShape(id) {
      job.setShape(id);
      hand?.setShape(id);
      handle.invalidate();
    },
    snapshot() {
      // The WebGL canvas keeps its picture only until the next frame, so it is copied straight after drawing.
      cancelAnimationFrame(raf);
      raf = 0;
      frame(performance.now());
      camera.updateMatrixWorld();
      const point = mugTop.clone().setY(mugTop.y - (LAYERS * LAYER_HEIGHT) / 2).project(camera);
      const { width, height } = renderer.domElement;
      const size = Math.round(Math.min(width, height) * 0.62);
      const cx = Math.min(Math.max(((point.x + 1) / 2) * width, size / 2), width - size / 2);
      const cy = Math.min(Math.max(((1 - point.y) / 2) * height - size * 0.08, size / 2), height - size / 2);
      const picture = document.createElement("canvas");
      picture.width = picture.height = size;
      picture.getContext("2d")!.drawImage(renderer.domElement, cx - size / 2, cy - size / 2, size, size, 0, 0, size, size);
      return picture;
    },
    setSelected(id) {
      selected = printer.parts.find((part) => part.id === id) ?? null;
      handle.invalidate();
    },
    startIntro() {
      if (!introStart) introStart = performance.now() + INTRO_DELAY;
      handle.invalidate();
    },
    invalidate() {
      dirty = true;
      if (!raf) raf = requestAnimationFrame(frame);
    },
    dispose() {
      cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointercancel", onPointerUp);
      canvas.removeEventListener("pointerleave", onPointerLeave);
      window.removeEventListener("pointermove", onWindowPointerMove);
      printer.dispose();
      drawing.dispose();
      job.dispose();
      steam.dispose();
      lineup.dispose();
      giantType.dispose();
      mugGlow.dispose();
      desk.dispose();
      hand?.dispose();
      box.dispose();
      composer.dispose();
      bokeh.dispose();
      studio.dispose();
      renderer.dispose();
    },
  };

  resize();
  // The hand joins the mug once it has loaded; the story works without it.
  hand = await handLoading;
  opts.onProgress?.(0.8);
  if (hand) job.object.add(hand.object);
  // Compile shaders in parallel where supported, so the first frame does not stall.
  await renderer.compileAsync(scene, camera);
  opts.onProgress?.(0.95);
  resizeObserver.observe(canvas);
  return handle;
}
