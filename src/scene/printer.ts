import * as THREE from "three";
import type { ExplodablePart } from "./explode.ts";
import type { PartId } from "./parts.ts";
import type { QualityLevel } from "./quality.ts";

export interface PrinterPart extends ExplodablePart {
  id: PartId;
  object: THREE.Group;
  /** Where the part's label points, in the part's local space. */
  labelAnchor: THREE.Vector3;
}

export interface Printer {
  root: THREE.Group;
  parts: PrinterPart[];
  /** Tip of the nozzle; the print job follows it. */
  nozzle: THREE.Object3D;
  /** Top of the print sheet, where printed objects stand. */
  bedSurface: THREE.Object3D;
  /** Filament from the spool to the print head; hidden while exploded. */
  filament: THREE.Object3D;
  /** Moves the print head across the X axis and the bed along Y (in cm, relative). */
  setToolPosition(x: number, y: number, z: number): void;
  dispose(): void;
}

// A classic "bedslinger" desktop printer, in centimetres. It follows the common
// layout of open designs without copying any one brand.
const BASE = { w: 44, h: 6, d: 36 };
const UPRIGHT_X = 18.5;
const FRAME_Z = -5;
const FRAME_TOP = 50;
const BED_Y = 9;
const GANTRY_Y = 26;

function materials() {
  const pei = new THREE.MeshPhysicalMaterial({ color: 0x1c1c1e, roughness: 0.72, metalness: 0.05, clearcoat: 0.25 });
  return {
    frame: new THREE.MeshStandardMaterial({ color: 0x1d2024, metalness: 0.7, roughness: 0.38 }),
    steel: new THREE.MeshStandardMaterial({ color: 0xc9cdd2, metalness: 1, roughness: 0.22 }),
    alu: new THREE.MeshStandardMaterial({ color: 0xa9aeb4, metalness: 1, roughness: 0.32 }),
    bed: new THREE.MeshStandardMaterial({ color: 0xb48c42, metalness: 0.9, roughness: 0.33 }),
    pei,
    plastic: new THREE.MeshStandardMaterial({ color: 0x24272b, metalness: 0.1, roughness: 0.48 }),
    accent: new THREE.MeshStandardMaterial({ color: 0xff6a1a, metalness: 0.05, roughness: 0.45 }),
    motor: new THREE.MeshStandardMaterial({ color: 0x141517, metalness: 0.35, roughness: 0.42 }),
    belt: new THREE.MeshStandardMaterial({ color: 0x0c0c0d, metalness: 0, roughness: 0.92 }),
    rubber: new THREE.MeshStandardMaterial({ color: 0x101010, metalness: 0, roughness: 0.85 }),
    spool: new THREE.MeshStandardMaterial({ color: 0x1b1c1e, metalness: 0.05, roughness: 0.4 }),
    filament: new THREE.MeshStandardMaterial({ color: 0xe9e4d8, metalness: 0, roughness: 0.36 }),
    brass: new THREE.MeshStandardMaterial({ color: 0xc8a046, metalness: 1, roughness: 0.28 }),
    screen: new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffffff, emissiveIntensity: 1, roughness: 0.25 }),
  };
}

type Materials = ReturnType<typeof materials>;

