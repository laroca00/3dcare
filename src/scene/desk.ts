// The opening desk: a self-healing cutting mat under the printer's drawing,
// with a pencil and a steel ruler, seen from above as the story begins. The
// project's wordmark is printed large along the mat's edge, as mats carry
// their maker's name. Everything is painted on canvases; no image files.
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import type { Theme } from "../theme/theme";

/** Mat size in cm (the scene's units): large enough to fill the screen from above, like a big studio mat. */
const MAT_W = 250;
const MAT_D = 180;
/** Canvas pixels per cm. */
const PX = 8;
/** One square of the mat's grid, in cm: large, so the mat reads as if seen up close. */
const CELL = 5.5;
/** The pencil and the ruler are drawn large, so they read from above and invite a touch. */
const PENCIL_SCALE = 2.2;
const RULER_SCALE = 1.7;
/** The mat sits right of the middle, so the wooden desk shows under the opening text on the left. */
const MAT_X = 86;
const MAT_Z = -42;

/** Something on the desk the visitor can pick up and move. */
export interface DeskItem {
  kind: "pencil" | "ruler" | "knife";
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

/**
 * A self-healing cutting mat, as studios use: deep green with a faint
 * mottled texture, a cream grid of large squares, millimetre ticks and
 * numbers along the bottom and left edges, and rounded corners. The grid is
 * drawn large, so from the opening camera it reads like a mat seen up close.
 */
function paintMat(canvas: HTMLCanvasElement) {
  canvas.width = MAT_W * PX;
  canvas.height = MAT_D * PX;
  const c = canvas.getContext("2d")!;
  const W = canvas.width;
  const H = canvas.height;
  c.fillStyle = "#57674f";
  c.fillRect(0, 0, W, H);
  // A faint mottle, like the mat's rubbery surface.
  for (let i = 0; i < 9000; i++) {
    const x = (i * 7919) % W;
    const y = (i * 104729) % H;
    const tone = (i * 37) % 11;
    c.fillStyle = tone < 5 ? `rgba(10, 30, 16, ${0.04 + tone * 0.008})` : `rgba(180, 210, 170, ${0.02 + (tone - 5) * 0.005})`;
    c.fillRect(x, y, 2 + (i % 4), 2 + ((i >> 2) % 3));
  }
  // The grid: one square every CELL cm, inside a margin left for the numbers.
  const cell = CELL * PX;
  const left = 3.4 * cell * 0.5;
  const bottom = H - 3.4 * cell * 0.5;
  const line = "rgba(236, 232, 206, 0.62)";
  c.strokeStyle = line;
  c.lineWidth = Math.max(1.6, PX * 0.2);
  c.beginPath();
  for (let x = left; x <= W - cell * 0.3; x += cell) {
    c.moveTo(x, 0);
    c.lineTo(x, bottom);
  }
  for (let y = bottom; y >= 0; y -= cell) {
    c.moveTo(left, y);
    c.lineTo(W, y);
  }
  c.stroke();
  // Ticks along the bottom and left edges, ten to a square, every fifth longer.
  c.lineWidth = Math.max(1.5, PX * 0.22);
  c.beginPath();
  for (let i = 0; left + (i * cell) / 10 <= W; i++) {
    const x = left + (i * cell) / 10;
    const length = i % 10 === 0 ? cell * 0.32 : i % 5 === 0 ? cell * 0.22 : cell * 0.13;
    c.moveTo(x, bottom);
    c.lineTo(x, bottom + length);
  }
  for (let i = 0; bottom - (i * cell) / 10 >= 0; i++) {
    const y = bottom - (i * cell) / 10;
    const length = i % 10 === 0 ? cell * 0.32 : i % 5 === 0 ? cell * 0.22 : cell * 0.13;
    c.moveTo(left, y);
    c.lineTo(left - length, y);
  }
  c.stroke();
  // Numbers: 0, 10, 20… under the bottom edge, and turned along the left edge.
  c.fillStyle = line;
  c.font = `500 ${cell * 0.36}px "Inter Variable", Inter, system-ui, sans-serif`;
  c.textAlign = "center";
  c.textBaseline = "top";
  for (let i = 0; left + i * cell <= W - cell * 0.4; i++) c.fillText(String(i * 10), left + i * cell, bottom + cell * 0.42);
  c.save();
  c.translate(left - cell * 0.62, 0);
  c.rotate(-Math.PI / 2);
  c.textBaseline = "middle";
  for (let i = 0; bottom - i * cell >= cell * 0.4; i++) c.fillText(String(i * 10), -(bottom - i * cell), 0);
  c.restore();
  // The project's wordmark, large and faint, as mats carry their maker's name.
  c.fillStyle = "rgba(232, 236, 214, 0.07)";
  c.font = `800 ${cell * 3.2}px "Inter Variable", Inter, system-ui, sans-serif`;
  c.textAlign = "right";
  c.textBaseline = "alphabetic";
  c.fillText("3D CARE", W - cell * 0.8, bottom - cell * 0.6);
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

/**
 * Photographed surfaces for the desk (CC0, Poly Haven): "Mocha Oak Veneer"
 * for the wood, and the fine surface of "Rubber Tiles" for the mat. They
 * load after the desk appears; `onLoad` asks for a new frame.
 */
function loadSurfaces(onLoad: () => void) {
  const base = `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/textures/`;
  const loader = new THREE.TextureLoader();
  const load = (name: string, colour: boolean, repeat: number) => {
    const texture = loader.load(base + name + ".webp", onLoad);
    if (colour) texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(repeat, repeat);
    texture.anisotropy = 8;
    return texture;
  };
  return {
    // The desk is 9 m by 6 m; one tile of veneer covers about 1.2 m.
    oakColor: load("oak_color", true, 1),
    oakNormal: load("oak_normal", false, 1),
    oakRough: load("oak_rough", false, 1),
    // The mat's own UVs are in cm: one tile of rubber surface every 18 cm.
    matNormal: load("mat_normal", false, 1 / 18),
    matRough: load("mat_rough", false, 1 / 18),
  };
}

/**
 * Photo-scanned objects on the desk (CC0, Poly Haven): a used pencil, a
 * blue pen and an eraser from "Stationery Supplies", a pair of pliers for
 * cleaning up prints, and a small potted succulent on the wood. They load
 * after the desk appears; `onLoad` asks for a new frame.
 */
async function loadScans(parent: THREE.Object3D, onLoad: () => void) {
  // The loader comes in its own file, only when the desk needs it.
  const { GLTFLoader } = await import("three/addons/loaders/GLTFLoader.js");
  const base = `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/models/`;
  const loader = new GLTFLoader();
  /** Desk objects are drawn a little larger than life, like the rest of the desk. */
  const SCALE = 100 * 1.7;
  const place = (o: THREE.Object3D, x: number, z: number, turn: number, lift = 0) => {
    o.position.set(x, lift, z);
    o.rotation.y = turn;
    o.scale.setScalar(SCALE);
    o.traverse((m) => {
      if ((m as THREE.Mesh).isMesh) m.castShadow = m.receiveShadow = true;
    });
    parent.add(o);
  };
  const layDown = (o: THREE.Object3D) => {
    // Each piece is modelled lying along x; it rests on the desk.
    const box = new THREE.Box3().setFromObject(o);
    o.position.y -= box.min.y;
    return o;
  };
  loader.load(base + "stationery_supplies/stationery_supplies.gltf", (gltf) => {
    const pick = (name: string) => {
      const node = gltf.scene.getObjectByName(name)!;
      node.position.set(0, 0, 0);
      const holder = new THREE.Group();
      holder.add(layDown(node));
      return holder;
    };
    place(pick("stationery_supplies_pencil_used"), -44, 40, 0.95, 0.3);
    place(pick("stationery_supplies_pen_blue"), -30, 50, 1.2, 0.3);
    place(pick("stationery_supplies_eraser"), -18, 54, -0.35, 0.3);
    onLoad();
  });
  loader.load(base + "pliers/pliers.gltf", (gltf) => {
    const pliers = new THREE.Group();
    pliers.add(layDown(gltf.scene));
    place(pliers, 24, 54, -0.4);
    onLoad();
  });
  loader.load(base + "potted_plant_04/potted_plant_04.gltf", (gltf) => {
    // Only the pot, the soil and the plant; not the scanned ground under it.
    gltf.scene.getObjectByName("potted_plant_04_ground")?.removeFromParent();
    const plant = new THREE.Group();
    plant.add(layDown(gltf.scene));
    place(plant, 104, -50, 0.6);
    onLoad();
  });
}

export function createDesk(floorY: number, onLoad: () => void = () => {}): Desk {
  const surfaces = loadSurfaces(onLoad);
  const object = new THREE.Group();
  object.position.y = floorY;

  const matCanvas = document.createElement("canvas");
  paintMat(matCanvas);
  const matTexture = new THREE.CanvasTexture(matCanvas);
  matTexture.colorSpace = THREE.SRGBColorSpace;
  matTexture.anisotropy = 8;
  // Painted colour and grid, with the real rubber's fine bumps and sheen.
  const matMaterial = new THREE.MeshStandardMaterial({
    map: matTexture,
    normalMap: surfaces.matNormal,
    normalScale: new THREE.Vector2(0.35, 0.35),
    roughnessMap: surfaces.matRough,
    roughness: 1,
    metalness: 0,
  });
  // A slab with rounded corners; its top face shows the painted mat.
  const matShape = new THREE.Shape();
  const R = 7;
  matShape.moveTo(R, 0);
  matShape.lineTo(MAT_W - R, 0);
  matShape.quadraticCurveTo(MAT_W, 0, MAT_W, R);
  matShape.lineTo(MAT_W, MAT_D - R);
  matShape.quadraticCurveTo(MAT_W, MAT_D, MAT_W - R, MAT_D);
  matShape.lineTo(R, MAT_D);
  matShape.quadraticCurveTo(0, MAT_D, 0, MAT_D - R);
  matShape.lineTo(0, R);
  matShape.quadraticCurveTo(0, 0, R, 0);
  const matGeometry = new THREE.ExtrudeGeometry(matShape, { depth: 0.3, bevelEnabled: false, curveSegments: 10 });
  // Shape coordinates are in cm; the texture spans the whole mat.
  matTexture.repeat.set(1 / MAT_W, 1 / MAT_D);
  // Lie it flat, its far edge (the canvas's top) away from the camera, centred.
  matGeometry.rotateX(-Math.PI / 2);
  matGeometry.translate(-MAT_W / 2, -0.15, MAT_D / 2);
  const mat = new THREE.Mesh(matGeometry, matMaterial);
  mat.position.set(MAT_X, 0.15, MAT_Z);
  mat.receiveShadow = true;
  object.add(mat);

  // The wooden desk under the mat, reaching past every edge of the screen.
  // Photographed oak veneer, warmed a little to sit with the mat.
  const deskMaterial = new THREE.MeshStandardMaterial({
    map: surfaces.oakColor,
    color: 0xd9a77a,
    normalMap: surfaces.oakNormal,
    normalScale: new THREE.Vector2(0.6, 0.6),
    roughnessMap: surfaces.oakRough,
    roughness: 0.9,
    metalness: 0,
  });
  for (const t of [surfaces.oakColor, surfaces.oakNormal, surfaces.oakRough]) t.repeat.set(900 / 120, 600 / 120);
  const desk = new THREE.Mesh(new THREE.PlaneGeometry(900, 600), deskMaterial);
  desk.rotation.x = -Math.PI / 2;
  desk.position.set(MAT_X - 120, -0.02, MAT_Z);
  desk.receiveShadow = true;
  object.add(desk);

  // A yellow pencil (the project's yellow), with a ferrule and an eraser, lying at an angle.
  const pencil = new THREE.Group();
  const yellow = new THREE.MeshStandardMaterial({ color: 0xe6cfa6, roughness: 0.55 });
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
  ruler.rotation.y = 1.42;
  ruler.scale.set(RULER_SCALE, 1.5, RULER_SCALE);
  ruler.position.set(92, 0.39, 2);

  // --- The rest of the desk: what a 3D printing workshop's desk holds. ---
  const S = PENCIL_SCALE;
  const extras: THREE.Material[] = [];
  const material = (params: THREE.MeshStandardMaterialParameters) => {
    const m = new THREE.MeshStandardMaterial(params);
    extras.push(m);
    return m;
  };
  // Fine parallel grooves, for a bump map: filament wound on a spool, or a print's layer lines.
  const groovesCanvas = document.createElement("canvas");
  groovesCanvas.width = 4;
  groovesCanvas.height = 64;
  const gr = groovesCanvas.getContext("2d")!;
  for (let y = 0; y < 64; y++) {
    const v = Math.round(40 + 200 * Math.abs(Math.sin((y / 4) * Math.PI)));
    gr.fillStyle = `rgb(${v},${v},${v})`;
    gr.fillRect(0, y, 4, 1);
  }
  const grooves = new THREE.CanvasTexture(groovesCanvas);
  grooves.wrapS = grooves.wrapT = THREE.RepeatWrapping;
  grooves.repeat.set(1, 2.2);

  // A snap-off utility knife, lying across the bottom right: an orange body
  // with a grey grip, a slider on top and a segmented steel blade.
  const knife = new THREE.Group();
  const orange = material({ color: 0xf08a24, roughness: 0.35 });
  const greyGrip = material({ color: 0x4a4f55, roughness: 0.8 });
  const blade = material({ color: 0xd9dde1, roughness: 0.22, metalness: 1 });
  const bladeLines = material({ color: 0x7d838a, roughness: 0.4, metalness: 0.8 });
  // Moulded plastic: every edge softly rounded.
  const knifeBody = new THREE.Mesh(new RoundedBoxGeometry(14, 1.3, 2.4, 3, 0.5), orange);
  const knifeGrip = new THREE.Mesh(new RoundedBoxGeometry(6.5, 1.36, 2.46, 3, 0.5), greyGrip);
  knifeGrip.position.x = -3.2;
  const slider = new THREE.Mesh(new RoundedBoxGeometry(2.2, 0.5, 1.2, 2, 0.2), greyGrip);
  slider.position.set(2.2, 0.85, 0);
  // The blade comes out of the front, cut at an angle; its snap-off lines are thin dark strips.
  const bladeShape = new THREE.Shape([new THREE.Vector2(0, -0.8), new THREE.Vector2(4.2, -0.8), new THREE.Vector2(5.2, 0.8), new THREE.Vector2(0, 0.8)]);
  const bladeMesh = new THREE.Mesh(new THREE.ExtrudeGeometry(bladeShape, { depth: 0.08, bevelEnabled: false }), blade);
  bladeMesh.rotation.x = -Math.PI / 2;
  bladeMesh.position.set(7, 0.2, 0.15);
  knife.add(knifeBody, knifeGrip, slider, bladeMesh);
  for (let i = 0; i < 4; i++) {
    const line = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.1, 1.7), bladeLines);
    line.position.set(7.9 + i * 1, 0.27, 0.05);
    line.rotation.y = -0.55;
    knife.add(line);
  }
  knife.scale.setScalar(S * 1.35);
  knife.rotation.y = 0.62;
  knife.position.set(50, 0.3 + 0.65 * S * 1.35, 46);


