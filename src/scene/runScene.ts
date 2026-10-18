import * as THREE from "three";
import type { Theme } from "../theme/theme";
import { createDrawing } from "./drawing";
import { explodeAmount, setExplode } from "./explode";
import { createHand } from "./hand";
import type { PartId } from "./parts";
import { createPrintJob } from "./printJob";
import { BED_SURFACE_Y, NOZZLE_HOME, buildPrinter } from "./printer";
import { QualityController, type QualityLevel } from "./quality";
import { labelOpacity, nozzlePath, printProgress, handMotion } from "./storyMotion";
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
  /** How the story ends; "table" is the fallback without a hand (decision pending). */
  ending?: "hand" | "table";
}

export interface SceneHandle {
  setTheme(theme: Theme): void;
  /** Requests one frame. The scene draws only when asked or while a transition runs. */
  invalidate(): void;
  dispose(): void;
}

/** Lets the browser handle input and paint between the heavier set-up steps. */
const yieldToMain = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

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
  const drawing = createDrawing(printer);
  await yieldToMain();
  const job = createPrintJob(printer.bedSurface, opts.quality);
  const hand = createHand(opts.quality);
  stage.add(hand.object);

  function applyPixelRatio(level: QualityLevel) {
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, level === 2 ? 2 : level === 1 ? 1.5 : 1));
  }
  applyPixelRatio(quality.level);

  let wide = true;
  function resize() {
    const { clientWidth: w, clientHeight: h } = canvas;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // Wide screens keep the text on the left and the printer on the right.
    wide = camera.aspect > 1.1;
    stage.position.x = wide ? 28 : 0;
    stage.position.y = wide ? 4 : 16;
    camera.updateProjectionMatrix();
    handle.invalidate();
  }
  const resizeObserver = new ResizeObserver(resize);

  const mugWorld = new THREE.Vector3();
  const anchor = new THREE.Vector3();

  const home = new THREE.Vector3();
  const lookAt = new THREE.Vector3();

  function placeCamera(use: number, mug: THREE.Vector3) {
    // In the last scene the camera moves in and turns towards the mug.
    const push = smoothstep(use);
    camera.position.set(85 - push * 35, 46 - push * 16, (wide ? 180 : 240) - push * (wide ? 90 : 120));
    home.set(wide ? 20 : 0, 2, 0);
    lookAt.copy(home).lerp(mug, push * 0.85);
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

    // 1. Drawing → object.
    const draw = localProgress(p, "draw");
    drawing.setReveal(smoothstep(draw / 0.6), smoothstep((draw - 0.55) / 0.45));

    // 2–3. Turn, then take apart.
    stage.rotation.y = -0.7 + localProgress(p, "meet") * 1.4 + localProgress(p, "explode") * 0.5 - localProgress(p, "print") * 0.5;
    const apart = explodeAmount(p);
    setExplode(printer.parts, apart);
    printer.filament.visible = apart < 0.02;

    // 4. Print the mug while the tool follows the nozzle path.
    const printed = printProgress(p);
    const use = handMotion(localProgress(p, "use"));
    job.setProgress(printed);
    const target = nozzlePath(printed);
    const toolOn = printed > 0 ? 1 - use.lift : 0;
    printer.setToolPosition(
      target.x * toolOn,
      (NOZZLE_HOME.z - target.z) * toolOn,
      (BED_SURFACE_Y + target.y + 0.1 - NOZZLE_HOME.y) * toolOn + use.lift * 8,
    );

    // 5. The mug leaves the printer: lifted towards the camera into a hand, or
    //    set down on the table next to the printer.
    const u = localProgress(p, "use");
    if (opts.ending === "table") {
      const travel = smoothstep(u / 0.7);
      job.object.position.set(travel * 34, Math.sin(Math.PI * travel) * 14 - travel * BED_SURFACE_Y, travel * 18);
      hand.object.visible = false;
    } else {
      job.object.position.set(use.lift * 10, use.lift * 16, use.lift * 26);
      hand.object.visible = use.hand > 0;
    }
    job.object.rotation.y = -smoothstep(u / 0.5) * 0.9;
    stage.updateMatrixWorld(true);
    job.object.getWorldPosition(mugWorld);
    const mugInStage = stage.worldToLocal(mugWorld.clone());
    hand.object.position.set(mugInStage.x + 9 + (1 - use.hand) * 30, mugInStage.y + 3 - (1 - use.hand) * 18, mugInStage.z);
    hand.object.rotation.y = job.object.rotation.y;
    hand.setPose(use.grip);
    placeCamera(u, mugWorld);

    renderer.render(scene, camera);
    updateLabels(apart);
    if (transitioning) handle.invalidate();
  }

  const handle: SceneHandle = {
    setTheme(theme) {
      studio.setTheme(theme);
      handle.invalidate();
    },
    invalidate() {
      if (!raf) raf = requestAnimationFrame(frame);
    },
    dispose() {
      cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      printer.dispose();
      drawing.dispose();
      job.dispose();
      hand.dispose();
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
