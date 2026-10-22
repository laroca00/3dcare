import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import type { ExplodablePart } from "./explode.ts";
import type { PartId } from "./parts.ts";
import type { QualityLevel } from "./quality.ts";

export interface PrinterPart extends ExplodablePart {
  id: PartId;
  object: THREE.Group;
  /** Where the part's label points, in the part's local space. */
  labelAnchor: THREE.Vector3;
  /** Middle of the part, in printer space; the part turns around it. */
  center: THREE.Vector3;
}

export interface Printer {
  root: THREE.Group;
  parts: PrinterPart[];
  /** Tip of the nozzle; the print job follows it. */
  nozzle: THREE.Object3D;
  /** Top of the print sheet, where printed objects stand. */
  bedSurface: THREE.Object3D;
  /** Filament tube from the spool to the print head; hidden while exploded. */
  filament: THREE.Object3D;
  /** Cable bundle from the print head over the frame; hidden while exploded. */
  headCable: THREE.Object3D;
  /** The control screen, facing +z in its own space. */
  screen: THREE.Object3D;
  /** Moves the print head across the X axis and the bed along Y (in cm, relative). */
  setToolPosition(x: number, y: number, z: number): void;
  /**
   * Print job state: progress 0..1 turns the fan and the spool and fills the
   * screen's progress bar; heat 0..1 makes the hotend glow.
   */
  setPrinting(progress: number, heat: number): void;
  /** Colour of the filament on the spool. */
  setFilament(color: number): void;
  /** Signs of life while the visitor pauses: extra fan turn (radians) and a blinking cursor on screen. */
  setIdle(fanTurn: number, cursor: boolean): void;
  dispose(): void;
}

// An open-hardware "i3" desktop printer in centimetres: a moving bed on a Y
// chassis, a Z frame of black aluminium extrusions and printed parts in the
// project's teal. It follows the common layout of open designs without
// copying any one brand.
const UPRIGHT_X = 18.5;
const FRAME_Z = -5;
const FRAME_TOP = 50;
const BED_Y = 9;
const GANTRY_Y = 26;
/** Z rod and lead screw positions, measured in from each upright. */
const ROD_X = UPRIGHT_X - 2.4;
const SCREW_X = UPRIGHT_X - 5.4;
const AXIS_Z = FRAME_Z + 2.6;

/** Top of the print sheet, and the nozzle tip with the tool at home, in printer space. */
export const BED_SURFACE_Y = BED_Y + 0.44;
export const NOZZLE_HOME = { y: GANTRY_Y - 8.4, z: FRAME_Z + 8 };
/** The control screen's size in centimetres; the slicer is laid over it. */
export const SCREEN_SIZE = { width: 7.6, height: 4.2 };

/** Greyscale canvas texture for bump and roughness maps. */
function surfaceTexture(kind: "grain" | "brushed" | "layers" | "weave" | "teeth", repeat: [number, number]) {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const c = canvas.getContext("2d")!;
  const image = c.createImageData(size, size);
  let seed = 7 + kind.length;
  const random = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const rows = Array.from({ length: size }, () => random());
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let v: number;
      if (kind === "grain") v = 110 + random() * 110;
      else if (kind === "brushed") v = 140 + rows[y] * 70 + random() * 25;
      // Printed parts: rounded ridges, one per layer.
      else if (kind === "layers") v = 150 + Math.sin(((y % 4) / 4) * Math.PI) * 80 + random() * 10;
      // Braided cable sleeve.
      else if (kind === "weave") v = 120 + (((x >> 2) + (y >> 2)) % 2) * 60 + Math.sin((x + y) * 0.8) * 30;
      // Toothed belt: ridges across its length.
      else v = x % 8 < 4 ? 220 : 60;
      const i = (y * size + x) * 4;
      image.data[i] = image.data[i + 1] = image.data[i + 2] = v;
      image.data[i + 3] = 255;
    }
  }
  c.putImageData(image, 0, 0);
  const t = new THREE.CanvasTexture(canvas);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(...repeat);
  return t;
}