  // Spools of filament on the wood at the top left, in the project's three
  // colours: cardboard flanges with cut-out windows, the filament wound
  // inside (the violet one half used), and a loose teal end that curls out
  // across the desk.
  const teal = material({ color: 0x2aa898, roughness: 0.42 });
  const violet = material({ color: 0x6f52c9, roughness: 0.42 });
  const yellowFilament = material({ color: 0xf5c400, roughness: 0.42 });
  const card = material({ color: 0xbe9364, roughness: 0.9 });
  const flangeShape = new THREE.Shape().absarc(0, 0, 10, 0, Math.PI * 2, false);
  flangeShape.holes.push(new THREE.Path().absarc(0, 0, 2.6, 0, Math.PI * 2, true));
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + 0.4;
    flangeShape.holes.push(new THREE.Path().absarc(Math.cos(a) * 6.4, Math.sin(a) * 6.4, 1.7, 0, Math.PI * 2, true));
  }
  const flangeGeometry = new THREE.ExtrudeGeometry(flangeShape, { depth: 0.25, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.06, bevelSegments: 2, curveSegments: 32 });
  flangeGeometry.rotateX(-Math.PI / 2);
  const hubGeometry = new THREE.CylinderGeometry(2.6, 2.6, 6.6, 24, 1, true);
  /** A spool lying flat; `full` 0..1 is how much filament is left on it. */
  function makeSpool(colour: THREE.MeshStandardMaterial, full: number) {
    const spool = new THREE.Group();
    const bottom = new THREE.Mesh(flangeGeometry, card);
    const top = new THREE.Mesh(flangeGeometry, card);
    top.position.y = 6.5;
    const radius = 3.2 + 6.4 * full;
    // The filament wound round and round: a groove for every turn.
    const windings = material({ color: colour.color, roughness: 0.36, bumpMap: grooves, bumpScale: 1.2 });
    const wound = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, 6.1, 64), windings);
    wound.position.y = 3.35;
    const hub = new THREE.Mesh(hubGeometry, card);
    hub.position.y = 3.35;
    spool.add(bottom, wound, hub, top);
    return spool;
  }
  const spool = makeSpool(teal, 1);
  spool.scale.setScalar(0.85);
  spool.position.set(-92, 0, -30);
  const violetSpool = makeSpool(violet, 0.45);
  violetSpool.scale.setScalar(0.85);
  violetSpool.position.set(-114, 0, -18);
  const yellowSpool = makeSpool(yellowFilament, 0.8);
  yellowSpool.scale.setScalar(0.85);
  yellowSpool.position.set(-128, 0, -42);
  // The loose end: 1.75 mm filament, drawn at the desk's scale.
  const strand = new THREE.CatmullRomCurve3(
    [
      [-84, 3, -27],
      [-70, 0.4, -24],
      [-64, 0.4, -28],
      [-56, 0.4, -30],
      [-50, 0.4, -24],
      [-54, 0.4, -18],
      [-46, 0.4, -14],
    ].map(([x, y, z]) => new THREE.Vector3(x, y, z)),
  );
  const strandMesh = new THREE.Mesh(new THREE.TubeGeometry(strand, 80, 0.2, 6, false), teal);

  // Snipped-off filament ends scattered on the wood, as on any printing desk.
  const scraps = new THREE.Group();
  const scrapColours = [violet, yellowFilament, teal, violet, yellowFilament];
  const scrapPlaces: [number, number, number, number][] = [
    [-66, -6, 0.4, 4.5],
    [-60, 4, 1.9, 3.2],
    [-74, 10, 2.6, 5.2],
    [-52, -2, 1.1, 2.6],
    [-80, -14, 0.2, 3.6],
  ];
  scrapPlaces.forEach(([x, z, turn, length], i) => {
    const bend = new THREE.QuadraticBezierCurve3(new THREE.Vector3(-length / 2, 0, 0), new THREE.Vector3(0, 0, length * 0.25), new THREE.Vector3(length / 2, 0, 0));
    const scrap = new THREE.Mesh(new THREE.TubeGeometry(bend, 16, 0.2, 6, false), scrapColours[i]);
    scrap.position.set(x, 0.22, z);
    scrap.rotation.y = turn;
    scraps.add(scrap);
  });

  // A digital caliper on the mat: a steel beam with fixed and sliding jaws
  // and a dark display, for measuring the parts a design is made to fit.
  const caliper = new THREE.Group();
  const steelBright = material({ color: 0xcfd4d8, roughness: 0.25, metalness: 1 });
  const dark = material({ color: 0x1d2226, roughness: 0.55 });
  // Its display reads the mug's diameter.
  const lcdCanvas = document.createElement("canvas");
  lcdCanvas.width = 256;
  lcdCanvas.height = 112;
  const l = lcdCanvas.getContext("2d")!;
  l.fillStyle = "#a9b8a6";
  l.fillRect(0, 0, 256, 112);
  l.fillStyle = "#1c231d";
  l.font = "700 64px Inter, system-ui, sans-serif";
  l.textAlign = "right";
  l.textBaseline = "middle";
  l.fillText("84.00", 200, 60);
  l.font = "600 26px Inter, system-ui, sans-serif";
  l.fillText("mm", 246, 74);
  const lcdTexture = new THREE.CanvasTexture(lcdCanvas);
  lcdTexture.colorSpace = THREE.SRGBColorSpace;
  lcdTexture.anisotropy = 8;
  const lcd = material({ map: lcdTexture, roughness: 0.3, emissive: 0x1a221b });
  const beam = new THREE.Mesh(new THREE.BoxGeometry(22, 0.35, 1.6), steelBright);
  const fixedJaw = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.35, 5), steelBright);
  fixedJaw.position.set(-10.4, 0, 2.6);
  const slideBody = new THREE.Mesh(new RoundedBoxGeometry(6.5, 1.1, 3.4, 2, 0.3), dark);
  slideBody.position.set(-4.2, 0.5, 0.4);
  const display = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.1, 1.6), lcd);
  display.position.set(-4.2, 1.08, 0.3);
  const slideJaw = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.35, 4.6), steelBright);
  slideJaw.position.set(-7.6, 0, 2.6);
  caliper.add(beam, fixedJaw, slideBody, display, slideJaw);
  caliper.scale.setScalar(S * 0.6);
  caliper.rotation.y = -1.5;
  caliper.position.set(112, 0.3 + 0.2 * S, -18);

  // A square sticky note on the mat with a pencil sketch of a mug's handle,
  // the first idea of a design.
  const noteCanvas = document.createElement("canvas");
  noteCanvas.width = noteCanvas.height = 512;
  const n = noteCanvas.getContext("2d")!;
  n.fillStyle = "#f7e8a2";
  n.fillRect(0, 0, 512, 512);
  n.strokeStyle = "rgba(90, 80, 40, 0.14)";
  n.lineWidth = 2;
  for (let y = 60; y < 512; y += 40) {
    n.beginPath();
    n.moveTo(24, y);
    n.lineTo(488, y);
    n.stroke();
  }
  n.strokeStyle = "rgba(40, 40, 44, 0.85)";
  n.lineWidth = 6;
  n.lineCap = "round";
  n.lineJoin = "round";
  n.beginPath();
  // The mug's body, a handle on each side, and a few construction strokes.
  n.moveTo(170, 150);
  n.lineTo(176, 380);
  n.quadraticCurveTo(250, 404, 330, 380);
  n.lineTo(338, 150);
  n.moveTo(160, 150);
  n.quadraticCurveTo(252, 130, 348, 150);
  n.moveTo(338, 200);
  n.bezierCurveTo(430, 196, 432, 330, 334, 330);
  n.moveTo(170, 200);
  n.bezierCurveTo(82, 196, 80, 330, 174, 330);
  n.stroke();
  n.lineWidth = 3;
  n.setLineDash([10, 10]);
  n.beginPath();
  n.moveTo(254, 110);
  n.lineTo(254, 420);
  n.stroke();
  n.setLineDash([]);
  n.font = "600 30px Inter, system-ui, sans-serif";
  n.fillStyle = "rgba(40, 40, 44, 0.8)";
  n.fillText("Ø 84", 214, 460);
  const noteTexture = new THREE.CanvasTexture(noteCanvas);
  noteTexture.colorSpace = THREE.SRGBColorSpace;
  noteTexture.anisotropy = 8;
  const noteMaterial = material({ map: noteTexture, roughness: 0.9 });
  const note = new THREE.Mesh(new THREE.BoxGeometry(14, 0.08, 14), [noteMaterial, noteMaterial, noteMaterial, noteMaterial, noteMaterial, noteMaterial]);
  note.rotation.y = 0.22;
  note.position.set(-14, 0.36, 46);

  // A bag of coffee on the wood, kraft paper with a dark label and a
  // folded top: the morning the story ends with is waiting.
  const coffeeCanvas = document.createElement("canvas");
  coffeeCanvas.width = 400;
  coffeeCanvas.height = 600;
  const k = coffeeCanvas.getContext("2d")!;
  k.fillStyle = "#b98f62";
  k.fillRect(0, 0, 400, 600);
  for (let i = 0; i < 900; i++) {
    k.fillStyle = `rgba(${i % 2 ? "90,60,30" : "235,205,160"},${((i * 13) % 7) / 100})`;
    k.fillRect((i * 151) % 400, (i * 263) % 600, 2 + (i % 5), 1);
  }
  // The folded top, darker.
  k.fillStyle = "rgba(70, 45, 25, 0.25)";
  k.fillRect(0, 0, 400, 70);
  k.fillStyle = "#2a1d16";
  k.fillRect(48, 210, 304, 240);
  // A coffee bean drawn on the label.
  k.fillStyle = "#c79a5b";
  k.beginPath();
  k.ellipse(200, 300, 40, 56, 0.4, 0, Math.PI * 2);
  k.fill();
  k.strokeStyle = "#2a1d16";
  k.lineWidth = 7;
  k.beginPath();
  k.moveTo(185, 255);
  k.bezierCurveTo(222, 285, 176, 318, 214, 346);
  k.stroke();
  k.fillStyle = "#e9dcc5";
  k.font = "700 30px Inter, system-ui, sans-serif";
  k.textAlign = "center";
  k.fillText("· 250 g ·", 200, 410);
  const coffeeTexture = new THREE.CanvasTexture(coffeeCanvas);
  coffeeTexture.colorSpace = THREE.SRGBColorSpace;
  coffeeTexture.anisotropy = 8;
  const kraft = material({ color: 0xb98f62, roughness: 0.95 });
  const coffeeFront = material({ map: coffeeTexture, roughness: 0.92 });
  // Lying flat: the top face (+y) carries the label.
  const coffee = new THREE.Mesh(new THREE.BoxGeometry(12, 4.5, 19, 16, 2, 24), [kraft, kraft, coffeeFront, kraft, kraft, kraft]);
  // A soft, pillowy bag rather than a box: round the top a little, and crinkle the paper.
  const bag = coffee.geometry.getAttribute("position");
  for (let i = 0; i < bag.count; i++) {
    const [x, y, z] = [bag.getX(i), bag.getY(i), bag.getZ(i)];
    const crinkle = Math.sin(x * 2.1 + z * 1.3) * Math.sin(z * 1.7 - x) * 0.14;
    bag.setY(i, y + crinkle - (y > 0 ? (Math.abs(x) / 6) ** 2 * 1.1 + (Math.abs(z) / 9.5) ** 4 * 0.8 : 0));
  }
  coffee.geometry.computeVertexNormals();
  coffee.rotation.y = 0.5;
  coffee.position.set(94, 2.25, 60);

  // A calibration cube, the first thing every new printer prints, on the mat's edge.
  const printedTeal = material({ color: 0x2aa898, roughness: 0.42, bumpMap: grooves, bumpScale: 0.8 });
  const cube = new THREE.Mesh(new RoundedBoxGeometry(2, 2, 2, 2, 0.1), printedTeal);
  cube.scale.setScalar(S);
  cube.rotation.y = 0.5;
  cube.position.set(66, 0.3 + S, -40);

  void loadScans(object, onLoad);
  const extrasOnDesk = [knife, spool, violetSpool, yellowSpool, strandMesh, scraps, caliper, note, coffee, cube];
  for (const o of extrasOnDesk) {
    o.traverse((m) => {
      if ((m as THREE.Mesh).isMesh) m.castShadow = m.receiveShadow = true;
    });
  }
  object.add(...extrasOnDesk);

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
    { kind: "knife", object: knife },
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

  const materials = [grip, ...extras, matMaterial, deskMaterial, yellow, woodMaterial, graphite, ferruleMaterial, eraserMaterial, steel, rulerTop];
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
    setTheme() {
      // The desk looks the same in every theme.
    },
    dispose() {
      object.traverse((o) => {
        if (o instanceof THREE.Mesh) o.geometry.dispose();
      });
      for (const m of materials) m.dispose();
      matTexture.dispose();
      grooves.dispose();
      lcdTexture.dispose();
      Object.values(surfaces).forEach((t) => t.dispose());
      rulerTexture.dispose();
    },
  };
}
