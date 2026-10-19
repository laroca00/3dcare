import * as THREE from "three";
import type { Theme } from "../theme/theme";
import { createDrawing } from "./drawing";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { LineMaterial } from "three/addons/lines/LineMaterial.js";
import { BokehPass } from "three/addons/postprocessing/BokehPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import type { Pass } from "three/addons/postprocessing/Pass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { centerAmount, explodeAmount, setExplode, spinTurn } from "./explode";
import type { PartId } from "./parts";
import { createPrintJob } from "./printJob";
import { BED_SURFACE_Y, NOZZLE_HOME, SCREEN_SIZE, buildPrinter, type PrinterPart } from "./printer";
import type { Point } from "./quadTransform";
import { QualityController, type QualityLevel } from "./quality";
import { STEAM_LAYER, createSteam } from "./steam";
import { LAYERS, LAYER_HEIGHT, endingMotion, labelOpacity, nozzlePath, printProgress, screenZoom, slicerProgress } from "./storyMotion";
import { FLOOR_LAYER, createStudio } from "./studio";
import { localProgress, smoothstep } from "./timeline";

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
  labels: Record<PartId, string>;
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
  uniforms: { tDiffuse: { value: null }, vignette: { value: 0.3 }, grain: { value: 0.03 }, time: { value: 0 } },
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
    varying vec2 vUv;
    float random(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    void main() {
      vec4 color = texture2D(tDiffuse, vUv);
      float edge = smoothstep(0.25, 0.85, length((vUv - 0.5) * vec2(1.0, 0.8)));
      color.rgb *= 1.0 - vignette * edge;
      color.rgb += (random(vUv * 1000.0 + time) - 0.5) * grain;
      gl_FragColor = color;
    }`,
};

/** Replaces invalid (NaN or infinite) pixels with black. */
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
      gl_FragColor = invalid ? vec4(0.0, 0.0, 0.0, 1.0) : color;
    }`,
};

