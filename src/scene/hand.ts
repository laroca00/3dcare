// A hand that rises under the freshly printed mug and carries it on its palm.
// The model is "First Person hands rigged" by David Fischer (CC BY 4.0), in cm
// like the mug; only its right arm is used. The wrist is bent back until the
// palm faces away from the elbow, as a waiter carries a tray, then the hand is
// placed so that the palm lies flat under the mug's base with the forearm
// coming up from below.
import * as THREE from "three";
import { smoothstep } from "./timeline";

export interface Hand {
  /** Add to the mug, so the hand moves with it. */
  object: THREE.Group;
  /** reach 0..1: from below the picture to under the mug; grip 0..1: fingers open to cupped round its base. */
  update(reach: number, grip: number): void;
  dispose(): void;
}

const FINGERS = ["index", "middle", "ring", "pinky"] as const;
/** How far each finger joint bends when the hand cups the mug (radians), knuckle first: the fingertips curl up behind the base. */
const CUPPED = [0.1, 0.55, 0.5];
/** While it rises, the hand is held open this much of the way to cupped. */
const OPEN = 0.25;
/** How far the wrist bends back (radians). The rest leaves the forearm leaning towards the camera. */
const WRIST = 1.25;
/** The palm's skin lies this far above the line of its bones (cm). */
const PALM_THICKNESS = 1.5;
/** How far along the palm, from the wrist to the middle knuckle, the mug's centre stands. */
const PALM_CENTRE = 0.7;
/** Where the fingers point, seen from above in the mug's frame (the camera is at +z): to the left and away from the camera. */
const FINGERS_POINT = new THREE.Vector3(-0.8, 0, -0.6).normalize();
/** How far below the hand starts (cm). */
const AWAY = 46;

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
      // A deep skin tone that sits in the room's low light, lit mostly by its rim.
      mesh.material = nails
        ? new THREE.MeshPhysicalMaterial({ color: 0xb98a76, roughness: 0.35, clearcoat: 0.4, clearcoatRoughness: 0.3 })
        : new THREE.MeshPhysicalMaterial({
        color: 0x74503f,
        map: skin.map,
        normalMap: skin.normalMap,
        normalScale: new THREE.Vector2(0.1, 0.1),
        roughnessMap: skin.roughnessMap,
        roughness: 1,
        metalness: 0,
        sheen: 0.5,
        sheenRoughness: 0.4,
        sheenColor: new THREE.Color(0xd99a7c),
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

  /** Bends the fingers: 0 as the model rests, 1 cupped round the mug's base. */
  function curl(amount: number) {
    joints.forEach((finger) => finger.forEach((b, j) => (b.rotation.x = rest.get(b)! + CUPPED[j] * amount)));
    thumb.forEach((b, j) => (b.rotation.x = rest.get(b)! + [0.1, 0.3, 0.25][j] * amount));
  }

  const at = (b: THREE.Bone) => b.getWorldPosition(new THREE.Vector3());
  const wristBone = bone("handR");
  const middle = joints[1][0];
  /** The hand's own directions: along the fingers, and out of the palm. */
  function palmFrame() {
    model.updateMatrixWorld(true);
    const wrist = at(wristBone);
    const knuckle = at(middle);
    const along = knuckle.clone().sub(wrist).normalize();
    const across = at(joints[0][0]).sub(at(joints[3][0])).normalize();
    const out = along.clone().cross(across).normalize();
    return { wrist, knuckle, along, out };
  }
  // Which side the palm is on: the side the fingertips curl towards.
  curl(3);
  const curled = at(bone("f_middle03R_end")).sub(at(middle));
  curl(0);
  let frame = palmFrame();
  const side = Math.sign(frame.out.dot(curled)) || 1;
  // Bend the wrist back: the fingers swing towards the back of the hand.
  const backwards = frame.along.clone().cross(frame.out.clone().multiplyScalar(-side)).normalize();
  const parentTurn = wristBone.parent!.getWorldQuaternion(new THREE.Quaternion());
  const turned = new THREE.Quaternion().setFromAxisAngle(backwards, WRIST).multiply(wristBone.getWorldQuaternion(new THREE.Quaternion()));
  wristBone.quaternion.copy(parentTurn.invert().multiply(turned));

  // Turn the model so the palm faces up and the fingers point where they
  // should, with the mug's base centre on the palm.
  curl(1);
  frame = palmFrame();
  const up = frame.out.multiplyScalar(side);
  const along = frame.along.addScaledVector(up, -frame.along.dot(up)).normalize();
  const centre = frame.wrist.lerp(frame.knuckle, PALM_CENTRE).addScaledVector(up, PALM_THICKNESS);
  const from = new THREE.Matrix4().makeBasis(up.clone().cross(along), up, along);
  const Y = new THREE.Vector3(0, 1, 0);
  const to = new THREE.Matrix4().makeBasis(Y.clone().cross(FINGERS_POINT), Y, FINGERS_POINT);
  const placed = new THREE.Group();
  placed.add(model);
  model.applyMatrix4(to.multiply(from.invert()).multiply(new THREE.Matrix4().makeTranslation(-centre.x, -centre.y, -centre.z)));

  const object = new THREE.Group();
  object.add(placed);
  object.visible = false;

  return {
    object,
    update(reach, cupped) {
      object.visible = reach > 0.001;
      if (!object.visible) return;
      object.position.y = -(1 - smoothstep(reach)) * AWAY;
      curl(OPEN + (1 - OPEN) * smoothstep(cupped));
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
