// A hand that reaches for the freshly printed mug and closes round a handle.
// The model is "First Person hands rigged" by David Fischer (CC BY 4.0), in cm
// like the mug; only its right arm is used. The hand is posed by bending the
// finger bones, then placed so that the middle of the closed fist sits on the
// handle's upright bar.
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
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

/** Where the fist closes round each handle, on the mug's +x side (cm), and how tight. */
const GRIPS: Record<MugShapeId, { x: number; y: number; tight: number }> = {
  double: { x: 7.3, y: 4.6, tight: 1 },
  single: { x: 7.3, y: 4.6, tight: 1 },
  tgrip: { x: 7.6, y: 5.2, tight: 0.85 },
};
/** How much the forearm points towards the camera, for each cm it points to the right. */
const TOWARD_CAMERA = 0.9;
/** How far away the hand starts (cm). */
const AWAY = 40;

export async function loadHand(url: string): Promise<Hand> {
  const gltf = await new GLTFLoader().loadAsync(url);
  const model = gltf.scene;
  const bones = new Map<string, THREE.Bone>();
  model.traverse((o) => {
    if ((o as THREE.Bone).isBone) bones.set(o.name, o as THREE.Bone);
    const mesh = o as THREE.SkinnedMesh;
    if (mesh.isSkinnedMesh) {
      mesh.castShadow = mesh.receiveShadow = true;
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
  let tight = 1;

  /** Bends the fingers: 0 open, 1 closed into a fist. */
  function curl(amount: number) {
    for (const finger of joints) finger.forEach((b, j) => (b.rotation.x = rest.get(b)! + CLOSED[j] * amount * tight));
    thumb.forEach((b, j) => (b.rotation.x = rest.get(b)! + [0.2, 0.5, 0.4][j] * amount));
  }

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
  return {
    object,
    update(reach, closed) {
      object.visible = reach > 0.001;
      if (!object.visible) return;
      const away = (1 - smoothstep(reach)) * AWAY;
      object.position.set(grip.x + way.x * away, grip.y + way.y * away, way.z * away);
      curl(OPEN + (1 - OPEN) * smoothstep(closed));
    },
    setShape(id) {
      grip = GRIPS[id];
      tight = grip.tight;
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