/** Last scene: where the camera ends up relative to the mug, and where it looks. */
const CLOSE_UP_WIDE = new THREE.Vector3(48, 26, 40);
const CLOSE_UP_NARROW = new THREE.Vector3(60, 34, 66);
const FOCUS_WIDE = new THREE.Vector3(-6, 7, 8);
const FOCUS_NARROW = new THREE.Vector3(0, -3, 0);

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
  await yieldToMain();
  const stage = new THREE.Group();
  stage.add(printer.root);
  printer.root.position.y = -32;
  scene.add(stage);
  const studio = createStudio(renderer, scene, opts.theme, opts.quality, stage, printer.root.position.y);
  await yieldToMain();
  const drawing = createDrawing(printer, opts.theme);
  await yieldToMain();
  const job = createPrintJob(printer.bedSurface, opts.quality);
  const steam = createSteam(opts.theme);
  scene.add(steam.object);
  camera.layers.enable(STEAM_LAYER);
  camera.layers.enable(FLOOR_LAYER);
  // The blur's depth pass looks through this camera, which leaves the steam and the floor out.
  const depthCamera = new THREE.PerspectiveCamera();
  // The opening line drawing stays out of the floor's contact shadow.
  const lineObjects: THREE.Object3D[] = [];
  stage.traverse((o) => {
    if ((o as THREE.Mesh).material instanceof LineMaterial) lineObjects.push(o);
  });

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
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(bokeh);
  const glowPasses: Pass[] = [];
  if (opts.quality === 2) {
    // A stray invalid pixel would otherwise spread through the glow as black blocks.
    const finite = new ShaderPass(FiniteShader);
    const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.45, 0.5, 1);
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
    camera.aspect = w / h;
    // Wide screens keep the text on the left and the printer on the right.
    wide = camera.aspect > 1.1;
    stage.position.y = wide ? 4 : 16;
    camera.updateProjectionMatrix();
    handle.invalidate();
  }
  const resizeObserver = new ResizeObserver(resize);

  const mugWorld = new THREE.Vector3();
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

  function placeCamera(use: number, apart: number, center: number, mug: THREE.Vector3, zoom: number, printed: number) {
    // The camera moves in while the printer is apart, so the parts fill the
    // stage. In the last scene it follows the mug to the table and frames it
    // close up, beside the text on wide screens.
    const push = smoothstep(use);
    const near = smoothstep(apart);
    camera.position.set(85 - near * 10, 46 - near * 6, (wide ? 140 : 190) + near * (wide ? 40 : 85));
    home.set(wide ? 20 * (1 - center) + near * 4 : near * 3, 2 - near * (wide ? 13 : 18), 0);
    // While printing, the camera swings slowly round the printer and back,
    // like a print time-lapse, coming a little closer on the way.
    const swing = Math.sin(Math.PI * printed);
    if (swing > 0) {
      orbitOffset.copy(camera.position).sub(home).applyAxisAngle(UP, swing * 0.7).multiplyScalar(1 - swing * 0.14);
      camera.position.copy(home).add(orbitOffset);
    }
    closeUp.copy(mug).add(wide ? CLOSE_UP_WIDE : CLOSE_UP_NARROW);
    camera.position.lerp(closeUp, push);
    mugFocus.copy(mug).add(wide ? FOCUS_WIDE : FOCUS_NARROW);
    lookAt.copy(home).lerp(mugFocus, push);
    // Before printing, the camera moves in to the printer's screen.
    if (zoom > 0) {
      const ease = smoothstep(zoom);
      camera.position.lerp(screenCloseUp(), ease);
      lookAt.lerp(screenCenter, ease);
    }
    // The camera drifts a little with the mouse, keeping its aim (less when up close),
    // and floats gently while the visitor pauses.
    const float = breath.amount * (1 - zoom);
    camera.position.x += parallax.x * 3 * (1 - zoom) + Math.sin(breath.clock * 0.55) * 0.9 * float;
    camera.position.y += parallax.y * 2 * (1 - zoom) + Math.sin(breath.clock * 0.41 + 1) * 0.6 * float;
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

  function onPointerDown(e: PointerEvent) {
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
  let last = 0;

  function frame(now: number) {
    raf = 0;
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
    drawing.setReveal(DRAWING_START + (1 - DRAWING_START) * smoothstep(draw / 0.6), smoothstep((draw - 0.55) / 0.45));

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
    const slicer = slicerProgress(p);
    job.setProgress(printed);
    // Before printing, the slicer draws the mug as toolpaths on the bed.
    job.setPreview(slicer, printed);
    const target = nozzlePath(printed);
    const toolOn = printed > 0 ? 1 - end.lift : 0;
    printer.setToolPosition(
      target.x * toolOn,
      (NOZZLE_HOME.z - target.z) * toolOn,
      // The head waits above the preview until the print starts.
      (BED_SURFACE_Y + target.y + 0.1 - NOZZLE_HOME.y) * toolOn + end.lift * 8 + (printed > 0 ? 0 : smoothstep(slicer) * 5),
    );
    // The hotend glows while it prints and cools as the head lifts away.
    printer.setPrinting(printed, printed > 0 ? smoothstep(printed / 0.04) * (1 - end.lift) : 0);

    // 5. The mug leaves the printer for the table beside it, is filled with
    //    coffee and starts to steam, while the printer behind it blurs.
    job.object.position.set(end.travel * 34, Math.sin(Math.PI * end.travel) * 14 - end.travel * BED_SURFACE_Y + end.bounce, end.travel * 18);
    // Ends with a handle on each side, as seen from the camera.
    job.object.rotation.y = smoothstep(u / 0.5) * 0.2 + mugSpin.yaw;
    job.setCoffee(end.pour);
    stage.updateMatrixWorld(true);
    job.syncClip();
    job.object.getWorldPosition(mugWorld);
    const zoom = screenZoom(p);
    placeCamera(u, apart, center, mugWorld, zoom, printed);
    // The light follows the story, from a cool blueprint to a warm morning.
    studio.setStory(p);
    // The morning comes as the mug lands on the table.
    studio.setMorning(smoothstep((u - 0.3) / 0.4), mugWorld);
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
    const aperture = Math.max(mugBlur * 0.0004, focusAmount * 0.00022);

    studio.renderShadow(lineObjects);
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
    updateScreen(zoom);
    if (transitioning || turning || steaming || drifting || focusing || breathing) handle.invalidate();
  }

  const handle: SceneHandle = {
    setTheme(theme) {
      studio.setTheme(theme);
      drawing.setTheme(theme);
      steam.setTheme(theme);
      applyLens(theme);
      handle.invalidate();
    },
    setFilament(color) {
      printer.setFilament(color);
      job.setColor(color);
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
    invalidate() {
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
      composer.dispose();
      bokeh.dispose();
      studio.dispose();
      renderer.dispose();
    },
  };

  resize();
  // Compile shaders in parallel where supported, so the first frame does not stall.
  await renderer.compileAsync(scene, camera);
  resizeObserver.observe(canvas);
  return handle;
}
