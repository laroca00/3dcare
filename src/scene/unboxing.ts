// The unboxing after the home story: the same printed mug lowers into a
// cardboard box with the 3D Care mark on its front, the flaps fold shut, the
// box turns to the camera, then opens again and the camera goes inside.
// Sizes are in cm, like the mug. Drawn only when asked (on scroll).
import * as THREE from "three";
import { createPrintJob } from "./printJob";
import type { QualityLevel } from "./quality";
import { flapClosure, unboxingMotion } from "./unboxingMotion";

export interface Unboxing {
  render(progress: number): void;
  resize(): void;
  dispose(): void;
}

/** Inside width (x), depth (z) and height (y) of the box, and its board's thickness. */
const W = 18;
const D = 12;
const H = 11;
const T = 0.3;
/** Flaps open out to this angle and lie flat when shut (radians). */
const OPEN = 2.5;

const KRAFT = "#c49a64";
const INK = "#15232b";

/** Brown board with faint fibres, and, for the front, the 3D Care mark and name. */
function boardTexture(printed: boolean) {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = printed ? 640 : 256;
  const c = canvas.getContext("2d")!;
  c.fillStyle = KRAFT;
  c.fillRect(0, 0, canvas.width, canvas.height);
  for (let i = 0; i < 1400; i++) {
    c.fillStyle = `rgba(${Math.random() < 0.5 ? "90,60,30" : "255,240,210"},${Math.random() * 0.08})`;
    c.fillRect(Math.random() * canvas.width, Math.random() * canvas.height, 2 + Math.random() * 18, 1);
  }
  if (printed) {
    // The mark: three arcs opening to the right and a dot, printed in ink.
    const cx = 512;
    const cy = 250;
    c.lineCap = "round";
    c.lineWidth = 18;
    c.strokeStyle = INK;
    for (const r of [84, 58, 32]) {
      c.beginPath();
      c.arc(cx, cy, r, Math.PI / 4, (Math.PI * 7) / 4);
      c.stroke();
    }
    c.fillStyle = INK;
    c.beginPath();
    c.arc(cx, cy, 11, 0, Math.PI * 2);
    c.fill();
    c.font = '800 96px "Inter Variable", Inter, system-ui, sans-serif';
    c.textAlign = "center";
    c.fillText("3D CARE", cx, 480);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

export function startUnboxing(canvas: HTMLCanvasElement, quality: QualityLevel): Unboxing {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: quality === 2, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, quality === 2 ? 2 : 1.5));
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.shadowMap.enabled = quality > 0;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.localClippingEnabled = true;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 1, 400);

  scene.add(new THREE.HemisphereLight(0xfff4e6, 0x5a4a3a, 1.6));
  const key = new THREE.DirectionalLight(0xffe9cc, 2.6);
  key.position.set(-30, 60, 40);
  key.castShadow = quality > 0;
  key.shadow.mapSize.set(1024, 1024);
  Object.assign(key.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30, near: 10, far: 150 });
  key.shadow.bias = -0.0005;
  scene.add(key);

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.ShadowMaterial({ opacity: 0.18 }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const plain = boardTexture(false);
  const printed = boardTexture(true);
  const board = new THREE.MeshStandardMaterial({ map: plain, roughness: 0.92 });
  const front = new THREE.MeshStandardMaterial({ map: printed, roughness: 0.92 });
  const inside = new THREE.MeshStandardMaterial({ color: 0x9c7446, roughness: 0.95 });

  const box = new THREE.Group();
  scene.add(box);
  const geometries: THREE.BufferGeometry[] = [];
  function slab(w: number, h: number, d: number, materials: THREE.Material | THREE.Material[]) {
    const geometry = new THREE.BoxGeometry(w, h, d);
    geometries.push(geometry);
    const mesh = new THREE.Mesh(geometry, materials);
    mesh.castShadow = mesh.receiveShadow = true;
    return mesh;
  }
  // Floor and walls; the front wall carries the print on its outer face (+z).
  const floor = slab(W + 2 * T, T, D + 2 * T, [board, board, inside, board, board, board]);
  floor.position.y = T / 2;
  box.add(floor);
  const frontWall = slab(W + 2 * T, H, T, [board, board, board, board, front, inside]);
  frontWall.position.set(0, H / 2, D / 2 + T / 2);
  const backWall = slab(W + 2 * T, H, T, [board, board, board, board, inside, board]);
  backWall.position.set(0, H / 2, -D / 2 - T / 2);
  const leftWall = slab(T, H, D, [inside, board, board, board, board, board]);
  leftWall.position.set(-W / 2 - T / 2, H / 2, 0);
  const rightWall = slab(T, H, D, [board, inside, board, board, board, board]);
  rightWall.position.set(W / 2 + T / 2, H / 2, 0);
  box.add(frontWall, backWall, leftWall, rightWall);

  // Flaps hinge on the top edges: the long ones front and back meet in the
  // middle, the short ones on the sides fold under them.
  function flap(w: number, d: number, hinge: THREE.Vector3, inward: THREE.Vector3, y: number) {
    const pivot = new THREE.Group();
    pivot.position.copy(hinge).setY(H + y);
    const mesh = slab(w, T, d, [board, board, inside, board, board, board]);
    mesh.position.copy(inward).multiplyScalar(d / 2);
    if (inward.x) mesh.rotation.y = Math.PI / 2;
    pivot.add(mesh);
    box.add(pivot);
    return pivot;
  }
  const frontFlap = flap(W + 2 * T, D / 2, new THREE.Vector3(0, 0, D / 2 + T), new THREE.Vector3(0, 0, -1), T);
  const backFlap = flap(W + 2 * T, D / 2, new THREE.Vector3(0, 0, -D / 2 - T), new THREE.Vector3(0, 0, 1), T);
  const leftFlap = flap(D, D / 2, new THREE.Vector3(-W / 2 - T, 0, 0), new THREE.Vector3(1, 0, 0), 0);
  const rightFlap = flap(D, D / 2, new THREE.Vector3(W / 2 + T, 0, 0), new THREE.Vector3(-1, 0, 0), 0);

  // The mug from the story, fully printed.
  const holder = new THREE.Group();
  scene.add(holder);
  const mug = createPrintJob(holder, quality);
  mug.setProgress(1);

  const lookAt = new THREE.Vector3();
  const from = new THREE.Vector3();
  const into = new THREE.Vector3();

  function render(p: number) {
    const m = unboxingMotion(p);
    const shut = flapClosure(m.close, m.open);
    // Open flaps lean out; shut ones lie flat over the box.
    frontFlap.rotation.x = OPEN * (1 - shut.long);
    backFlap.rotation.x = -OPEN * (1 - shut.long);
    leftFlap.rotation.z = OPEN * (1 - shut.sides);
    rightFlap.rotation.z = -OPEN * (1 - shut.sides);
    // The box starts at an angle and turns its printed front to the camera.
    box.rotation.y = 0.65 * (1 - m.turn) - 0.65 * m.open * 0.25;
    holder.rotation.y = box.rotation.y;
    // The mug comes down from above into the middle of the box.
    holder.position.set(0, T + (1 - m.drop) * 16, 0);
    holder.visible = m.close < 1 || m.open > 0;
    holder.updateMatrixWorld(true);
    mug.syncClip();
    // The camera looks down on the box, then dives into it.
    // On wide screens the box stands right of the title until the camera dives in.
    const aside = camera.aspect > 1.1 ? -9 * (1 - m.dive) : 0;
    from.set(aside, 30, 50);
    into.set(0, 26, 0.5);
    camera.position.copy(from).lerp(into, m.dive);
    lookAt.set(aside, 9 - m.dive * 9, 0);
    camera.lookAt(lookAt);
    renderer.render(scene, camera);
  }

  function resize() {
    const { clientWidth: w, clientHeight: h } = canvas;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // Narrow screens need a wider view to fit the box.
    camera.fov = camera.aspect < 1 ? 42 : 30;
    camera.updateProjectionMatrix();
  }
  resize();

  return {
    render,
    resize,
    dispose() {
      geometries.forEach((g) => g.dispose());
      [board, front, inside, ground.material].forEach((m) => m.dispose());
      ground.geometry.dispose();
      [plain, printed].forEach((t) => t.dispose());
      mug.dispose();
      renderer.dispose();
    },
  };
}