function materials(quality: QualityLevel) {
  const detail = quality > 0;
  const map = (kind: Parameters<typeof surfaceTexture>[0], repeat: [number, number]) => (detail ? surfaceTexture(kind, repeat) : null);
  const grain = map("grain", [6, 6]);
  const brushed = map("brushed", [1, 1]);
  const layers = map("layers", [1, 10]);
  const weave = map("weave", [12, 1]);
  const teeth = map("teeth", [40, 1]);
  return {
    // Black anodised extrusions and plates.
    frame: new THREE.MeshStandardMaterial({ color: 0x1b1e22, metalness: 0.65, roughness: 0.42, bumpMap: brushed, bumpScale: 0.25 }),
    // PETG parts printed in the project's teal; the layer lines catch the light.
    printed: new THREE.MeshPhysicalMaterial({
      color: 0x0e7f72,
      roughness: 0.55,
      metalness: 0,
      clearcoat: 0.15,
      clearcoatRoughness: 0.4,
      bumpMap: layers,
      bumpScale: 0.6,
    }),
    steel: new THREE.MeshStandardMaterial({ color: 0xd4d8dc, metalness: 1, roughness: 0.16 }),
    alu: new THREE.MeshStandardMaterial({ color: 0xaeb3b8, metalness: 1, roughness: 0.32, roughnessMap: brushed, bumpMap: brushed, bumpScale: 0.2 }),
    brass: new THREE.MeshStandardMaterial({ color: 0xc8a046, metalness: 1, roughness: 0.26 }),
    // Heated bed circuit board and the spring steel sheet with textured PEI.
    pcb: new THREE.MeshStandardMaterial({ color: 0x15171a, metalness: 0.2, roughness: 0.55 }),
    pei: new THREE.MeshStandardMaterial({ color: 0x262422, roughness: 0.82, metalness: 0.05, bumpMap: grain, bumpScale: 0.12 }),
    gold: new THREE.MeshStandardMaterial({ color: 0xc09a52, metalness: 0.9, roughness: 0.3 }),
    plastic: new THREE.MeshStandardMaterial({ color: 0x202326, metalness: 0.05, roughness: 0.5 }),
    motor: new THREE.MeshStandardMaterial({ color: 0x141517, metalness: 0.4, roughness: 0.4 }),
    belt: new THREE.MeshStandardMaterial({ color: 0x0d0d0e, metalness: 0, roughness: 0.85, bumpMap: teeth, bumpScale: 0.5 }),
    rubber: new THREE.MeshStandardMaterial({ color: 0x0f0f10, metalness: 0, roughness: 0.9 }),
    screw: new THREE.MeshStandardMaterial({ color: 0x2b2d30, metalness: 0.9, roughness: 0.35 }),
    sock: new THREE.MeshStandardMaterial({ color: 0x8c9196, metalness: 0, roughness: 0.75 }),
    cable: new THREE.MeshStandardMaterial({ color: 0x121314, metalness: 0, roughness: 0.85, bumpMap: weave, bumpScale: 0.6 }),
    ptfe: new THREE.MeshPhysicalMaterial({ color: 0xf2f4f3, roughness: 0.35, transmission: 0.4, thickness: 0.2, metalness: 0 }),
    spool: new THREE.MeshStandardMaterial({ color: 0x1b1c1e, metalness: 0.05, roughness: 0.4 }),
    filament: new THREE.MeshStandardMaterial({ color: 0x2aa898, metalness: 0, roughness: 0.32 }),
    accent: new THREE.MeshStandardMaterial({ color: 0xf5c400, metalness: 0.05, roughness: 0.45 }),
    screen: new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffffff, emissiveIntensity: 1.9, roughness: 0.25 }),
    // Hotend parts that glow while printing.
    hotBrass: new THREE.MeshStandardMaterial({ color: 0xc8a046, metalness: 1, roughness: 0.26, emissive: 0xff5a1f, emissiveIntensity: 0 }),
    hotSock: new THREE.MeshStandardMaterial({ color: 0x8c9196, metalness: 0, roughness: 0.75, emissive: 0xff5a1f, emissiveIntensity: 0 }),
  };
}

type Materials = ReturnType<typeof materials>;

