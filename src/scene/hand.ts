import * as THREE from "three";
import type { QualityLevel } from "./quality";

export interface Hand {
  object: THREE.Group;
  /** 0 = open hand, 1 = fingers closed around the handle. */
  setPose(t: number): void;
  dispose(): void;
}

/**
 * A stylised, sculpted hand in a matte clay finish, in the same material
 * language as the printer. Palm faces -x so it can reach the handle from the right.
 */
export function createHand(quality: QualityLevel): Hand {
  const material = new THREE.MeshStandardMaterial({ color: 0xc9b4a2, roughness: 0.62, metalness: 0 });
  const capSegments = quality === 2 ? 8 : 4;
  const radial = quality === 2 ? 16 : 8;
  const geometries: THREE.BufferGeometry[] = [];
  const object = new THREE.Group();

  const add = (parent: THREE.Object3D, g: THREE.BufferGeometry) => {
    geometries.push(g);
    const mesh = new THREE.Mesh(g, material);
    mesh.castShadow = mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  };

  const palm = add(object, new THREE.SphereGeometry(1, radial * 2, radial));
  palm.scale.set(1.5, 4.4, 3.8);

  // Forearm reaching in from the lower right.
  const arm = add(object, new THREE.CapsuleGeometry(1.9, 12, capSegments, radial));
  arm.position.set(3.2, -9, 0);
  arm.rotation.z = 0.5;

  // Four fingers, each with two segments that curl around the handle.
  const fingers: { knuckle: THREE.Group; middle: THREE.Group }[] = [];
  [-2.6, -0.9, 0.85, 2.5].forEach((z, i) => {
    const knuckle = new THREE.Group();
    knuckle.position.set(-0.6, 3.6 - Math.abs(i - 1.5) * 0.35, z);
    object.add(knuckle);
    const first = add(knuckle, new THREE.CapsuleGeometry(0.72, 2.2, capSegments, radial));
    first.position.y = 1.8;
    const middle = new THREE.Group();
    middle.position.y = 3.4;
    knuckle.add(middle);
    const second = add(middle, new THREE.CapsuleGeometry(0.66, 1.9, capSegments, radial));
    second.position.y = 1.4;
    fingers.push({ knuckle, middle });
  });

  const thumb = new THREE.Group();
  thumb.position.set(-0.8, -1.2, -3.4);
  object.add(thumb);
  const thumbMesh = add(thumb, new THREE.CapsuleGeometry(0.85, 3, capSegments, radial));
  thumbMesh.position.y = 2;

  return {
    object,
    setPose(t) {
      for (const f of fingers) {
        f.knuckle.rotation.z = 0.25 + t * 1.25;
        f.middle.rotation.z = 0.2 + t * 1.35;
      }
      thumb.rotation.x = -0.9 + t * 0.6;
      thumb.rotation.z = 0.4 + t * 0.5;
    },
    dispose() {
      geometries.forEach((g) => g.dispose());
      material.dispose();
    },
  };
}
