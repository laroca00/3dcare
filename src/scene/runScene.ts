import * as THREE from "three";
import type { Theme } from "../theme/theme";
import { createDrawing } from "./drawing";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { BokehPass } from "three/addons/postprocessing/BokehPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { explodeAmount, setExplode } from "./explode";
import type { PartId } from "./parts";
import { createPrintJob } from "./printJob";
import { BED_SURFACE_Y, NOZZLE_HOME, buildPrinter } from "./printer";
import { QualityController, type QualityLevel } from "./quality";
import { STEAM_LAYER, createSteam } from "./steam";
import { LAYERS, LAYER_HEIGHT, endingMotion, labelOpacity, nozzlePath, printProgress } from "./storyMotion";
import { createStudio } from "./studio";
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
  /** Called when what the visitor can drag to turn changes: the printer while apart, the mug at the end. */
  onGrabbable?: (target: GrabTarget | null) => void;
}

export type GrabTarget = "printer" | "mug";

export interface SceneHandle {
  setTheme(theme: Theme): void;
  /** Requests one frame. The scene draws only when asked or while a transition runs. */
  invalidate(): void;
  dispose(): void;
}

/** Lets the browser handle input and paint between the heavier set-up steps. */
const yieldToMain = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

/** How much of the drawing shows at the very top of the page. */
const DRAWING_START = 0.4;

/** Last scene: where the camera ends up relative to the mug, and where it looks. */
const CLOSE_UP_WIDE = new THREE.Vector3(48, 26, 40);
const CLOSE_UP_NARROW = new THREE.Vector3(60, 34, 66);
const FOCUS_WIDE = new THREE.Vector3(-6, 7, 8);
const FOCUS_NARROW = new THREE.Vector3(0, -3, 0);

