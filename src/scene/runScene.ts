import * as THREE from "three";
import type { Theme } from "../theme/theme";
import type { PartId } from "./parts";
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

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(BACKGROUND[opts.theme]);
  const camera = new THREE.PerspectiveCamera(32, 1, 1, 1000);
  camera.position.set(70, 38, 110);
  camera.lookAt(0, 0, 0);

  scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 2));
  // Placeholder until the printer model replaces it.
  const placeholder = new THREE.Mesh(
    new THREE.BoxGeometry(30, 40, 30),
    new THREE.MeshStandardMaterial({ color: 0x00756a, roughness: 0.5 }),
  );
  scene.add(placeholder);

  function applyPixelRatio(level: QualityLevel) {
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, level === 2 ? 2 : level === 1 ? 1.5 : 1));
  }
  applyPixelRatio(quality.level);

  function resize() {
    const { clientWidth: w, clientHeight: h } = canvas;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
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
    placeholder.rotation.y = -0.6 + localProgress(p, "meet") * 2.1;
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
      placeholder.geometry.dispose();
      (placeholder.material as THREE.Material).dispose();
      renderer.dispose();
    },
  };

  resize();
  return handle;
}
