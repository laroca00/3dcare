// A giant glowing line behind the hero object, like a poster the mug passes in
// front of. It is drawn straight after the background, before anything else,
// so the whole scene stays in front of it. The same line is in the page as
// text; this is only its picture.
import * as THREE from "three";
import type { Theme } from "../theme/theme";

/** Its own layer keeps it out of the contact shadow, the floor reflection and the blur's depth pass. */
export const TYPE_LAYER = 3;

const FONT = '800 {size}px "Inter Variable", Inter, system-ui, sans-serif';

const STYLE: Record<Theme, { color: string; glow: string; blur: number }> = {
  dark: { color: "#e6fffa", glow: "#22c8b1", blur: 0.22 },
  light: { color: "#00756a", glow: "rgba(0, 117, 106, 0.5)", blur: 0.14 },
};

export interface GiantType {
  object: THREE.Mesh;
  /**
   * Places the line `behind` units beyond `target` as seen from the camera,
   * filling most of the view's width; amount 0..1 fades it in, rising a little.
   */
  update(camera: THREE.PerspectiveCamera, target: THREE.Vector3, behind: number, amount: number, wide: boolean): void;
  setTheme(theme: Theme): void;
  dispose(): void;
}

export async function createGiantType(text: string, theme: Theme): Promise<GiantType> {
  // The page's own font, once it is ready (it usually is already).
  await document.fonts?.load(FONT.replace("{size}", "100"), text).catch(() => undefined);

  const canvas = document.createElement("canvas");
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    // Kept in the opaque list so that, with the lowest render order, it is drawn first;
    // custom blending still lets the glow fade into the background.
    transparent: false,
    blending: THREE.CustomBlending,
    blendSrc: THREE.SrcAlphaFactor,
    blendDst: THREE.OneMinusSrcAlphaFactor,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
  });
  const object = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), material);
  object.renderOrder = -100;
  object.layers.set(TYPE_LAYER);
  object.frustumCulled = false;
  object.visible = false;

  let style = STYLE[theme];
  let lines = 0;

  /** Paints the line on one row (wide screens) or two (narrow ones). */
  function paint(rows: number) {
    lines = rows;
    const words = text.split(" ");
    const split = Math.ceil(words.length / 2);
    const parts = rows === 1 || words.length < 2 ? [text] : [words.slice(0, split).join(" "), words.slice(split).join(" ")];
    const ctx = canvas.getContext("2d")!;
    // Fit the longest row to the width, leaving room for the glow.
    ctx.font = FONT.replace("{size}", "100");
    const widest = Math.max(...parts.map((p) => ctx.measureText(p).width));
    canvas.width = 2048;
    const size = Math.floor((100 * canvas.width * 0.84) / widest);
    const lineHeight = size * 0.98;
    canvas.height = Math.ceil(lineHeight * parts.length + size * 0.7);
    ctx.font = FONT.replace("{size}", String(size));
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const top = canvas.height / 2 - (lineHeight * (parts.length - 1)) / 2;
    // A wide soft glow first, then the letters crisp on top.
    ctx.fillStyle = style.color;
    ctx.shadowColor = style.glow;
    for (const blur of [style.blur * size, style.blur * size * 0.35]) {
      ctx.shadowBlur = blur;
      parts.forEach((part, i) => ctx.fillText(part, canvas.width / 2, top + i * lineHeight));
    }
    ctx.shadowBlur = 0;
    parts.forEach((part, i) => ctx.fillText(part, canvas.width / 2, top + i * lineHeight));
    texture.needsUpdate = true;
  }

  const toTarget = new THREE.Vector3();
  const up = new THREE.Vector3();

  return {
    object,
    update(camera, target, behind, amount, wide) {
      object.visible = amount > 0.001;
      if (!object.visible) return;
      if (lines !== (wide ? 1 : 2)) paint(wide ? 1 : 2);
      toTarget.copy(target).sub(camera.position).normalize();
      object.position.copy(target).addScaledVector(toTarget, behind);
      const distance = object.position.distanceTo(camera.position);
      const viewWidth = 2 * distance * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect;
      const width = viewWidth * (wide ? 0.92 : 0.96);
      const height = (width * canvas.height) / canvas.width;
      object.scale.set(width, height, 1);
      object.quaternion.copy(camera.quaternion);
      // It rises into place as it fades in.
      up.set(0, 1, 0).applyQuaternion(camera.quaternion);
      object.position.addScaledVector(up, -(1 - amount) * height * 0.12);
      material.opacity = amount;
    },
    setTheme(next) {
      style = STYLE[next];
      if (lines) paint(lines);
    },
    dispose() {
      texture.dispose();
      material.dispose();
      object.geometry.dispose();
    },
  };
}
