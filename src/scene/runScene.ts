import * as THREE from "three";
import type { Theme } from "../theme/theme";
import { explodeAmount, setExplode } from "./explode";
import type { PartId } from "./parts";
import { buildPrinter } from "./printer";
import { QualityController, type QualityLevel } from "./quality";
import { localProgress } from "./timeline";

export interface SceneOptions {
  theme: Theme;
  quality: QualityLevel;
  getProgress: () => number;
  labels: Record<PartId, string>;
}

export interface SceneHandle {
  setTheme(theme: Theme): void;
  /** Requests one frame. The scene draws only when asked or while a transition runs. */
  invalidate(): void;
  dispose(): void;
}

const BACKGROUND: Record<Theme, number> = { dark: 0x15120f, light: 0xf5f7f6 };

export function startScene(canvas: HTMLCanvasElement, opts: SceneOptions): SceneHandle {
  const quality = new QualityController(opts.quality);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: opts.quality === 2, powerPreference: "high-performance" });
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled = opts.quality > 0;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(BACKGROUND[opts.theme]);
  const camera = new THREE.PerspectiveCamera(30, 1, 1, 1000);

  // Temporary lighting until the studio module replaces it.
  scene.add(new THREE.HemisphereLight(0xffffff, 0x3a3028, 1.4));
  const key = new THREE.DirectionalLight(0xffd8b0, 3);
  key.position.set(-60, 90, 70);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  Object.assign(key.shadow.camera, { left: -60, right: 60, top: 60, bottom: -60 });
  scene.add(key);

  const printer = buildPrinter(opts.quality);
  const stage = new THREE.Group();
  stage.add(printer.root);
  printer.root.position.y = -32;
  scene.add(stage);

  function applyPixelRatio(level: QualityLevel) {
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, level === 2 ? 2 : level === 1 ? 1.5 : 1));
  }
  applyPixelRatio(quality.level);

  function resize() {
    const { clientWidth: w, clientHeight: h } = canvas;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // Wide screens keep the text on the left and the printer on the right.
    const wide = camera.aspect > 1.1;
    stage.position.x = wide ? 28 : 0;
    stage.position.y = wide ? 4 : 16;
    camera.position.set(85, 46, wide ? 180 : 240);
    camera.lookAt(wide ? 20 : 0, 2, 0);
    camera.updateProjectionMatrix();
    handle.invalidate();
  }
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(canvas);

  let raf = 0;
  let last = 0;

  function frame(now: number) {
    raf = 0;
    // Only consecutive frames say something about the device's speed.
    if (last && now - last < 100) {
      const before = quality.level;
      if (quality.sample(now - last) !== before) applyPixelRatio(quality.level);
    }
    last = now;

    const p = opts.getProgress();
    stage.rotation.y = -0.7 + localProgress(p, "meet") * 1.4 + localProgress(p, "explode") * 0.5;
    const apart = explodeAmount(p);
    setExplode(printer.parts, apart);
    printer.filament.visible = apart < 0.02;
    renderer.render(scene, camera);
  }

  const handle: SceneHandle = {
    setTheme(theme) {
      scene.background = new THREE.Color(BACKGROUND[theme]);
      handle.invalidate();
    },
    invalidate() {
      if (!raf) raf = requestAnimationFrame(frame);
    },
    dispose() {
      cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      printer.dispose();
      renderer.dispose();
    },
  };

  resize();
  return handle;
}
