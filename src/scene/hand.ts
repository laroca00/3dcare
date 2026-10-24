// A hand that reaches for the freshly printed mug and closes round a handle.
// The model is "First Person hands rigged" by David Fischer (CC BY 4.0), in cm
// like the mug; only its right arm is used. The hand is posed by bending the
// finger bones, then placed so that the middle of the closed fist sits on the
// handle's upright bar.
import * as THREE from "three";
import type { MugShapeId } from "./mugShapes";
import { smoothstep } from "./timeline";

export interface Hand {
  /** Add to the mug, so the hand moves with it. */
  object: THREE.Group;
  /** reach 0..1: from out of view to on the handle; grip 0..1: open to closed. */
  update(reach: number, grip: number): void;
  setShape(id: MugShapeId): void;
  dispose(): void;
}

const FINGERS = ["index", "middle", "ring", "pinky"] as const;
/** How far each finger joint bends when the fist is closed (radians), knuckle first. */
const CLOSED = [1.25, 1.5, 1.05];
/** Bones that only hold the hand open a little while it reaches. */
const OPEN = 0.15;

/**
 * Where the fist closes round each handle, on the mug's +x side (cm), and how
 * far each finger (index, middle, ring, little) bends, as a share of CLOSED.
 * Found by measuring the posed bones: every finger ends up wrapped round the
 * bar, touching it (bar radius plus a finger's) without going into it or the
 * mug's wall.
 */
const GRIPS: Record<MugShapeId, { x: number; y: number; z: number; bend: readonly number[] }> = {
  double: { x: 7.15, y: 4.65, z: 0, bend: [0.6, 0.9, 0.8, 0.5] },
  single: { x: 7.15, y: 4.65, z: 0, bend: [0.6, 0.9, 0.8, 0.5] },
  tgrip: { x: 7.2, y: 5.2, z: -1.2, bend: [0.6, 0.7, 0.65, 0.5] },
};
/** How much the forearm points towards the camera, for each cm it points to the right. */
const TOWARD_CAMERA = 0.9;
/** How far away the hand starts (cm). */
const AWAY = 40;

/**
 * Skin detail, made in code and tiled over the hand: a height field of fine
 * pores and creases turned into a normal map, slight blotches of colour, and
 * a roughness that varies with them, so the skin catches the light unevenly
 * as real skin does.
 */
function skinMaps() {
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
  const creases = noise(16, 3);
  const blotch = noise(8, 4);
  const height = new Float32Array(N * N);
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      // Pores are small dips; creases are thin valleys where the noise crosses its middle.
      const crease = 1 - Math.min(Math.abs(creases(x, y) - 0.5) * 10, 1);
      height[y * N + x] = pores(x, y) * 0.5 + fine(x, y) * 0.3 - crease * 0.12;
    }
  }
  const make = (paint: (data: Uint8ClampedArray, i: number, x: number, y: number) => void, colour: boolean) => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = N;
    const c = canvas.getContext("2d")!;
    const image = c.createImageData(N, N);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) paint(image.data, (y * N + x) * 4, x, y);
    c.putImageData(image, 0, 0);
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(14, 14);
    if (colour) texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  };
  const h = (x: number, y: number) => height[((y + N) % N) * N + ((x + N) % N)];
  const normalMap = make((d, i, x, y) => {
    const dx = (h(x + 1, y) - h(x - 1, y)) * 2.2;
    const dy = (h(x, y + 1) - h(x, y - 1)) * 2.2;
    const len = Math.hypot(dx, dy, 1);
    d[i] = (-dx / len) * 127 + 128;
    d[i + 1] = (dy / len) * 127 + 128;
    d[i + 2] = (1 / len) * 127 + 128;
    d[i + 3] = 255;
  }, false);
  const map = make((d, i, x, y) => {
    // Warm, slightly uneven skin: redder blotches, a little lighter in the creases' ridges.
    const b = blotch(x, y);
    const v = 0.92 + h(x, y) * 0.08;
    d[i] = Math.min(255, 255 * v);
    d[i + 1] = Math.min(255, (232 - b * 26) * v);
    d[i + 2] = Math.min(255, (222 - b * 34) * v);
    d[i + 3] = 255;
  }, true);
  const roughnessMap = make((d, i, x, y) => {
    const r = 150 + (pores(x, y) - 0.5) * 70 + blotch(x, y) * 30;
    d[i] = d[i + 1] = d[i + 2] = r;
    d[i + 3] = 255;
  }, false);
  return { map, normalMap, roughnessMap };
}

