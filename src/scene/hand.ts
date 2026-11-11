// A hand that rises under the freshly printed mug and holds it up. The model
// is "First Person hands rigged" by David Fischer (CC BY 4.0), in cm like the
// mug; only its right arm is used. The forearm comes straight up from below
// with the hand upright and open, the back of the hand turned three quarters
// to the camera; the fingers reach up, a little cupped, and the mug stands on
// their tips.
import * as THREE from "three";
import { smoothstep } from "./timeline";

export interface Hand {
  /** Add to the mug, so the hand moves with it. */
  object: THREE.Group;
  /** reach 0..1: from below the picture to under the mug; grip 0..1: the fingers settle under its base. */
  update(reach: number, grip: number): void;
  dispose(): void;
}

const FINGERS = ["index", "middle", "ring", "pinky"] as const;
/** How far each finger joint bends when the hand holds the mug (radians), knuckle first: open, a little cupped. */
const HOLDING = [0.3, 0.3, 0.25];
/** While it rises, the fingers are cupped this much of the way. */
const OPEN = 0.3;
/** Where the palm faces, in the mug's frame (the camera is at +z): away from the camera, turned a little so the thumb's side shows. */
const PALM_FACES = new THREE.Vector3(-0.6, 0, -0.8).normalize();
/** How far below the hand starts (cm). */
const AWAY = 46;

/** Skin detail, made in code and tiled over the hand: fine pores as a faint normal map, so the smooth skin does not look like plastic. */
function skinNormalMap() {
  const N = 256;
  // Smooth value noise on a wrapping grid, so the texture tiles seamlessly.
  const noise = (cell: number, seed: number) => {
    const grid = Array.from({ length: cell * cell }, (_, i) => {
      const x = Math.sin(i * 12.9898 + seed * 78.233) * 43758.5453;
      return x - Math.floor(x);
    });
    return (x: number, y: number) => {
      const gx = (x / N) * cell;
      const gy = (y / N) * cell;
      const x0 = Math.floor(gx);
      const y0 = Math.floor(gy);
      const fx = gx - x0;
      const fy = gy - y0;
      const at = (i: number, j: number) => grid[((j % cell) * cell + (i % cell)) % grid.length];
      const sx = fx * fx * (3 - 2 * fx);
      const sy = fy * fy * (3 - 2 * fy);
      const top = at(x0, y0) * (1 - sx) + at(x0 + 1, y0) * sx;
      const bottom = at(x0, y0 + 1) * (1 - sx) + at(x0 + 1, y0 + 1) * sx;
      return top * (1 - sy) + bottom * sy;
    };
  };
  const pores = noise(64, 1);
  const fine = noise(128, 2);
  const h = (x: number, y: number) => pores((x + N) % N, (y + N) % N) * 0.5 + fine((x + N) % N, (y + N) % N) * 0.3;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = N;
  const c = canvas.getContext("2d")!;
  const image = c.createImageData(N, N);
  const d = image.data;
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const i = (y * N + x) * 4;
      const dx = (h(x + 1, y) - h(x - 1, y)) * 2.2;
      const dy = (h(x, y + 1) - h(x, y - 1)) * 2.2;
      const len = Math.hypot(dx, dy, 1);
      d[i] = (-dx / len) * 127 + 128;
      d[i + 1] = (dy / len) * 127 + 128;
      d[i + 2] = (1 / len) * 127 + 128;
      d[i + 3] = 255;
    }
  }
  c.putImageData(image, 0, 0);
  const normalMap = new THREE.CanvasTexture(canvas);
  normalMap.wrapS = normalMap.wrapT = THREE.RepeatWrapping;
  normalMap.repeat.set(26, 26);
  return normalMap;
}

