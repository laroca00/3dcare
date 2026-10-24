// The opening desk: a self-healing cutting mat under the printer's drawing,
// with a pencil and a steel ruler, seen from above as the story begins. The
// project's wordmark is printed large along the mat's edge, as mats carry
// their maker's name. Everything is painted on canvases; no image files.
import * as THREE from "three";
import type { Theme } from "../theme/theme";

/** Mat size in cm (the scene's units): large enough to fill the screen from above, like a big studio mat. */
const MAT_W = 250;
const MAT_D = 180;
/** Canvas pixels per cm. */
const PX = 6;
/** The mat sits right of the middle, so the wooden desk shows under the opening text on the left. */
const MAT_X = 70;
const MAT_Z = 10;

const MAT: Record<Theme, { base: string; minor: string; major: string; text: string; mark: string }> = {
  dark: { base: "#10302b", minor: "rgba(150, 230, 210, 0.10)", major: "rgba(150, 230, 210, 0.24)", text: "rgba(170, 240, 225, 0.5)", mark: "rgba(160, 235, 220, 0.12)" },
  light: { base: "#c9d8d1", minor: "rgba(0, 80, 70, 0.10)", major: "rgba(0, 80, 70, 0.24)", text: "rgba(0, 80, 70, 0.55)", mark: "rgba(0, 90, 80, 0.12)" },
};

export interface Desk {
  object: THREE.Group;
  /** 0..1: the desk fades out as the drawing becomes the printer. The caller keeps it square to the view. */
  setAmount(amount: number): void;
  setTheme(theme: Theme): void;
  dispose(): void;
}

function paintMat(canvas: HTMLCanvasElement, theme: Theme) {
  const style = MAT[theme];
  canvas.width = MAT_W * PX;
  canvas.height = MAT_D * PX;
  const c = canvas.getContext("2d")!;
  c.fillStyle = style.base;
  c.fillRect(0, 0, canvas.width, canvas.height);
  // The wordmark, large and faint along the bottom edge, at the right.
  c.fillStyle = style.mark;
  c.font = `800 ${34 * PX}px "Inter Variable", Inter, system-ui, sans-serif`;
  c.textBaseline = "alphabetic";
  c.textAlign = "right";
  c.fillText("3D CARE", (MAT_W - 6) * PX, (MAT_D - 6) * PX);
  c.textAlign = "left";
  // A 1 cm grid, every fifth line stronger, numbered along two edges.
  const margin = 3;
  for (let cm = margin; cm <= MAT_W - margin; cm++) {
    const major = (cm - margin) % 5 === 0;
    c.strokeStyle = major ? style.major : style.minor;
    c.lineWidth = major ? 1.6 : 1;
    c.beginPath();
    c.moveTo(cm * PX, margin * PX);
    c.lineTo(cm * PX, (MAT_D - margin) * PX);
    c.stroke();
  }
  for (let cm = margin; cm <= MAT_D - margin; cm++) {
    const major = (cm - margin) % 5 === 0;
    c.strokeStyle = major ? style.major : style.minor;
    c.lineWidth = major ? 1.6 : 1;
    c.beginPath();
    c.moveTo(margin * PX, cm * PX);
    c.lineTo((MAT_W - margin) * PX, cm * PX);
    c.stroke();
  }
  c.fillStyle = style.text;
  c.font = `600 ${1.3 * PX}px "Inter Variable", Inter, system-ui, sans-serif`;
  c.textAlign = "center";
  for (let cm = 10; cm <= MAT_W - 2 * margin; cm += 10) c.fillText(String(cm), (cm + margin) * PX, 2.2 * PX);
  c.textAlign = "right";
  c.textBaseline = "middle";
  for (let cm = 10; cm <= MAT_D - 2 * margin; cm += 10) c.fillText(String(cm), 2.6 * PX, (cm + margin) * PX);
  // A 45° guide in one corner, as on real mats.
  c.strokeStyle = style.major;
  c.lineWidth = 1.6;
  c.beginPath();
  c.moveTo((MAT_W - margin - 30) * PX, margin * PX);
  c.lineTo((MAT_W - margin) * PX, (margin + 30) * PX);
  c.stroke();
}

/** Warm oak with long, slightly wavy grain, painted once. */
function paintWood(canvas: HTMLCanvasElement) {
  canvas.width = 1800;
  canvas.height = 1200;
  const c = canvas.getContext("2d")!;
  const g = c.createLinearGradient(0, 0, 1800, 1200);
  g.addColorStop(0, "#8a5a32");
  g.addColorStop(1, "#6e4424");
  c.fillStyle = g;
  c.fillRect(0, 0, 1800, 1200);
  for (let i = 0; i < 420; i++) {
    const y = (i * 2.86) % 1200;
    const tone = (i * 37) % 7;
    c.strokeStyle = tone < 3 ? `rgba(60, 32, 14, ${0.08 + tone * 0.03})` : `rgba(200, 150, 100, ${0.04 + (tone - 3) * 0.02})`;
    c.lineWidth = 1 + (i % 3);
    c.beginPath();
    for (let x = 0; x <= 1800; x += 60) c.lineTo(x, y + Math.sin(x / 260 + i * 0.7) * 6 + Math.sin(x / 70 + i) * 1.5);
    c.stroke();
  }
}

