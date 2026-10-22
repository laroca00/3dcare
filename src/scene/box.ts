// The open model package: a cardboard box with the 3D Care mark and a label
// saying the model is open and free, the way the project shares its models.
// Sizes are in cm, like the mug. Its origin is the middle of its floor.
import * as THREE from "three";
import { flapClosure } from "./packageMotion";

export interface PackageBox {
  object: THREE.Group;
  /** close/open drive the flaps (see packageMotion); amount 0..1 scales it in and out. */
  update(close: number, open: number, amount: number): void;
  dispose(): void;
}

/** Inside width (x), depth (z) and height (y) of the box, and its board's thickness. */
export const BOX = { width: 18, depth: 12, height: 11, board: 0.3 };
/** Flaps open out to this angle and lie flat when shut (radians). */
const OPEN = 2.5;

const KRAFT = "#c49a64";
const INK = "#15232b";
const TEAL = "#00756a";

/** Brown board with faint fibres; the front also carries the mark, the name and the label. */
function boardTexture(label: string | null) {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = label ? 640 : 256;
  const c = canvas.getContext("2d")!;
  c.fillStyle = KRAFT;
  c.fillRect(0, 0, canvas.width, canvas.height);
  for (let i = 0; i < 1400; i++) {
    c.fillStyle = `rgba(${i % 2 ? "90,60,30" : "255,240,210"},${((i * 37) % 9) / 100})`;
    c.fillRect((i * 733) % canvas.width, (i * 409) % canvas.height, 2 + ((i * 13) % 18), 1);
  }
  if (label) {
    const cx = 512;
    c.lineCap = "round";
    c.lineWidth = 16;
    c.strokeStyle = INK;
    for (const r of [72, 50, 28]) {
      c.beginPath();
      c.arc(cx, 190, r, Math.PI / 4, (Math.PI * 7) / 4);
      c.stroke();
    }
    c.fillStyle = INK;
    c.beginPath();
    c.arc(cx, 190, 10, 0, Math.PI * 2);
    c.fill();
    c.font = '800 84px "Inter Variable", Inter, system-ui, sans-serif';
    c.textAlign = "center";
    c.fillText("3D CARE", cx, 370);
    // The label, like a stamp: open and free, not for sale.
    c.font = '700 40px "Inter Variable", Inter, system-ui, sans-serif';
    const w = c.measureText(label).width + 56;
    c.strokeStyle = TEAL;
    c.lineWidth = 5;
    c.strokeRect(cx - w / 2, 430, w, 74);
    c.fillStyle = TEAL;
    c.fillText(label, cx, 482);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

export function createPackageBox(label: string): PackageBox {
  const { width: W, depth: D, height: H, board: T } = BOX;
  const plain = boardTexture(null);
  const printed = boardTexture(label);
  const board = new THREE.MeshStandardMaterial({ map: plain, roughness: 0.92 });
  const front = new THREE.MeshStandardMaterial({ map: printed, roughness: 0.92 });
  const inside = new THREE.MeshStandardMaterial({ color: 0x9c7446, roughness: 0.95 });

  const object = new THREE.Group();
  object.visible = false;
  const geometries: THREE.BufferGeometry[] = [];
  function slab(w: number, h: number, d: number, materials: THREE.Material[]) {
    const geometry = new THREE.BoxGeometry(w, h, d);
    geometries.push(geometry);
    const mesh = new THREE.Mesh(geometry, materials);
    mesh.castShadow = mesh.receiveShadow = true;
    return mesh;
  }
  // Floor and walls; the front wall (+z) carries the print on its outer face.
  const floor = slab(W + 2 * T, T, D + 2 * T, [board, board, inside, board, board, board]);
  floor.position.y = -T / 2;
  const frontWall = slab(W + 2 * T, H, T, [board, board, board, board, front, inside]);
  frontWall.position.set(0, H / 2, D / 2 + T / 2);
  const backWall = slab(W + 2 * T, H, T, [board, board, board, board, inside, board]);
  backWall.position.set(0, H / 2, -D / 2 - T / 2);
  const leftWall = slab(T, H, D, [inside, board, board, board, board, board]);
  leftWall.position.set(-W / 2 - T / 2, H / 2, 0);
  const rightWall = slab(T, H, D, [board, inside, board, board, board, board]);
  rightWall.position.set(W / 2 + T / 2, H / 2, 0);
  object.add(floor, frontWall, backWall, leftWall, rightWall);

  // Flaps hinge on the top edges: the long ones front and back meet in the
  // middle, the short ones on the sides fold under them.
  function flap(w: number, d: number, hinge: THREE.Vector3, inward: THREE.Vector3, y: number) {
    const pivot = new THREE.Group();
    pivot.position.copy(hinge).setY(H + y);
    const mesh = slab(w, T, d, [board, board, inside, board, board, board]);
    mesh.position.copy(inward).multiplyScalar(d / 2);
    if (inward.x) mesh.rotation.y = Math.PI / 2;
    pivot.add(mesh);
    object.add(pivot);
    return pivot;
  }
  const frontFlap = flap(W + 2 * T, D / 2, new THREE.Vector3(0, 0, D / 2 + T), new THREE.Vector3(0, 0, -1), T);
  const backFlap = flap(W + 2 * T, D / 2, new THREE.Vector3(0, 0, -D / 2 - T), new THREE.Vector3(0, 0, 1), T);
  const leftFlap = flap(D, D / 2, new THREE.Vector3(-W / 2 - T, 0, 0), new THREE.Vector3(1, 0, 0), 0);
  const rightFlap = flap(D, D / 2, new THREE.Vector3(W / 2 + T, 0, 0), new THREE.Vector3(-1, 0, 0), 0);

  return {
    object,
    update(close, open, amount) {
      object.visible = amount > 0.001;
      if (!object.visible) return;
      const shut = flapClosure(close, open);
      // Open flaps lean out; shut ones lie flat over the box.
      frontFlap.rotation.x = OPEN * (1 - shut.long);
      backFlap.rotation.x = -OPEN * (1 - shut.long);
      leftFlap.rotation.z = OPEN * (1 - shut.sides);
      rightFlap.rotation.z = -OPEN * (1 - shut.sides);
      object.scale.setScalar(0.6 + 0.4 * amount);
    },
    dispose() {
      geometries.forEach((g) => g.dispose());
      [board, front, inside].forEach((m) => m.dispose());
      [plain, printed].forEach((t) => t.dispose());
    },
  };
}
