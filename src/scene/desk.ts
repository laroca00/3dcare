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
/** The pencil and the ruler are drawn large, so they read from above and invite a touch. */
const PENCIL_SCALE = 2.2;
const RULER_SCALE = 1.7;
/** The mat sits right of the middle, so the wooden desk shows under the opening text on the left. */
const MAT_X = 92;
const MAT_Z = -42;

const MAT: Record<Theme, { base: string; minor: string; major: string; text: string; mark: string }> = {
  dark: { base: "#10302b", minor: "rgba(150, 230, 210, 0.10)", major: "rgba(150, 230, 210, 0.24)", text: "rgba(170, 240, 225, 0.5)", mark: "rgba(160, 235, 220, 0.12)" },
  light: { base: "#c9d8d1", minor: "rgba(0, 80, 70, 0.10)", major: "rgba(0, 80, 70, 0.24)", text: "rgba(0, 80, 70, 0.55)", mark: "rgba(0, 90, 80, 0.12)" },
};

/** Something on the desk the visitor can pick up and move. */
export interface DeskItem {
  kind: "pencil" | "ruler";
  object: THREE.Object3D;
}

export interface Desk {
  object: THREE.Group;
  /** The pencil and the ruler, for pointing at and dragging. */
  items: DeskItem[];
  /** The item under the pointer (lifts a little) and the one being dragged (lifts more). */
  setHover(item: DeskItem | null): void;
  setHeld(item: DeskItem | null): void;
  /** Moves an item to a point on the desk (world coordinates); a held pencil draws as it goes. */
  moveTo(item: DeskItem, point: THREE.Vector3): void;
  /** Height of the mat's top in world coordinates, for dragging on it. */
  topY(): number;
  /** Eases the lifts; returns true while they still need frames. */
  update(dt: number): boolean;
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
  pencil.rotation.set(0, 2.25, Math.PI / 2);
  // Large on the desk, so it reads from above and invites a touch.
  pencil.scale.setScalar(PENCIL_SCALE);
  pencil.position.set(42, 0.3 + 0.42 * PENCIL_SCALE, -40);
  // The graphite tip, in the pencil's own coordinates, for drawing on the mat.
  const tipPoint = new THREE.Vector3(0, 10.7, 0);

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
  ruler.rotation.y = 0.62;
  ruler.scale.set(RULER_SCALE, 1.5, RULER_SCALE);
  ruler.position.set(66, 0.39, 40);

  // Two paper clips on the wood beside the mat.
  const clipMaterial = new THREE.MeshStandardMaterial({ color: 0xc9cdd1, roughness: 0.25, metalness: 1 });
  const clipPoints = [
    [0, 0], [0, 7], [1.1, 7.6], [2.2, 7], [2.2, 1], [1.4, 0.4], [0.6, 1], [0.6, 5.6], [1.6, 5.6], [1.6, 2],
  ].map(([x, z]) => new THREE.Vector3(x, 0, z));
  const clipCurve = new THREE.CatmullRomCurve3(clipPoints, false, "catmullrom", 0.2);
  const clipGeometry = new THREE.TubeGeometry(clipCurve, 90, 0.09, 6, false);
  const clips = [
    [-62, -48, 0.5],
    [-56, -38, -0.3],
  ].map(([x, z, turn]) => {
    const clip = new THREE.Mesh(clipGeometry, clipMaterial);
    clip.scale.setScalar(1.6);
    clip.position.set(x, 0.15, z);
    clip.rotation.y = turn;
    clip.castShadow = true;
    return clip;
  });
  object.add(...clips);

  for (const mesh of [body, cone, tip, ferrule, eraser, ruler]) mesh.castShadow = true;
  object.add(pencil, ruler);

  // Invisible handles a little larger than each item, so they are easy to grab.
  const grip = new THREE.MeshBasicMaterial({ visible: false });
  const pencilGrip = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 22, 8), grip);
  pencil.add(pencilGrip);
  const rulerGrip = new THREE.Mesh(new THREE.BoxGeometry(33, 2, 5), grip);
  ruler.add(rulerGrip);
  const items: DeskItem[] = [
    { kind: "pencil", object: pencil },
    { kind: "ruler", object: ruler },
  ];
  const rest = new Map(items.map((i) => [i, i.object.position.y]));
  const lift = new Map(items.map((i) => [i, 0]));
  let hovered: DeskItem | null = null;
  let held: DeskItem | null = null;
  // Where the pencil's tip was on the mat's canvas, while it draws.
  let lastTip: { x: number; y: number } | null = null;
  const tipWorld = new THREE.Vector3();
  const local = new THREE.Vector3();

  /** The pencil's tip on the mat's canvas, in pixels. */
  function tipOnMat() {
    pencil.updateMatrixWorld(true);
    pencil.localToWorld(tipWorld.copy(tipPoint));
    mat.worldToLocal(tipWorld);
    return { x: (tipWorld.x + MAT_W / 2) * PX, y: (tipWorld.z + MAT_D / 2) * PX };
  }

  const materials = [grip, clipMaterial, matMaterial, deskMaterial, yellow, woodMaterial, graphite, ferruleMaterial, eraserMaterial, steel, rulerTop];
  let opaque = true;

  return {
    object,
    items,
    setHover(item) {
      hovered = item;
    },
    setHeld(item) {
      held = item;
      lastTip = item?.kind === "pencil" ? tipOnMat() : null;
    },
    moveTo(item, point) {
      object.worldToLocal(local.copy(point));
      item.object.position.x = local.x;
      item.object.position.z = local.z;
      if (item !== held || item.kind !== "pencil" || !lastTip) return;
      // A soft teal pencil line on the mat, from the last tip position to this one.
      const now = tipOnMat();
      const c = matCanvas.getContext("2d")!;
      c.strokeStyle = "rgba(60, 194, 176, 0.85)";
      c.lineWidth = 0.35 * PX;
      c.lineCap = "round";
      c.beginPath();
      c.moveTo(lastTip.x, lastTip.y);
      c.lineTo(now.x, now.y);
      c.stroke();
      matTexture.needsUpdate = true;
      lastTip = now;
    },
    topY() {
      return object.position.y + 0.3;
    },
    update(dt) {
      let moving = false;
      for (const item of items) {
        const target = item === held ? 2.4 : item === hovered ? 0.9 : 0;
        const now = lift.get(item)!;
        const next = Math.abs(target - now) < 0.01 ? target : now + (target - now) * (1 - Math.exp(-12 * dt));
        lift.set(item, next);
        item.object.position.y = rest.get(item)! + next;
        moving ||= next !== target;
      }
      return moving;
    },
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