/** Millimetre ticks on a steel ruler, 30 cm long. */
function paintRuler(canvas: HTMLCanvasElement) {
  canvas.width = 1200;
  canvas.height = 120;
  const c = canvas.getContext("2d")!;
  c.fillStyle = "#c9ced2";
  c.fillRect(0, 0, 1200, 120);
  c.fillStyle = "#2a2f33";
  for (let mm = 0; mm <= 300; mm++) {
    const x = 0 + mm * 4;
    const length = mm % 10 === 0 ? 46 : mm % 5 === 0 ? 30 : 18;
    c.fillRect(x, 0, 1.5, length);
  }
  c.font = "600 22px Inter, system-ui, sans-serif";
  c.textAlign = "center";
  for (let cm = 1; cm < 30; cm++) c.fillText(String(cm), cm * 40, 74);
}

export function createDesk(floorY: number, theme: Theme): Desk {
  const object = new THREE.Group();
  object.position.y = floorY;

  const matCanvas = document.createElement("canvas");
  paintMat(matCanvas, theme);
  const matTexture = new THREE.CanvasTexture(matCanvas);
  matTexture.colorSpace = THREE.SRGBColorSpace;
  matTexture.anisotropy = 8;
  const matMaterial = new THREE.MeshStandardMaterial({ map: matTexture, roughness: 0.92, metalness: 0 });
  const mat = new THREE.Mesh(new THREE.BoxGeometry(MAT_W, 0.3, MAT_D), matMaterial);
  mat.position.set(MAT_X, 0.15, MAT_Z);
  mat.receiveShadow = true;
  object.add(mat);

  // The wooden desk under the mat, reaching past every edge of the screen.
  const woodCanvas = document.createElement("canvas");
  paintWood(woodCanvas);
  const woodTexture = new THREE.CanvasTexture(woodCanvas);
  woodTexture.colorSpace = THREE.SRGBColorSpace;
  woodTexture.anisotropy = 8;
  const deskMaterial = new THREE.MeshStandardMaterial({ map: woodTexture, roughness: 0.7, metalness: 0 });
  const desk = new THREE.Mesh(new THREE.PlaneGeometry(900, 600), deskMaterial);
  desk.rotation.x = -Math.PI / 2;
  desk.position.set(MAT_X - 120, -0.02, MAT_Z);
  desk.receiveShadow = true;
  object.add(desk);

  // A yellow pencil (the project's yellow), with a ferrule and an eraser, lying at an angle.
  const pencil = new THREE.Group();
  const yellow = new THREE.MeshStandardMaterial({ color: 0xf5c400, roughness: 0.45 });
  const woodMaterial = new THREE.MeshStandardMaterial({ color: 0xe2b98a, roughness: 0.8 });
  const graphite = new THREE.MeshStandardMaterial({ color: 0x2b2d30, roughness: 0.4, metalness: 0.3 });
  const ferruleMaterial = new THREE.MeshStandardMaterial({ color: 0xc8ccd0, roughness: 0.3, metalness: 1 });
  const eraserMaterial = new THREE.MeshStandardMaterial({ color: 0xff8f7a, roughness: 0.9 });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 16, 6), yellow);
  const cone = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.42, 2.2, 6), woodMaterial);
  cone.position.y = 9.1;
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.5, 6), graphite);
  tip.position.y = 10.45;
  const ferrule = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.44, 1.2, 12), ferruleMaterial);
  ferrule.position.y = -8.6;
  const eraser = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 1, 12), eraserMaterial);
  eraser.position.y = -9.7;
  pencil.add(body, cone, tip, ferrule, eraser);
  pencil.rotation.set(0, 1.15, Math.PI / 2);
  pencil.position.set(46, 0.72, 4);

  // A 30 cm steel ruler along the front edge.
  const rulerCanvas = document.createElement("canvas");
  paintRuler(rulerCanvas);
  const rulerTexture = new THREE.CanvasTexture(rulerCanvas);
  rulerTexture.colorSpace = THREE.SRGBColorSpace;
  rulerTexture.anisotropy = 8;
  const steel = new THREE.MeshStandardMaterial({ color: 0xbfc5ca, roughness: 0.35, metalness: 0.9 });
  const rulerTop = new THREE.MeshStandardMaterial({ map: rulerTexture, roughness: 0.4, metalness: 0.6 });
  // Box faces: +x, -x, +y (top), -y, +z, -z.
  const ruler = new THREE.Mesh(new THREE.BoxGeometry(32, 0.12, 3), [steel, steel, rulerTop, steel, steel, steel]);
  ruler.rotation.y = -0.06;
  ruler.position.set(16, 0.36, 46);

  for (const mesh of [body, cone, tip, ferrule, eraser, ruler]) mesh.castShadow = true;
  object.add(pencil, ruler);

  const materials = [matMaterial, deskMaterial, yellow, woodMaterial, graphite, ferruleMaterial, eraserMaterial, steel, rulerTop];
  let opaque = true;

  return {
    object,
    setAmount(amount) {
      object.visible = amount > 0.001;
      const nowOpaque = amount >= 1;
      for (const m of materials) {
        m.opacity = amount;
        if (opaque !== nowOpaque) {
          m.transparent = !nowOpaque;
          m.needsUpdate = true;
        }
      }
      opaque = nowOpaque;
    },
    setTheme(next) {
      paintMat(matCanvas, next);
      matTexture.needsUpdate = true;
    },
    dispose() {
      object.traverse((o) => {
        if (o instanceof THREE.Mesh) o.geometry.dispose();
      });
      for (const m of materials) m.dispose();
      matTexture.dispose();
      woodTexture.dispose();
      rulerTexture.dispose();
    },
  };
}
