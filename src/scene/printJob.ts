import * as THREE from "three";
import type { QualityLevel } from "./quality";
import { LAYERS, LAYER_HEIGHT, MUG_RADIUS, nozzlePath } from "./storyMotion";

export interface PrintJob {
  /** The printed mug; stands on the bed surface. */
  object: THREE.Group;
  /** 0..1: how much of the mug has been printed. */
  setProgress(t: number): void;
  dispose(): void;
}

// The easy-grip mug: a round wall with a large loop handle on +x, built from
// the same layers a slicer would print.
const BASE_LAYERS = 2;
const ARM_LAYERS = new Set([5, 6, 7, 22, 23, 24]);
const GRIP_FROM = 8;
const GRIP_TO = 21;

export function createPrintJob(bedSurface: THREE.Object3D, quality: QualityLevel): PrintJob {
  const object = new THREE.Group();
  bedSurface.add(object);

  const filament = new THREE.MeshStandardMaterial({ color: 0xe9e4d8, roughness: 0.42, metalness: 0 });
  const current = new THREE.MeshStandardMaterial({ color: 0xf5c400, emissive: 0x6b4e00, roughness: 0.4 });
  const segments = quality === 2 ? 64 : 32;
  const thickness = LAYER_HEIGHT * 0.9;

  const ringShape = new THREE.Shape().absarc(0, 0, MUG_RADIUS + 0.2, 0, Math.PI * 2, false);
  ringShape.holes.push(new THREE.Path().absarc(0, 0, MUG_RADIUS - 0.2, 0, Math.PI * 2, true));
  const ring = new THREE.ExtrudeGeometry(ringShape, { depth: thickness, bevelEnabled: false, curveSegments: segments });
  ring.rotateX(-Math.PI / 2);
  const disc = new THREE.CylinderGeometry(MUG_RADIUS + 0.2, MUG_RADIUS + 0.2, thickness, segments).translate(0, thickness / 2, 0);
  const block = new THREE.BoxGeometry(1, thickness, 1).translate(0, thickness / 2, 0);

  // One instanced mesh per shape; instance i is layer i, so `count` reveals layers bottom-up.
  const walls = new THREE.InstancedMesh(ring, filament, LAYERS);
  const bases = new THREE.InstancedMesh(disc, filament, BASE_LAYERS);
  const handleLayers = [...Array(LAYERS).keys()].filter((i) => ARM_LAYERS.has(i) || (i >= GRIP_FROM && i <= GRIP_TO));
  const handle = new THREE.InstancedMesh(block, filament, handleLayers.length);
  const m = new THREE.Matrix4();
  for (let i = 0; i < LAYERS; i++) walls.setMatrixAt(i, m.makeTranslation(0, i * LAYER_HEIGHT, 0));
  for (let i = 0; i < BASE_LAYERS; i++) bases.setMatrixAt(i, m.makeTranslation(0, i * LAYER_HEIGHT, 0));
  handleLayers.forEach((layer, i) => {
    const arm = ARM_LAYERS.has(layer);
    // Arms reach out from the wall; the grip is the upright bar of the loop.
    const [x, width, depth] = arm ? [MUG_RADIUS + 1.9, 3.8, 1.6] : [MUG_RADIUS + 3.3, 1, 2.2];
    m.compose(new THREE.Vector3(x, layer * LAYER_HEIGHT, 0), new THREE.Quaternion(), new THREE.Vector3(width, 1, depth));
    handle.setMatrixAt(i, m);
  });
  for (const mesh of [walls, bases, handle]) {
    mesh.castShadow = mesh.receiveShadow = true;
    object.add(mesh);
  }

  const currentLayer = new THREE.Mesh(ring, current);
  object.add(currentLayer);

  return {
    object,
    setProgress(t) {
      const { layer } = nozzlePath(t);
      const done = t <= 0 ? 0 : t >= 1 ? LAYERS : layer;
      walls.count = done;
      bases.count = Math.min(done, BASE_LAYERS);
      handle.count = handleLayers.filter((l) => l < done).length;
      currentLayer.visible = t > 0 && t < 1;
      currentLayer.position.y = Math.min(layer, LAYERS - 1) * LAYER_HEIGHT;
    },
    dispose() {
      [ring, disc, block].forEach((g) => g.dispose());
      [filament, current].forEach((mat) => mat.dispose());
      [walls, bases, handle].forEach((mesh) => mesh.dispose());
    },
  };
}