export async function loadHand(url: string): Promise<Hand> {
  // The loader comes in its own file, only when the hand is needed.
  const { GLTFLoader } = await import("three/addons/loaders/GLTFLoader.js");
  const gltf = await new GLTFLoader().loadAsync(url);
  const model = gltf.scene;
  const skin = skinMaps();
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
      mesh.material = nails
        ? new THREE.MeshPhysicalMaterial({ color: 0xf0c9b6, roughness: 0.35, clearcoat: 0.4, clearcoatRoughness: 0.3 })
        : new THREE.MeshPhysicalMaterial({
        color: 0xf0bfa0,
        map: skin.map,
        normalMap: skin.normalMap,
        normalScale: new THREE.Vector2(0.18, 0.18),
        roughnessMap: skin.roughnessMap,
        roughness: 1,
        metalness: 0,
        sheen: 0.6,
        sheenRoughness: 0.4,
        sheenColor: new THREE.Color(0xffc6a8),
        clearcoat: 0.08,
        clearcoatRoughness: 0.6,
      });
      old.dispose();
      // The skinned arm moves far from its bind pose, so its box would cull it wrongly.
      mesh.frustumCulled = false;
    }
  });
  const bone = (prefix: string) => [...bones.values()].find((b) => b.name.startsWith(prefix))!;

  // Only the right arm: the left one is folded away to nothing.
  bone("clavicleL").scale.setScalar(1e-4);

  const joints = FINGERS.map((f) => [1, 2, 3].map((j) => bone(`f_${f}0${j}R`)));
  const thumb = [1, 2, 3].map((j) => bone(`thumb0${j}R`));
  const rest = new Map([...joints.flat(), ...thumb].map((b) => [b, b.rotation.x]));
  let bend: readonly number[] = GRIPS.double.bend;

  /** Bends the fingers: 0 open, 1 closed into a fist. */
  function curl(amount: number) {
    joints.forEach((finger, f) => finger.forEach((b, j) => (b.rotation.x = rest.get(b)! + CLOSED[j] * amount * bend[f])));
    thumb.forEach((b, j) => (b.rotation.x = rest.get(b)! + [0.2, 0.5, 0.4][j] * amount));
  }

  // The placement below is measured on the full fist.
  bend = [1, 1, 1, 1];
  // Find the closed fist's middle and axis, then turn the model so the axis
  // stands upright, the palm faces the mug, and the fist's middle is at the origin.
  curl(1);
  model.updateMatrixWorld(true);
  const at = (b: THREE.Bone) => b.getWorldPosition(new THREE.Vector3());
  const middle = joints[1];
  const tip = bone("f_middle03R_end");
  const knuckle = at(middle[0]);
  const center = new THREE.Vector3().add(knuckle).add(at(middle[1])).add(at(middle[2])).add(at(tip)).multiplyScalar(0.25);
  const axis = at(joints[0][0]).sub(at(joints[3][0])).normalize();
  const towardPalm = center.clone().sub(knuckle);
  towardPalm.addScaledVector(axis, -towardPalm.dot(axis)).normalize();
  // Columns: where the hand's own directions go in the mug's frame.
  const basis = new THREE.Matrix4().makeBasis(towardPalm.clone().negate(), axis, towardPalm.clone().negate().cross(axis));
  const placed = new THREE.Group();
  placed.add(model);
  model.applyMatrix4(new THREE.Matrix4().copy(basis).invert().multiply(new THREE.Matrix4().makeTranslation(-center.x, -center.y, -center.z)));

  // Turn the hand round the bar until the forearm points to the right of the
  // mug and towards the camera, so the arm comes in from the front right
  // instead of crossing the mug. Its direction is then the hand's way in.
  const forearm = () => {
    placed.updateMatrixWorld(true);
    return at(bone("forearmR")).sub(at(bone("handR"))).normalize();
  };
  const before = forearm();
  placed.rotation.y = Math.atan2(before.z, before.x) - Math.atan2(TOWARD_CAMERA, 1);
  const way = forearm();

  const object = new THREE.Group();
  object.add(placed);
  object.visible = false;

  let grip = GRIPS.double;
  bend = grip.bend;
  return {
    object,
    update(reach, closed) {
      object.visible = reach > 0.001;
      if (!object.visible) return;
      const away = (1 - smoothstep(reach)) * AWAY;
      object.position.set(grip.x + way.x * away, grip.y + way.y * away, grip.z + way.z * away);
      curl(OPEN + (1 - OPEN) * smoothstep(closed));
    },
    setShape(id) {
      grip = GRIPS[id];
      bend = grip.bend;
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