export async function startScene(canvas: HTMLCanvasElement, opts: SceneOptions): Promise<SceneHandle> {
  const quality = new QualityController(opts.quality);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: opts.quality === 2, powerPreference: "high-performance" });
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled = opts.quality > 0;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

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
  // The blur's depth pass looks through this camera, which leaves the steam out.
  const depthCamera = new THREE.PerspectiveCamera();

  // In the last scene the printer behind the mug goes out of focus. The extra
  // passes are set up the first time they are needed, and skipped at the
  // lowest quality.
  let composer: EffectComposer | null = null;
  let bokeh: BokehPass | null = null;
  function blurPasses() {
    if (!composer || !bokeh) {
      const target = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: opts.quality === 2 ? 4 : 0 });
      composer = new EffectComposer(renderer, target);
      bokeh = new BokehPass(scene, depthCamera, { focus: 100, aperture: 0, maxblur: 0.012 });
      composer.addPass(new RenderPass(scene, camera));
      composer.addPass(bokeh);
      composer.addPass(new OutputPass());
      composer.setPixelRatio(renderer.getPixelRatio());
      composer.setSize(canvas.clientWidth, canvas.clientHeight);
    }
    return { composer, uniforms: bokeh.uniforms as Record<"focus" | "aperture", THREE.IUniform<number>> };
  }

  function applyPixelRatio(level: QualityLevel) {
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, level === 2 ? 2 : level === 1 ? 1.5 : 1));
    composer?.setPixelRatio(renderer.getPixelRatio());
  }
  applyPixelRatio(quality.level);

  let wide = true;
  function resize() {
    const { clientWidth: w, clientHeight: h } = canvas;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    composer?.setSize(w, h);
    drawing.setResolution(w, h);
    camera.aspect = w / h;
    // Wide screens keep the text on the left and the printer on the right.
    wide = camera.aspect > 1.1;
    stage.position.x = wide ? 34 : 0;
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

  function placeCamera(use: number, apart: number, mug: THREE.Vector3) {
    // The camera moves in while the printer is apart, so the parts fill the
    // stage. In the last scene it follows the mug to the table and frames it
    // close up, beside the text on wide screens.
    const push = smoothstep(use);
    const near = smoothstep(apart);
    camera.position.set(85 - near * 10, 46 - near * 12, (wide ? 140 : 190) - near * (wide ? 8 : 4));
    home.set(wide ? 20 : 0, 2 - near * 3, 0);
    closeUp.copy(mug).add(wide ? CLOSE_UP_WIDE : CLOSE_UP_NARROW);
    camera.position.lerp(closeUp, push);
    mugFocus.copy(mug).add(wide ? FOCUS_WIDE : FOCUS_NARROW);
    lookAt.copy(home).lerp(mugFocus, push);
    camera.lookAt(lookAt);
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

  // While the printer is apart, and once the mug is on the table, the visitor
  // can drag it to turn it. Touch screens keep vertical swipes for scrolling
  // (touch-action: pan-y).
  const turn = { yaw: 0, pitch: 0, spin: 0, dragging: false, x: 0, y: 0, at: 0, target: "printer" as GrabTarget };
  let grabbable: GrabTarget | null = null;

  function onPointerDown(e: PointerEvent) {
    if (!grabbable || e.button !== 0) return;
    turn.dragging = true;
    turn.spin = 0;
    turn.x = e.clientX;
    turn.y = e.clientY;
    turn.at = e.timeStamp;
    canvas.setPointerCapture(e.pointerId);
    canvas.dataset.dragging = "1";
  }
  function onPointerMove(e: PointerEvent) {
    if (!turn.dragging) return;
    const dx = e.clientX - turn.x;
    const dyaw = dx * 0.008;
    turn.yaw += dyaw;
    if (e.pointerType === "mouse" && turn.target === "printer") turn.pitch = Math.min(Math.max(turn.pitch + (e.clientY - turn.y) * 0.004, -0.25), 0.4);
    turn.spin = dyaw / Math.max((e.timeStamp - turn.at) / 1000, 1 / 120);
    turn.x = e.clientX;
    turn.y = e.clientY;
    turn.at = e.timeStamp;
    handle.invalidate();
  }
  function onPointerUp() {
    if (!turn.dragging) return;
    turn.dragging = false;
    delete canvas.dataset.dragging;
    handle.invalidate();
  }
  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerup", onPointerUp);
  canvas.addEventListener("pointercancel", onPointerUp);

  /** Advances the visitor's turn; returns true while it still needs frames. */
  function updateTurn(dt: number, canGrab: GrabTarget | null) {
    if (canGrab !== grabbable) {
      grabbable = canGrab;
      opts.onGrabbable?.(grabbable);
      if (grabbable && grabbable !== turn.target) {
        turn.target = grabbable;
        turn.yaw = turn.pitch = turn.spin = 0;
      }
      // Coming back the short way round.
      if (!grabbable) turn.yaw = Math.atan2(Math.sin(turn.yaw), Math.cos(turn.yaw));
    }
    if (turn.dragging) return true;
    if (grabbable) {
      turn.yaw += turn.spin * dt;
      turn.spin *= Math.exp(-3 * dt);
      if (Math.abs(turn.spin) < 0.01) turn.spin = 0;
      return turn.spin !== 0;
    }
    // Once the printer goes back together, or the mug leaves the table, it
    // eases back to the story's angle.
    turn.spin = 0;
    const ease = 1 - Math.exp(-5 * dt);
    turn.yaw -= turn.yaw * ease;
    turn.pitch -= turn.pitch * ease;
    if (Math.abs(turn.yaw) < 1e-3 && Math.abs(turn.pitch) < 1e-3) turn.yaw = turn.pitch = 0;
    return turn.yaw !== 0 || turn.pitch !== 0;
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

    // 1. Drawing → object. The drawing is already under way at the top of the
    //    page, matching the poster frame shown before the scene loads.
    const draw = localProgress(p, "draw");
    drawing.setReveal(DRAWING_START + (1 - DRAWING_START) * smoothstep(draw / 0.6), smoothstep((draw - 0.55) / 0.45));

    // 2–3. Turn, then take apart.
    const apart = explodeAmount(p);
    const u = localProgress(p, "use");
    const end = endingMotion(u);
    const turning = updateTurn(dt, apart > 0.6 ? "printer" : end.travel === 1 ? "mug" : null);
    const printerTurn = turn.target === "printer" ? turn : null;
    stage.rotation.y = -0.7 + localProgress(p, "meet") * 1.4 + localProgress(p, "explode") * 0.5 - localProgress(p, "print") * 0.5 + (printerTurn?.yaw ?? 0);
    stage.rotation.x = printerTurn?.pitch ?? 0;
    setExplode(printer.parts, apart);
    printer.filament.visible = apart < 0.02;

    // 4. Print the mug while the tool follows the nozzle path.
    const printed = printProgress(p);
    job.setProgress(printed);
    const target = nozzlePath(printed);
    const toolOn = printed > 0 ? 1 - end.lift : 0;
    printer.setToolPosition(
      target.x * toolOn,
      (NOZZLE_HOME.z - target.z) * toolOn,
      (BED_SURFACE_Y + target.y + 0.1 - NOZZLE_HOME.y) * toolOn + end.lift * 8,
    );

    // 5. The mug leaves the printer for the table beside it, is filled with
    //    coffee and starts to steam, while the printer behind it blurs.
    job.object.position.set(end.travel * 34, Math.sin(Math.PI * end.travel) * 14 - end.travel * BED_SURFACE_Y, end.travel * 18);
    // Ends with a handle on each side, as seen from the camera.
    job.object.rotation.y = smoothstep(u / 0.5) * 0.2 + (turn.target === "mug" ? turn.yaw : 0);
    job.setCoffee(end.pour);
    stage.updateMatrixWorld(true);
    job.object.getWorldPosition(mugWorld);
    placeCamera(u, apart, mugWorld);
    mugTop.copy(mugWorld).y += LAYERS * LAYER_HEIGHT;
    steam.update(mugTop, end.steam, now / 1000);
    const steaming = end.steam > 0 && (opts.isVisible?.() ?? true);

    const blur = quality.level > 0 ? smoothstep(u / 0.6) : 0;
    if (blur > 0.01) {
      const passes = blurPasses();
      depthCamera.copy(camera);
      depthCamera.layers.set(0);
      passes.uniforms.focus.value = camera.position.distanceTo(mugWorld);
      passes.uniforms.aperture.value = blur * 0.0004;
      passes.composer.render();
    } else {
      renderer.render(scene, camera);
    }
    updateLabels(apart);
    if (transitioning || turning || steaming) handle.invalidate();
  }

  const handle: SceneHandle = {
    setTheme(theme) {
      studio.setTheme(theme);
      drawing.setTheme(theme);
      steam.setTheme(theme);
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
      printer.dispose();
      drawing.dispose();
      job.dispose();
      steam.dispose();
      composer?.dispose();
      bokeh?.dispose();
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
