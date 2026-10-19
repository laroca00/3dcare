import * as THREE from "three";
import type { Theme } from "../theme/theme";

export interface Steam {
  /** On its own layer, so the depth-of-field pass does not see it. */
  object: THREE.Group;
  /**
   * Places the wisps above `top` (world space). `amount` 0..1 fades them in,
   * `seconds` drives the rising loop.
   */
  update(top: THREE.Vector3, amount: number, seconds: number): void;
  setTheme(theme: Theme): void;
  dispose(): void;
}

/** Layer for the steam, which the depth-of-field pass should not see. */
export const STEAM_LAYER = 1;

const WISPS = 4;
const COLORS: Record<Theme, { color: number; opacity: number }> = {
  dark: { color: 0xffffff, opacity: 0.32 },
  light: { color: 0x5f726c, opacity: 0.75 },
};

/** Soft, tall wisps of steam rising from the coffee. */
export function createSteam(theme: Theme): Steam {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 128;
  const c = canvas.getContext("2d")!;
  const g = c.createRadialGradient(32, 64, 0, 32, 64, 32);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  c.setTransform(1, 0, 0, 2, 0, -64);
  c.fillStyle = g;
  c.fillRect(0, 0, 64, 128);
  const texture = new THREE.CanvasTexture(canvas);

  const object = new THREE.Group();
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false });
  const wisps = Array.from({ length: WISPS }, () => {
    const sprite = new THREE.Sprite(material.clone());
    sprite.layers.set(STEAM_LAYER);
    object.add(sprite);
    return sprite;
  });
  let look = COLORS[theme];

  function setTheme(next: Theme) {
    look = COLORS[next];
    wisps.forEach((w) => w.material.color.setHex(look.color));
  }
  setTheme(theme);

  return {
    object,
    update(top, amount, seconds) {
      object.visible = amount > 0;
      wisps.forEach((w, i) => {
        const phase = (seconds * 0.3 + i / WISPS) % 1;
        w.position.set(top.x + Math.sin(phase * 5 + i * 2) * 0.9, top.y - 0.5 + phase * 8, top.z + Math.cos(i * 2.4) * 1.2);
        w.scale.set(2.5 + phase * 3, 4 + phase * 5, 1);
        w.material.opacity = amount * look.opacity * Math.sqrt(Math.sin(Math.PI * phase));
      });
    },
    setTheme,
    dispose() {
      texture.dispose();
      material.dispose();
      wisps.forEach((w) => w.material.dispose());
    },
  };
}