export function buildPrinter(quality: QualityLevel): Printer {
  const m = materials(quality);
  const fine = quality === 2;
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

  /** Small details stay out of the opening line drawing. */
  const detail = <T extends THREE.Object3D>(o: T) => {
    o.userData.noOutline = true;
    return o;
  };

  /** Boxes get softly rounded edges at full quality, so they catch highlights like real parts. */
  function rounded(w: number, h: number, d: number, radius = Math.min(w, h, d) * 0.2) {
    if (!fine || radius < 0.05) return new THREE.BoxGeometry(w, h, d);
    return new RoundedBoxGeometry(w, h, d, 2, Math.min(radius, 0.8));
  }

  const box = (p: THREE.Object3D, w: number, h: number, d: number, mat: THREE.Material, x = 0, y = 0, z = 0, radius?: number) =>
    mesh(p, rounded(w, h, d, radius), mat, x, y, z);

  function rod(p: THREE.Object3D, r: number, length: number, mat: THREE.Material, axis: "x" | "y" | "z", x = 0, y = 0, z = 0) {
    const o = mesh(p, new THREE.CylinderGeometry(r, r, length, fine ? 24 : 12), mat, x, y, z);
    if (axis === "x") o.rotation.z = Math.PI / 2;
    if (axis === "z") o.rotation.x = Math.PI / 2;
    return o;
  }

  /** Socket head screws in a row; facing tells which way the heads point. */
  function screws(p: THREE.Object3D, points: [number, number, number][], facing: "x" | "y" | "z", sign = 1) {
    if (!fine) return;
    for (const [x, y, z] of points) {
      const head = detail(mesh(p, new THREE.CylinderGeometry(0.28, 0.28, 0.22, 14), m.screw, x, y, z));
      if (facing === "x") head.rotation.z = (Math.PI / 2) * sign;
      if (facing === "z") head.rotation.x = (Math.PI / 2) * sign;
    }
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
      center: new THREE.Vector3(),
    };
    parts.push(p);
    return object;
  }

  /** Aluminium extrusion, 2 cm square (or 2 × 4 cm), with a slot in each face. */
  function profile(p: THREE.Object3D, length: number, axis: "x" | "y" | "z", x: number, y: number, z: number, wide = false) {
    const s = 1;
    const depth = wide ? 2 : 1;
    if (!fine) return box(p, axis === "x" ? length : wide ? 4 : 2, axis === "y" ? length : 2, axis === "z" ? length : 2, m.frame, x, y, z);
    const slot = 0.3;
    const cut = 0.45;
    const shape = new THREE.Shape();
    // Outline with a slot in the middle of each 2 cm face.
    const pts: [number, number][] = [[-s, -depth]];
    const face = (cx: number) => pts.push([cx - slot, -depth], [cx - slot, -depth + cut], [cx + slot, -depth + cut], [cx + slot, -depth]);
    face(0);
    pts.push([s, -depth]);
    for (const cy of wide ? [-1, 1] : [0]) pts.push([s, cy - slot], [s - cut, cy - slot], [s - cut, cy + slot], [s, cy + slot]);
    pts.push([s, depth], [slot, depth], [slot, depth - cut], [-slot, depth - cut], [-slot, depth], [-s, depth]);
    for (const cy of wide ? [1, -1] : [0]) pts.push([-s, cy + slot], [-s + cut, cy + slot], [-s + cut, cy - slot], [-s, cy - slot]);
    shape.moveTo(...pts[0]);
    pts.slice(1).forEach((pt) => shape.lineTo(...pt));
    const geometry = new THREE.ExtrudeGeometry(shape, { depth: length, bevelEnabled: true, bevelSize: 0.06, bevelThickness: 0.06, bevelSegments: 1 });
    geometry.translate(0, 0, -length / 2);
    const o = mesh(p, geometry, m.frame, x, y, z);
    // The profile's wide side faces forward, along z, for uprights and cross bars.
    if (axis === "y") o.rotation.set(Math.PI / 2, 0, Math.PI / 2);
    if (axis === "x") o.rotation.set(0, Math.PI / 2, Math.PI / 2);
    return o;
  }

  /** NEMA 17 stepper motor with its label and connector. */
  function motor(p: THREE.Object3D, x: number, y: number, z: number, facing: "x" | "y" | "z", flip = false) {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    if (facing === "x") g.rotation.z = (Math.PI / 2) * (flip ? -1 : 1);
    if (facing === "z") g.rotation.x = (Math.PI / 2) * (flip ? -1 : 1);
    if (facing === "y" && flip) g.rotation.x = Math.PI;
    p.add(g);
    box(g, 4.2, 3.4, 4.2, m.motor, 0, 0, 0, 0.3);
    box(g, 4.25, 0.6, 4.25, m.alu, 0, 1.9, 0, 0.3);
    box(g, 4.25, 0.6, 4.25, m.alu, 0, -1.9, 0, 0.3);
    if (fine) {
      detail(box(g, 2.2, 0.8, 0.9, m.plastic, 0, -1.4, 2.4, 0.1));
      detail(mesh(g, new THREE.CylinderGeometry(1.1, 1.1, 0.25, 24), m.alu, 0, 2.3, 0));
    }
    rod(g, 0.25, 2.2, m.steel, "y", 0, 3.3, 0);
    return g;
  }

  /** A toothed belt between two points, with pulleys at both ends. */
  function belt(p: THREE.Object3D, from: THREE.Vector3, to: THREE.Vector3, axis: "x" | "z") {
    const length = from.distanceTo(to);
    const o = detail(box(p, length, 0.14, 0.6, m.belt, 0, 0, 0, 0.02));
    o.position.copy(from).add(to).multiplyScalar(0.5);
    if (axis === "z") o.rotation.y = Math.PI / 2;
    return o;
  }

  /** A square fan; returns the rotor that spins. */
  function fan(p: THREE.Object3D, size: number, x: number, y: number, z: number, facing: "x" | "z") {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    if (facing === "x") g.rotation.y = -Math.PI / 2;
    p.add(g);
    box(g, size, size, 1, m.plastic, 0, 0, 0, 0.3);
    const rotor = new THREE.Group();
    g.add(rotor);
    if (!fine) return rotor;
    const r = size * 0.42;
    detail(mesh(g, new THREE.TorusGeometry(r, 0.12, 8, 40), m.plastic, 0, 0, 0.55));
    detail(mesh(rotor, new THREE.CylinderGeometry(r * 0.35, r * 0.35, 0.3, 24), m.accent, 0, 0, 0.45)).rotation.x = Math.PI / 2;
    for (let i = 0; i < 5; i++) {
      const blade = detail(box(rotor, 0.5, r * 0.9, 0.06, m.plastic, 0, 0, 0.5, 0.02));
      blade.rotation.z = (i / 5) * Math.PI * 2;
      blade.rotation.y = 0.5;
      blade.translateY(r * 0.55);
    }
    return rotor;
  }

  function cable(p: THREE.Object3D, points: THREE.Vector3[], radius: number, material: THREE.Material) {
    const o = detail(mesh(p, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 64, radius, fine ? 10 : 6), material));
    o.castShadow = false;
    return o;
  }

  // The control screen shows the print job and its progress.
  const screenCanvas = document.createElement("canvas");
  screenCanvas.width = 256;
  screenCanvas.height = 128;
  const screenTexture = new THREE.CanvasTexture(screenCanvas);
  screenTexture.colorSpace = THREE.SRGBColorSpace;
  textures.push(screenTexture);
  let shown = "";
  let cursorOn = false;
  let idleFan = 0;
  const REAL_LAYERS = 300;
  /** The print job on screen: percentage, layer count and time left (the mug takes about two hours). */
  function drawScreen(progress: number) {
    const percent = Math.round(progress * 100);
    // The real count: a 9 cm mug in 0.3 mm layers.
    const layer = Math.min(Math.ceil(progress * REAL_LAYERS), REAL_LAYERS);
    const minutesLeft = Math.round((1 - progress) * 120);
    const key = `${percent}|${layer}|${minutesLeft}|${cursorOn}`;
    if (key === shown) return;
    shown = key;
    const c = screenCanvas.getContext("2d")!;
    c.fillStyle = "#06171b";
    c.fillRect(0, 0, 256, 128);
    c.fillStyle = "#3cc2b0";
    c.font = "600 22px Inter, sans-serif";
    c.fillText("3D Care", 18, 34);
    c.fillStyle = "#f5c400";
    c.textAlign = "right";
    c.fillText(`${percent}%`, 238, 34);
    c.textAlign = "left";
    c.fillStyle = "#9fb3ad";
    c.font = "14px Inter, sans-serif";
    c.fillText("two-handled-mug.gcode", 18, 58);
    if (cursorOn) c.fillRect(18 + c.measureText("two-handled-mug.gcode").width + 3, 47, 7, 13);
    // Layer stack icon and count, clock icon and time left.
    c.fillStyle = "#e3efec";
    c.font = "600 15px Inter, sans-serif";
    for (let i = 0; i < 3; i++) c.fillRect(18, 70 + i * 4, 12, 2);
    c.fillText(`${layer} / ${REAL_LAYERS}`, 36, 80);
    c.strokeStyle = "#e3efec";
    c.lineWidth = 1.6;
    c.beginPath();
    c.arc(150, 75, 6, 0, Math.PI * 2);
    c.moveTo(150, 75);
    c.lineTo(150, 71);
    c.moveTo(150, 75);
    c.lineTo(153, 75);
    c.stroke();
    c.fillText(`${Math.floor(minutesLeft / 60)}:${String(minutesLeft % 60).padStart(2, "0")}`, 162, 80);
    c.fillStyle = "#1f3a3f";
    c.fillRect(18, 96, 220, 10);
    c.fillStyle = "#f5c400";
    c.fillRect(18, 96, 220 * progress, 10);
    screenTexture.needsUpdate = true;
  }
  drawScreen(0);

  // Filament inside the PTFE tube, with bands that slide along as it feeds.
  const flowCanvas = document.createElement("canvas");
  flowCanvas.width = 64;
  flowCanvas.height = 4;
  const flowContext = flowCanvas.getContext("2d")!;
  flowContext.fillStyle = "#ffffff";
  flowContext.fillRect(0, 0, 64, 4);
  flowContext.fillStyle = "#9a9a9a";
  flowContext.fillRect(0, 0, 18, 4);
  const flowTexture = new THREE.CanvasTexture(flowCanvas);
  flowTexture.wrapS = flowTexture.wrapT = THREE.RepeatWrapping;
  flowTexture.repeat.set(36, 1);
  textures.push(flowTexture);
  const flowMaterial = new THREE.MeshStandardMaterial({ color: 0x2aa898, map: flowTexture, roughness: 0.35 });

  // Y chassis: two extrusions along the depth, printed front and rear plates,
  // the Y motor, belt and the rods the bed slides on.
  const base = part("base", [0, -8, 4], [-11, 5, 19]);
  for (const sx of [-1, 1]) {
    profile(base, 38, "z", sx * 11, 2.6, 0);
    detail(mesh(base, new THREE.CylinderGeometry(1.3, 1.5, 0.8, 20), m.rubber, sx * 11, 0.4, 17));
    detail(mesh(base, new THREE.CylinderGeometry(1.3, 1.5, 0.8, 20), m.rubber, sx * 11, 0.4, -17));
  }
  box(base, 26, 6.6, 2.4, m.printed, 0, 3.7, 19.6, 0.6);
  box(base, 26, 6.6, 2.4, m.printed, 0, 3.7, -19.6, 0.6);
  screws(base, [[-9, 5.6, 20.85], [9, 5.6, 20.85], [-9, 1.8, 20.85], [9, 1.8, 20.85]], "z");
  for (const sx of [-1, 1]) rod(base, 0.4, 38, m.steel, "z", sx * 7, 7.4, 0);
  motor(base, 0, 4.6, -22.2, "z");
  belt(base, new THREE.Vector3(0, 6.2, -19), new THREE.Vector3(0, 6.2, 19), "z");
  if (fine) detail(mesh(base, new THREE.CylinderGeometry(0.7, 0.7, 1.2, 20), m.alu, 0, 6.2, 18.6)).rotation.z = Math.PI / 2;

  // Control screen with its knob, on the front left.
  const display = part("display", [-22, 1, 10], [-10, 8, 24]);
  const panel = box(display, 12, 6.6, 2.6, m.plastic, -9, 4.4, 22.4, 0.5);
  panel.rotation.x = -0.3;
  const screen = new THREE.Mesh(track(new THREE.PlaneGeometry(SCREEN_SIZE.width, SCREEN_SIZE.height)), m.screen.clone());
  (screen.material as THREE.MeshStandardMaterial).emissiveMap = screenTexture;
  screen.position.set(-1.4, 0.3, 1.32);
  panel.add(screen);
  const knob = mesh(panel, new THREE.CylinderGeometry(0.9, 0.95, 1, fine ? 32 : 16), m.printed, 4.2, -0.2, 1.6);
  knob.rotation.x = Math.PI / 2;
  if (fine) detail(mesh(panel, new THREE.TorusGeometry(0.92, 0.08, 6, 32), m.accent, 4.2, -0.2, 2.1));

  // Heated bed: aluminium carriage, black circuit board and a removable
  // spring steel sheet with a textured surface and a gold edge.
  const bed = part("bed", [0, -4, 22], [-12, BED_Y + 1.2, 12]);
  box(bed, 22, 0.5, 22, m.alu, 0, BED_Y - 1.4, 0, 0.15);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) detail(box(bed, 2.2, 1.6, 3.2, m.printed, sx * 7, BED_Y - 2.2, sz * 7, 0.3));
  box(bed, 25.4, 0.32, 25.4, m.pcb, 0, BED_Y, 0, 0);
  box(bed, 25, 0.1, 25, m.gold, 0, BED_Y + 0.22, 0, 0.04);
  box(bed, 25, 0.14, 25, m.pei, 0, BED_Y + 0.36, 0, 0);
  // Tabs for lifting the sheet off.
  for (const sx of [-1, 1]) detail(box(bed, 4, 0.14, 1.4, m.pei, sx * 7, BED_Y + 0.36, 12.9, 0.3));
  cable(bed, [new THREE.Vector3(0, BED_Y - 0.4, -12.6), new THREE.Vector3(0, BED_Y - 2, -16), new THREE.Vector3(0, BED_Y - 4, -18)], 0.35, m.cable);
  const bedSurface = new THREE.Object3D();
  bedSurface.position.set(0, BED_SURFACE_Y, 0);
  bed.add(bedSurface);

  // Z frame: two 2 × 4 cm uprights joined top and bottom, printed corners,
  // Z motors, lead screws and rods, the electronics box and power supply.
  const frame = part("frame", [0, 4, -18], [UPRIGHT_X, FRAME_TOP, FRAME_Z]);
  const uprightH = FRAME_TOP;
  for (const sx of [-1, 1]) {
    profile(frame, uprightH, "y", sx * UPRIGHT_X, uprightH / 2, FRAME_Z, true);
    box(frame, 5.4, 4.6, 5.2, m.printed, sx * (UPRIGHT_X - 1.4), FRAME_TOP - 1.2, FRAME_Z + 0.6, 0.6);
    box(frame, 7.4, 3.6, 5.6, m.printed, sx * (UPRIGHT_X - 2.4), 7.6, FRAME_Z + 0.8, 0.6);
    motor(frame, sx * SCREW_X, 4.4, AXIS_Z, "y");
    rod(frame, 0.4, FRAME_TOP - 9, m.steel, "y", sx * ROD_X, 5 + (FRAME_TOP - 9) / 2 + 3, AXIS_Z);
    const screw = rod(frame, 0.4, FRAME_TOP - 10, m.brass, "y", sx * SCREW_X, 9.4 + (FRAME_TOP - 10) / 2, AXIS_Z);
    screw.userData.noOutline = true;
    screws(frame, [[sx * (UPRIGHT_X - 1.4), FRAME_TOP, FRAME_Z + 3.25], [sx * (UPRIGHT_X - 1.4), FRAME_TOP - 2.4, FRAME_Z + 3.25]], "z");
  }
  profile(frame, UPRIGHT_X * 2 + 2, "x", 0, FRAME_TOP + 1, FRAME_Z);
  profile(frame, UPRIGHT_X * 2 - 2, "x", 0, 4.6, FRAME_Z);
  // Electronics behind the left upright, power supply behind the right one.
  const electronics = box(frame, 10, 12, 3.6, m.plastic, -UPRIGHT_X + 3, 15, FRAME_Z - 3.2, 0.5);
  if (fine) for (let i = 0; i < 6; i++) detail(box(electronics, 6, 0.35, 0.2, m.frame, 0, -3.5 + i * 1.4, -1.85, 0.05));
  const psu = box(frame, 7, 13, 4.4, m.frame, UPRIGHT_X - 2.6, 11, FRAME_Z - 3.6, 0.3);
  if (fine) {
    for (let i = 0; i < 7; i++) detail(box(psu, 0.25, 9, 0.2, m.motor, -2.4 + i * 0.8, 0.6, -2.25, 0.05));
    detail(box(psu, 2.4, 1.2, 0.6, m.plastic, 0, -5.4, 2.3, 0.1));
  }
  cable(frame, [new THREE.Vector3(-UPRIGHT_X + 3, 9, FRAME_Z - 1.4), new THREE.Vector3(-UPRIGHT_X + 4, 5, FRAME_Z + 1), new THREE.Vector3(-SCREW_X, 6.4, AXIS_Z)], 0.25, m.cable);

  // Gantry: printed X ends (motor on the left, belt idler on the right), the
  // X rods and belt. It moves up and down with the print head.
  const gantry = part("gantry", [-8, 12, 12], [-UPRIGHT_X + 3, GANTRY_Y + 4, FRAME_Z + 2]);
  const gantryBody = new THREE.Group();
  gantry.add(gantryBody);
  const xEndX = (ROD_X + SCREW_X) / 2;
  for (const sx of [-1, 1]) {
    box(gantryBody, 6.6, 7.6, 5, m.printed, sx * xEndX, GANTRY_Y, AXIS_Z + 0.4, 0.7);
    // Lead screw nut.
    detail(mesh(gantryBody, new THREE.CylinderGeometry(1, 1, 0.8, 20), m.brass, sx * SCREW_X, GANTRY_Y - 4.2, AXIS_Z));
    screws(gantryBody, [[sx * xEndX - 1.8, GANTRY_Y + 2.6, AXIS_Z + 2.95], [sx * xEndX + 1.8, GANTRY_Y + 2.6, AXIS_Z + 2.95], [sx * xEndX, GANTRY_Y - 2.6, AXIS_Z + 2.95]], "z");
  }
  for (const dy of [-1.6, 1.6]) rod(gantryBody, 0.4, xEndX * 2 - 2, m.steel, "x", 0, GANTRY_Y + dy, AXIS_Z + 2.4);
  motor(gantryBody, -xEndX - 4, GANTRY_Y, AXIS_Z + 1.6, "x", true);
  // Belt tensioner knob on the right.
  mesh(gantryBody, new THREE.CylinderGeometry(0.8, 0.8, 1.2, 20), m.printed, xEndX + 3.9, GANTRY_Y, AXIS_Z + 1.6).rotation.z = Math.PI / 2;
  for (const dy of [-0.5, 0.5]) belt(gantryBody, new THREE.Vector3(-xEndX, GANTRY_Y + dy, AXIS_Z + 2.4), new THREE.Vector3(xEndX, GANTRY_Y + dy, AXIS_Z + 2.4), "x");

  // Print head: a tall printed extruder with its motor on top, a hotend fan on
  // the side, the part cooling shroud and the hotend with heater sock and nozzle.
  const head = part("head", [18, 10, 26], [3.5, GANTRY_Y + 7, FRAME_Z + 9]);
  const headBody = new THREE.Group();
  headBody.position.set(0, GANTRY_Y, FRAME_Z + 4.6);
  head.add(headBody);
  box(headBody, 6.6, 6.4, 1.4, m.printed, 0, 0, 1.8, 0.4);
  box(headBody, 5.8, 9.2, 4.6, m.printed, 0, 0.8, 4.4, 0.9);
  // Extruder door with its idler window and lever.
  box(headBody, 4.2, 5, 0.5, m.printed, 0, 1.8, 6.9, 0.25);
  if (fine) {
    const window = detail(mesh(headBody, new THREE.CylinderGeometry(0.9, 0.9, 0.2, 28), m.plastic, -0.6, 2.4, 7.2));
    window.rotation.x = Math.PI / 2;
    detail(box(headBody, 0.8, 2.6, 0.5, m.accent, 1.5, 3, 7.3, 0.2));
    screws(headBody, [[-1.6, 0, 7.2], [1.6, 0, 7.2]], "z");
  }
  // Pancake extruder motor on top.
  mesh(headBody, new THREE.CylinderGeometry(2.1, 2.1, 1.8, fine ? 32 : 16), m.motor, 0, 6.2, 4.4);
  mesh(headBody, new THREE.CylinderGeometry(2.15, 2.15, 0.25, fine ? 32 : 16), m.alu, 0, 5.3, 4.4);
  const headFan = fan(headBody, 4, -3.4, 0.6, 4.4, "x");
  // Part cooling shroud and the hotend below.
  box(headBody, 5.4, 1.6, 1.6, m.plastic, 0, -4.4, 6.2, 0.4);
  const hotendZ = NOZZLE_HOME.z - FRAME_Z - 4.6;
  if (fine) for (let i = 0; i < 5; i++) detail(mesh(headBody, new THREE.CylinderGeometry(1.15, 1.15, 0.14, 24), m.alu, 0, -4 - i * 0.34, hotendZ));
  else mesh(headBody, new THREE.CylinderGeometry(1.15, 1.15, 1.6, 12), m.alu, 0, -4.7, hotendZ);
  box(headBody, 2.4, 1.3, 1.9, m.hotSock, 0, -6.8, hotendZ, 0.4);
  mesh(headBody, new THREE.ConeGeometry(0.45, 0.95, 16), m.hotBrass, 0, -7.92, hotendZ).rotation.x = Math.PI;
  const nozzle = new THREE.Object3D();
  nozzle.position.set(0, -8.4, hotendZ);
  headBody.add(nozzle);
  // Braided cable bundle from the head, arching back over the frame.
  const headCable = cable(headBody, [new THREE.Vector3(0, 7.2, 3.4), new THREE.Vector3(0, 12, 1.6), new THREE.Vector3(-5, 17, -2.6), new THREE.Vector3(-11, FRAME_TOP - GANTRY_Y - 1, -6)], 0.45, m.cable);

  // Spool on a printed holder on top of the frame.
  const spool = part("spool", [32, -2, -10], [0, FRAME_TOP + 16, FRAME_Z - 4]);
  const spoolY = FRAME_TOP + 10;
  const spoolZ = FRAME_Z - 4.6;
  box(spool, 2.4, 9, 2.2, m.printed, 0, FRAME_TOP + 6, FRAME_Z - 0.4, 0.5);
  rod(spool, 0.9, 9, m.printed, "z", 0, spoolY, spoolZ);
  // The reel turns on the rod as filament is pulled off it.
  const reel = new THREE.Group();
  reel.position.set(0, spoolY, spoolZ);
  spool.add(reel);
  const flangeSegments = fine ? 64 : 28;
  for (const dz of [-2.6, 2.6]) {
    const flange = mesh(reel, new THREE.CylinderGeometry(7.4, 7.4, 0.4, flangeSegments), m.spool, 0, 0, dz);
    flange.rotation.x = Math.PI / 2;
  }
  // Spokes in the flange show the reel turning.
  if (fine) {
    for (let i = 0; i < 6; i++) {
      const window = detail(box(reel, 1.4, 2.6, 0.5, m.plastic, 0, 0, 2.65, 0.3));
      window.rotation.z = (i / 6) * Math.PI * 2;
      window.translateY(4.6);
    }
  }
  rod(reel, 6.4, 4.8, m.filament, "z");
  if (fine) for (let i = 0; i < 14; i++) detail(mesh(reel, new THREE.TorusGeometry(6.42, 0.07, 6, 64), m.filament, 0, 0, -2.2 + i * 0.34));

  // PTFE tube carrying the filament from the spool down into the extruder.
  const path = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, spoolY - 6.6, spoolZ + 1.4),
    new THREE.Vector3(1.6, FRAME_TOP + 1.6, FRAME_Z + 5),
    new THREE.Vector3(1, GANTRY_Y + 13, FRAME_Z + 9.6),
    new THREE.Vector3(0, GANTRY_Y + 7.2, FRAME_Z + 9),
  ]);
  const filament = new THREE.Group();
  root.add(filament);
  for (const tube of [
    mesh(filament, new THREE.TubeGeometry(path, 48, 0.2, 8), m.ptfe),
    mesh(filament, new THREE.TubeGeometry(path, 96, 0.08, 6), flowMaterial),
  ]) {
    tube.castShadow = false;
    detail(tube);
  }

  parts.forEach((p) => p.home.copy(p.object.position));
  root.updateMatrixWorld(true);
  const bounds = new THREE.Box3();
  parts.forEach((p) => bounds.setFromObject(p.object).getCenter(p.center));

  return {
    root,
    parts,
    nozzle,
    bedSurface,
    filament,
    headCable,
    screen,
    setToolPosition(x, y, z) {
      headBody.position.x = x;
      bed.children.forEach((c) => (c.position.z = (c.userData.z ??= c.position.z) + y));
      gantryBody.position.y = z;
      headBody.position.y = GANTRY_Y + z;
    },
    setFilament(color) {
      m.filament.color.setHex(color);
      flowMaterial.color.setHex(color);
    },
    setIdle(fanTurn, cursor) {
      idleFan = fanTurn;
      cursorOn = cursor;
    },
    setPrinting(progress, heat) {
      headFan.rotation.z = -progress * Math.PI * 160 - idleFan;
      reel.rotation.z = progress * Math.PI * 1.2;
      // The reel wobbles a little on its rod as it is pulled round.
      reel.rotation.x = Math.sin(progress * 70) * 0.025 * Math.min(progress * 20, 1);
      flowTexture.offset.x = -progress * 40;
      drawScreen(progress);
      m.hotBrass.emissiveIntensity = heat * 2.2;
      m.hotSock.emissiveIntensity = heat * 0.6;
    },
    dispose() {
      geometries.forEach((g) => g.dispose());
      textures.forEach((t) => t.dispose());
      Object.values(m as Materials).forEach((mat) => {
        [mat.roughnessMap, mat.bumpMap].forEach((t) => t?.dispose());
        mat.dispose();
      });
      (screen.material as THREE.Material).dispose();
      flowMaterial.dispose();
    },
  };
}