export function buildPrinter(quality: QualityLevel): Printer {
  const m = materials();
  const geometries: THREE.BufferGeometry[] = [];
  const textures: THREE.Texture[] = [];
  const root = new THREE.Group();
  const parts: PrinterPart[] = [];

  function track<G extends THREE.BufferGeometry>(g: G): G {
    geometries.push(g);
    return g;
  }

  function mesh(parent: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material, x = 0, y = 0, z = 0) {
    const o = new THREE.Mesh(track(geometry), material);
    o.position.set(x, y, z);
    o.castShadow = true;
    o.receiveShadow = true;
    parent.add(o);
    return o;
  }

  const box = (p: THREE.Object3D, w: number, h: number, d: number, mat: THREE.Material, x = 0, y = 0, z = 0) =>
    mesh(p, new THREE.BoxGeometry(w, h, d), mat, x, y, z);

  function rod(p: THREE.Object3D, r: number, length: number, mat: THREE.Material, axis: "x" | "y" | "z", x = 0, y = 0, z = 0) {
    const o = mesh(p, new THREE.CylinderGeometry(r, r, length, quality === 2 ? 24 : 12), mat, x, y, z);
    if (axis === "x") o.rotation.z = Math.PI / 2;
    if (axis === "z") o.rotation.x = Math.PI / 2;
    return o;
  }

  function part(id: PartId, explodeDir: [number, number, number], labelAnchor: [number, number, number]) {
    const object = new THREE.Group();
    root.add(object);
    const p: PrinterPart = {
      id,
      object,
      home: new THREE.Vector3(),
      explodeDir: new THREE.Vector3(...explodeDir),
      labelAnchor: new THREE.Vector3(...labelAnchor),
    };
    parts.push(p);
    return object;
  }

  /** 2020-style aluminium profile with slots on each face. */
  function profile(p: THREE.Object3D, length: number, axis: "x" | "y", x: number, y: number, z: number) {
    if (quality < 2) {
      const o = box(p, axis === "x" ? length : 2.4, axis === "y" ? length : 2.4, 2.4, m.frame, x, y, z);
      return o;
    }
    const s = 1.2;
    const slot = 0.32;
    const shape = new THREE.Shape();
    // Square outline with a slot cut into the middle of each side.
    const pts: [number, number][] = [
      [-s, -s], [-slot, -s], [-slot, -s + 0.45], [slot, -s + 0.45], [slot, -s],
      [s, -s], [s, -slot], [s - 0.45, -slot], [s - 0.45, slot], [s, slot],
      [s, s], [slot, s], [slot, s - 0.45], [-slot, s - 0.45], [-slot, s],
      [-s, s], [-s, slot], [-s + 0.45, slot], [-s + 0.45, -slot], [-s, -slot],
    ];
    shape.moveTo(...pts[0]);
    pts.slice(1).forEach((pt) => shape.lineTo(...pt));
    const geometry = new THREE.ExtrudeGeometry(shape, { depth: length, bevelEnabled: true, bevelSize: 0.08, bevelThickness: 0.08, bevelSegments: 1 });
    geometry.translate(0, 0, -length / 2);
    const o = mesh(p, geometry, m.frame, x, y, z);
    if (axis === "y") o.rotation.x = Math.PI / 2;
    if (axis === "x") o.rotation.y = Math.PI / 2;
    return o;
  }

  /** NEMA 17 stepper motor. */
  function motor(p: THREE.Object3D, x: number, y: number, z: number, facing: "x" | "y" | "z") {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    if (facing === "x") g.rotation.z = Math.PI / 2;
    if (facing === "z") g.rotation.x = Math.PI / 2;
    p.add(g);
    box(g, 4.2, 4, 4.2, m.motor);
    box(g, 4.25, 0.5, 4.25, m.alu, 0, 2.1, 0);
    box(g, 4.25, 0.5, 4.25, m.alu, 0, -2.1, 0);
    if (quality === 2) for (let i = -1; i <= 1; i++) box(g, 4.3, 0.12, 4.3, m.alu, 0, i * 0.9, 0);
    rod(g, 0.25, 1.6, m.steel, "y", 0, 3, 0);
    return g;
  }

  function belt(p: THREE.Object3D, from: THREE.Vector3, to: THREE.Vector3) {
    const length = from.distanceTo(to);
    const o = box(p, length, 0.15, 0.6, m.belt);
    o.position.copy(from).add(to).multiplyScalar(0.5);
    o.lookAt(to);
    o.rotateY(Math.PI / 2);
    return o;
  }

  function screenTexture() {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 128;
    const c = canvas.getContext("2d")!;
    c.fillStyle = "#06171b";
    c.fillRect(0, 0, 256, 128);
    c.fillStyle = "#3cc2b0";
    c.font = "600 22px Inter, sans-serif";
    c.fillText("3D Care", 18, 38);
    c.fillStyle = "#9fb3ad";
    c.font = "15px Inter, sans-serif";
    c.fillText("easy-grip-mug.gcode", 18, 66);
    c.fillStyle = "#1f3a3f";
    c.fillRect(18, 86, 220, 10);
    c.fillStyle = "#f5c400";
    c.fillRect(18, 86, 132, 10);
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    textures.push(t);
    return t;
  }

  // Base with electronics, feet and the Y axis.
  const base = part("base", [0, -12, 0], [-BASE.w / 2 + 4, BASE.h, BASE.d / 2]);
  box(base, BASE.w, BASE.h, BASE.d, m.frame, 0, BASE.h / 2 + 1, 0);
  for (const [fx, fz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) {
    mesh(base, new THREE.CylinderGeometry(1.4, 1.6, 1, 16), m.rubber, fx * (BASE.w / 2 - 3), 0.5, fz * (BASE.d / 2 - 3));
  }
  rod(base, 0.4, BASE.d - 2, m.steel, "z", -6, BASE.h + 1.6, 0);
  rod(base, 0.4, BASE.d - 2, m.steel, "z", 6, BASE.h + 1.6, 0);
  motor(base, 0, BASE.h - 0.5, -BASE.d / 2 + 2.6, "z");
  if (quality > 0) belt(base, new THREE.Vector3(0, BASE.h + 1.2, -BASE.d / 2 + 4), new THREE.Vector3(0, BASE.h + 1.2, BASE.d / 2 - 2));
  if (quality === 2) for (let i = 0; i < 9; i++) box(base, 0.3, 2.6, 6, m.alu, BASE.w / 2 - 0.1, 3.8, -8 + i * 1.6 - 4);

  // Control screen on the front right.
  const display = part("display", [8, -6, 16], [BASE.w / 2 - 7, 7, BASE.d / 2 + 2]);
  const panel = box(display, 11, 6, 2.2, m.plastic, BASE.w / 2 - 7, 4.4, BASE.d / 2 + 0.6);
  panel.rotation.x = -0.35;
  const screen = new THREE.Mesh(track(new THREE.PlaneGeometry(8.4, 4.2)), m.screen.clone());
  (screen.material as THREE.MeshStandardMaterial).emissiveMap = screenTexture();
  screen.position.set(0, 0.2, 1.12);
  panel.add(screen);
  if (quality > 0) mesh(panel, new THREE.CylinderGeometry(0.7, 0.7, 0.8, 20), m.alu, 4.4, -1.6, 1.2).rotation.x = Math.PI / 2;

  // Heated bed with its carriage, levelling knobs and print sheet.
  const bed = part("bed", [0, -3, 18], [-12, BED_Y + 1.2, 12]);
  box(bed, 20, 0.6, 20, m.alu, 0, BED_Y - 1.2, 0);
  box(bed, 26, 0.5, 26, m.bed, 0, BED_Y, 0);
  box(bed, 25, 0.18, 25, m.pei, 0, BED_Y + 0.34, 0);
  for (const [kx, kz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) {
    mesh(bed, new THREE.CylinderGeometry(1, 1, 1.2, quality === 2 ? 24 : 10), m.accent, kx * 11.5, BED_Y - 1.1, kz * 11.5);
  }
  const bedSurface = new THREE.Object3D();
  bedSurface.position.set(0, BED_Y + 0.44, 0);
  bed.add(bedSurface);

  // Frame: two uprights, top bar, Z motors and lead screws.
  const frame = part("frame", [0, 4, -18], [UPRIGHT_X, FRAME_TOP, FRAME_Z]);
  const uprightH = FRAME_TOP - BASE.h;
  profile(frame, uprightH, "y", -UPRIGHT_X, BASE.h + uprightH / 2, FRAME_Z);
  profile(frame, uprightH, "y", UPRIGHT_X, BASE.h + uprightH / 2, FRAME_Z);
  profile(frame, UPRIGHT_X * 2 + 2.4, "x", 0, FRAME_TOP + 1.2, FRAME_Z);
  motor(frame, -UPRIGHT_X + 3.2, BASE.h + 3, FRAME_Z, "y");
  motor(frame, UPRIGHT_X - 3.2, BASE.h + 3, FRAME_Z, "y");
  rod(frame, 0.4, uprightH - 6, m.brass, "y", -UPRIGHT_X + 3.2, BASE.h + uprightH / 2 + 3, FRAME_Z);
  rod(frame, 0.4, uprightH - 6, m.brass, "y", UPRIGHT_X - 3.2, BASE.h + uprightH / 2 + 3, FRAME_Z);

  // Gantry: X rods, X ends with the X motor and belt. Moves with the print head in Z.
  const gantry = part("gantry", [0, 8, 6], [-UPRIGHT_X + 3, GANTRY_Y + 3, FRAME_Z + 2]);
  const gantryBody = new THREE.Group();
  gantry.add(gantryBody);
  rod(gantryBody, 0.4, UPRIGHT_X * 2 - 4, m.steel, "x", 0, GANTRY_Y + 1.5, FRAME_Z + 2);
  rod(gantryBody, 0.4, UPRIGHT_X * 2 - 4, m.steel, "x", 0, GANTRY_Y - 1.5, FRAME_Z + 2);
  box(gantryBody, 5, 6.5, 4, m.plastic, -UPRIGHT_X + 3.2, GANTRY_Y, FRAME_Z + 1);
  box(gantryBody, 5, 6.5, 4, m.plastic, UPRIGHT_X - 3.2, GANTRY_Y, FRAME_Z + 1);
  motor(gantryBody, -UPRIGHT_X + 3.2, GANTRY_Y, FRAME_Z - 2.6, "z");
  if (quality > 0) {
    belt(gantryBody, new THREE.Vector3(-UPRIGHT_X + 4, GANTRY_Y + 0.6, FRAME_Z + 3.4), new THREE.Vector3(UPRIGHT_X - 4, GANTRY_Y + 0.6, FRAME_Z + 3.4));
    belt(gantryBody, new THREE.Vector3(-UPRIGHT_X + 4, GANTRY_Y - 0.6, FRAME_Z + 3.4), new THREE.Vector3(UPRIGHT_X - 4, GANTRY_Y - 0.6, FRAME_Z + 3.4));
  }

  // Print head: carriage, heat sink, heater block, nozzle, cooling fan and shroud.
  const head = part("head", [0, 6, 24], [3.5, GANTRY_Y + 5, FRAME_Z + 7]);
  const headBody = new THREE.Group();
  headBody.position.set(0, GANTRY_Y, FRAME_Z + 4.6);
  head.add(headBody);
  box(headBody, 6.4, 7.6, 2.2, m.plastic, 0, 0, 0);
  box(headBody, 6.6, 4.8, 3.2, m.accent, 0, -1.4, 2.6);
  const fanRing = mesh(headBody, new THREE.TorusGeometry(1.75, 0.22, 10, quality === 2 ? 40 : 20), m.plastic, 0, -1.2, 4.3);
  fanRing.rotation.set(0, 0, 0);
  if (quality === 2) {
    for (let i = 0; i < 7; i++) {
      const blade = box(headBody, 0.3, 1.5, 0.08, m.plastic, 0, -1.2, 4.2);
      blade.rotation.z = (i / 7) * Math.PI * 2;
      blade.translateY(0.75);
    }
    for (let i = 0; i < 6; i++) mesh(headBody, new THREE.CylinderGeometry(1.1, 1.1, 0.12, 24), m.alu, 0, -4.4 - i * 0.32, 1.2);
  } else {
    mesh(headBody, new THREE.CylinderGeometry(1.1, 1.1, 1.8, 12), m.alu, 0, -5.2, 1.2);
  }
  box(headBody, 2, 1.2, 1.6, m.alu, 0, -6.9, 1.2);
  mesh(headBody, new THREE.ConeGeometry(0.42, 0.9, 16), m.brass, 0, -7.95, 1.2).rotation.x = Math.PI;
  const nozzle = new THREE.Object3D();
  nozzle.position.set(0, -8.4, 1.2);
  headBody.add(nozzle);

  // Spool on a holder on top of the frame.
  const spool = part("spool", [0, 9, -12], [7, FRAME_TOP + 13, FRAME_Z - 4]);
  const spoolY = FRAME_TOP + 9;
  const spoolZ = FRAME_Z - 3;
  box(spool, 1.4, 7, 1.4, m.plastic, 0, FRAME_TOP + 5.5, FRAME_Z);
  const flangeSegments = quality === 2 ? 56 : 28;
  for (const dz of [-2.9, 2.9]) mesh(spool, new THREE.CylinderGeometry(7.2, 7.2, 0.4, flangeSegments), m.spool, 0, spoolY, spoolZ + dz).rotation.x = Math.PI / 2;
  mesh(spool, new THREE.CylinderGeometry(6.3, 6.3, 5.4, flangeSegments), m.filament, 0, spoolY, spoolZ).rotation.x = Math.PI / 2;
  if (quality === 2) for (let i = 0; i < 12; i++) mesh(spool, new THREE.TorusGeometry(6.32, 0.08, 6, 56), m.filament, 0, spoolY, spoolZ - 2.4 + i * 0.44);

  // Filament path from the spool to the print head.
  const path = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, spoolY - 6.4, spoolZ + 1),
    new THREE.Vector3(2, FRAME_TOP + 2, FRAME_Z + 4),
    new THREE.Vector3(1, GANTRY_Y + 12, FRAME_Z + 6),
    new THREE.Vector3(0, GANTRY_Y + 3.8, FRAME_Z + 4.6),
  ]);
  const filament = mesh(root, new THREE.TubeGeometry(path, 48, 0.09, 6), m.filament);
  filament.castShadow = false;

  parts.forEach((p) => p.home.copy(p.object.position));

  return {
    root,
    parts,
    nozzle,
    bedSurface,
    filament,
    setToolPosition(x, y, z) {
      headBody.position.x = x;
      bed.children.forEach((c) => (c.position.z = (c.userData.z ??= c.position.z) + y));
      gantryBody.position.y = z;
      headBody.position.y = GANTRY_Y + z;
    },
    dispose() {
      geometries.forEach((g) => g.dispose());
      textures.forEach((t) => t.dispose());
      Object.values(m as Materials).forEach((mat) => mat.dispose());
      (screen.material as THREE.Material).dispose();
    },
  };
}
