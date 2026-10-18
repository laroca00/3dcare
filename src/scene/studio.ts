import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import type { Theme } from "../theme/theme";
import type { QualityLevel } from "./quality";
import { StudioTransition, type StudioValues } from "./studioMix";

// Dark: a warm, low-key studio like a product shoot at night.
// Light: a soft, bright studio on the site's paper colour.
const LOOKS: Record<Theme, StudioValues> = {
  dark: {
    background: 0x15120f,
    glow: 0x6b3416,
    glowStrength: 0.85,
    key: 0xffb070,
    keyIntensity: 4.2,
    rim: 0xffd2a0,
    rimIntensity: 3.2,
    fill: 0.35,
    env: 0.45,
    shadow: 0.45,
  },
  light: {
    background: 0xf5f7f6,
    glow: 0xdfe5e2,
    glowStrength: 0.9,
    key: 0xffffff,
    keyIntensity: 3,
    rim: 0xffffff,
    rimIntensity: 1.2,
    fill: 1.2,
    env: 1,
    shadow: 0.16,
  },
};

export interface Studio {
  setTheme(theme: Theme): void;
  /** Advances a theme transition; returns true while it still needs frames. */
  update(dtSeconds: number): boolean;
  dispose(): void;
}

const hex = (n: number) => `#${n.toString(16).padStart(6, "0")}`;

export function createStudio(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  theme: Theme,
  quality: QualityLevel,
  floorParent: THREE.Object3D,
  floorY: number,
): Studio {
  const transition = new StudioTransition(LOOKS[theme]);

  // Background: base colour with a soft glow from the lower left, painted on a small canvas.
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 256;
  const background = new THREE.CanvasTexture(canvas);
  background.colorSpace = THREE.SRGBColorSpace;
  scene.background = background;

  const hemi = new THREE.HemisphereLight(0xffffff, 0x2a2420, 1);
  const key = new THREE.DirectionalLight(0xffffff, 1);
  key.position.set(-70, 95, 60);
  key.castShadow = quality > 0;
  key.shadow.mapSize.set(quality === 2 ? 2048 : 1024, quality === 2 ? 2048 : 1024);
  Object.assign(key.shadow.camera, { left: -55, right: 55, top: 70, bottom: -40, near: 10, far: 300 });
  key.shadow.bias = -0.0004;
  key.shadow.radius = 6;
  const rim = new THREE.DirectionalLight(0xffffff, 1);
  rim.position.set(80, 50, -90);
  scene.add(hemi, key, rim);

  const floorMaterial = new THREE.ShadowMaterial({ opacity: 0.3 });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), floorMaterial);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = floorY;
  floor.receiveShadow = true;
  floorParent.add(floor);

  let envTexture: THREE.Texture | null = null;
  if (quality > 0) {
    const pmrem = new THREE.PMREMGenerator(renderer);
    envTexture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();
    scene.environment = envTexture;
  }

  function apply(v: StudioValues) {
    const c = canvas.getContext("2d")!;
    c.fillStyle = hex(v.background);
    c.fillRect(0, 0, 256, 256);
    const g = c.createRadialGradient(20, 236, 0, 20, 236, 230);
    g.addColorStop(0, hex(v.glow));
    g.addColorStop(1, hex(v.background));
    c.globalAlpha = v.glowStrength;
    c.fillStyle = g;
    c.fillRect(0, 0, 256, 256);
    c.globalAlpha = 1;
    background.needsUpdate = true;

    key.color.setHex(v.key);
    key.intensity = v.keyIntensity;
    rim.color.setHex(v.rim);
    rim.intensity = v.rimIntensity;
    hemi.intensity = v.fill;
    scene.environmentIntensity = v.env;
    floorMaterial.opacity = v.shadow;
  }
  apply(transition.current);

  // Repaint only while a theme change is under way; scrolling frames skip it.
  let changing = false;

  return {
    setTheme(next) {
      transition.start(LOOKS[next]);
      changing = true;
    },
    update(dtSeconds) {
      if (!changing) return false;
      changing = transition.step(dtSeconds * 1000);
      apply(transition.current);
      return changing;
    },
    dispose() {
      background.dispose();
      floor.geometry.dispose();
      floorMaterial.dispose();
      envTexture?.dispose();
      key.shadow.map?.dispose();
    },
  };
}