export async function loadHand(url: string): Promise<Hand> {
  // The loader comes in its own file, only when the hand is needed.
  const { GLTFLoader } = await import("three/addons/loaders/GLTFLoader.js");
  const gltf = await new GLTFLoader().loadAsync(url);
  const model = gltf.scene;
  const pores = skinNormalMap();
  const bones = new Map<string, THREE.Bone>();
  model.traverse((o) => {
    if ((o as THREE.Bone).isBone) bones.set(o.name, o as THREE.Bone);
    const mesh = o as THREE.SkinnedMesh;
    if (mesh.isSkinnedMesh) {
      mesh.castShadow = mesh.receiveShadow = true;
      // Skin: warm, soft and slightly velvety at grazing angles, with pores and
      // creases; the small mesh is the nails, paler and a little glossy.
      const old = mesh.material as THREE.MeshStandardMaterial;
      const nails = mesh.geometry.getAttribute("position").count < 1000;
      // Deep, smooth skin that sits in the room's low light: a soft sheen on
      // its curves, the faintest pores, and paler, glossier nails.
      mesh.material = nails
        ? new THREE.MeshPhysicalMaterial({ color: 0x9a7466, roughness: 0.3, clearcoat: 0.5, clearcoatRoughness: 0.25 })
        : new THREE.MeshPhysicalMaterial({
        color: 0x4b2f25,
        normalMap: pores,
        normalScale: new THREE.Vector2(0.035, 0.035),
        roughness: 0.52,
        metalness: 0,
        clearcoat: 0.12,
        clearcoatRoughness: 0.5,
      });
      old.dispose();
      // The skinned arm moves far from its bind pose, so its box would cull it wrongly.
      mesh.frustumCulled = false;
    }
  });
  const bone = (prefix: string) => [...bones.values()].find((b) => b.name.startsWith(prefix))!;

  // Only the right arm: the left one is folded away to nothing.
  bone("clavicleL").scale.setScalar(1e-4);
  // (Its hand hangs on a chain of its own.)
  bone("forearmL001").scale.setScalar(1e-4);

  const joints = FINGERS.map((f) => [1, 2, 3].map((j) => bone(`f_${f}0${j}R`)));
  const thumb = [1, 2, 3].map((j) => bone(`thumb0${j}R`));
  const rest = new Map([...joints.flat(), ...thumb].map((b) => [b, b.rotation.x]));

  /** Bends the fingers: 0 as the model rests, 1 cupped under the mug. */
  function curl(amount: number) {
    joints.forEach((finger) => finger.forEach((b, j) => (b.rotation.x = rest.get(b)! + HOLDING[j] * amount)));
    thumb.forEach((b, j) => (b.rotation.x = rest.get(b)! + [0.15, 0.35, 0.3][j] * amount));
  }

  const at = (b: THREE.Bone) => b.getWorldPosition(new THREE.Vector3());
  // The hand's own directions, measured as the model rests: up the forearm
  // into the hand, and out of the palm (the side the fingertips curl towards).
  model.updateMatrixWorld(true);
  const wrist = at(bone("handR"));
  const upHand = wrist.clone().sub(at(bone("forearmR"))).normalize();
  const across = at(joints[0][0]).sub(at(joints[3][0])).normalize();
  const out = upHand.clone().cross(across).normalize();
  curl(1);
  model.updateMatrixWorld(true);
  if (out.dot(at(bone("f_middle03R_end")).sub(at(joints[1][0]))) < 0) out.negate();
  // The mug stands on the four fingertips.
  const seat = new THREE.Vector3();
  for (const f of FINGERS) seat.add(at(bone(`f_${f}03R_end`)));
  seat.multiplyScalar(1 / 4);
  // Turn the model so the forearm stands upright under the mug, the palm
  // faces where it should, and the seat is at the middle of the mug's base.
  const from = new THREE.Matrix4().makeBasis(upHand.clone().cross(out), upHand, out);
  const Y = new THREE.Vector3(0, 1, 0);
  const to = new THREE.Matrix4().makeBasis(Y.clone().cross(PALM_FACES), Y, PALM_FACES);
  const placed = new THREE.Group();
  placed.add(model);
  model.applyMatrix4(to.multiply(from.invert()).multiply(new THREE.Matrix4().makeTranslation(-seat.x, -seat.y, -seat.z)));

  const object = new THREE.Group();
  object.add(placed);
  object.visible = false;

  return {
    object,
    update(reach, holding) {
      object.visible = reach > 0.001;
      if (!object.visible) return;
      const settled = smoothstep(holding);
      // It stops just short of the mug, then the fingertips come up under its base.
      object.position.y = -(1 - smoothstep(reach)) * AWAY - (1 - settled) * 1.5;
      curl(OPEN + (1 - OPEN) * settled);
    },
    dispose() {
      model.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (!mesh.isMesh) return;
        mesh.geometry.dispose();
        (mesh.material as THREE.Material).dispose();
      });
    },
  };
}
