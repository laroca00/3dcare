// A large sheet of drawing paper on the opening desk, under the printer's
// pencil sketch: warm white with a faint grain, a drawn border and a title
// block, as on a technical drawing. Sizes in cm; it lies flat, centred under
// the printer, and fades with the desk.
import * as THREE from "three";

export interface Paper {
  object: THREE.Mesh;
  setAmount(amount: number): void;
  dispose(): void;
}

/** A1 portrait: room for the printer drawn full size in front elevation. */
const W = 59.4;
const D = 84.1;
const PX = 14;

function paintPaper(canvas: HTMLCanvasElement, title: string) {
  canvas.width = Math.round(W * PX);
  canvas.height = Math.round(D * PX);
  const c = canvas.getContext("2d")!;
  const w = canvas.width;
  const h = canvas.height;
  c.fillStyle = "#f2ede2";
  c.fillRect(0, 0, w, h);
  // Paper grain: faint fibres and a soft unevenness.
  for (let i = 0; i < 6000; i++) {
    const tone = (i * 37) % 9;
    c.fillStyle = tone < 4 ? `rgba(120, 100, 70, ${0.015 + tone * 0.006})` : `rgba(255, 255, 255, ${0.03 + (tone - 4) * 0.01})`;
    c.fillRect((i * 7919) % w, (i * 104729) % h, 1 + (i % 4), 1);
  }
  const edge = c.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.75);
  edge.addColorStop(0, "rgba(0,0,0,0)");
  edge.addColorStop(1, "rgba(90,70,40,0.12)");
  c.fillStyle = edge;
  c.fillRect(0, 0, w, h);
  // A drawn border and a title block in the bottom right corner.
  const ink = "rgba(45, 48, 52, 0.75)";
  const m = 1.5 * PX;
  c.strokeStyle = ink;
  c.lineWidth = 3;
  c.strokeRect(m, m, w - 2 * m, h - 2 * m);
  const bw = 17 * PX;
  const bh = 6 * PX;
  c.lineWidth = 2;
  c.strokeRect(w - m - bw, h - m - bh, bw, bh);
  c.beginPath();
  c.moveTo(w - m - bw, h - m - bh / 2);
  c.lineTo(w - m, h - m - bh / 2);
  c.moveTo(w - m - bw * 0.4, h - m - bh / 2);
  c.lineTo(w - m - bw * 0.4, h - m);
  c.stroke();
  c.fillStyle = ink;
  c.font = `700 ${1.4 * PX}px "Inter Variable", Inter, system-ui, sans-serif`;
  c.textBaseline = "middle";
  c.fillText("3D CARE", w - m - bw + 0.8 * PX, h - m - bh * 0.75);
  c.font = `500 ${1.05 * PX}px "Inter Variable", Inter, system-ui, sans-serif`;
  c.fillText(title, w - m - bw + 0.8 * PX, h - m - bh * 0.25);
  c.fillText("1 : 5", w - m - bw * 0.4 + 0.8 * PX, h - m - bh * 0.25);
}

export function createPaper(title: string): Paper {
  const canvas = document.createElement("canvas");
  paintPaper(canvas, title);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  const material = new THREE.MeshStandardMaterial({ map: texture, roughness: 0.95, metalness: 0, transparent: true });
  const geometry = new THREE.PlaneGeometry(W, D);
  geometry.rotateX(-Math.PI / 2);
  const object = new THREE.Mesh(geometry, material);
  object.receiveShadow = true;
  // Just above the mat, so it never flickers into it.
  object.position.y = 0.42;
  return {
    object,
    setAmount(amount) {
      object.visible = amount > 0.001;
      material.opacity = amount;
    },
    dispose() {
      geometry.dispose();
      material.dispose();
      texture.dispose();
    },
  };
}
