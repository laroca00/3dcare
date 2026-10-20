import * as THREE from "three";
import { LineMaterial } from "three/addons/lines/LineMaterial.js";
import { LineSegments2 } from "three/addons/lines/LineSegments2.js";
import { LineSegmentsGeometry } from "three/addons/lines/LineSegmentsGeometry.js";
import type { Theme } from "../theme/theme";

export interface Lineup {
  /** Stands on the table with the printed mug at its front left corner. */
  object: THREE.Group;
  /** 0..1: the nine tools are drawn in one after another. */
  setReveal(t: number): void;
  setTheme(theme: Theme): void;
  /** Line widths are in pixels, so the lines need the canvas size. */
  setResolution(width: number, height: number): void;
  dispose(): void;
}

// The site's teal, deep on paper and bright on the dark studio, as in the opening drawing.
const LINE: Record<Theme, number> = { light: 0x00756a, dark: 0x3cc2b0 };

type Piece = [THREE.BufferGeometry, [number, number, number], [number, number, number]?];

/**
 * The other nine tools of the project, as outline sketches: they are still
 * being designed (work package 3), so these are simple placeholder shapes in
 * centimetres, standing on y = 0.
 */
function tools(): Piece[][] {
  const cylinder = (rTop: number, rBottom: number, h: number, open = false, arc = Math.PI * 2) =>
    new THREE.CylinderGeometry(rTop, rBottom, h, 14, 1, open, 0, arc);
  return [
    // Spoon with a thick, easy-grip handle.
    [
      [new THREE.CapsuleGeometry(1.2, 7, 3, 10), [0, 5, 0]],
      [new THREE.SphereGeometry(2, 10, 6).scale(1, 1.35, 0.5), [0, 12.4, 0]],
    ],
    // Key turner.
    [
      [new THREE.BoxGeometry(5, 6.5, 1.6), [0, 3.25, 0]],
      [new THREE.BoxGeometry(1.1, 3, 0.4), [0, 8, 0]],
    ],
    // Jar opener.
    [
      [cylinder(4.4, 5, 2), [0, 1, 0]],
      [new THREE.TorusGeometry(4.4, 0.3, 6, 24), [0, 2, 0], [Math.PI / 2, 0, 0]],
    ],
    // Button hook.
    [
      [cylinder(1.3, 1.3, 8), [0, 4, 0]],
      [new THREE.TorusGeometry(1.2, 0.25, 6, 16, Math.PI * 1.4), [0, 9.4, 0]],
    ],
    // Plate guard: a curved wall that clips to a plate.
    [
      [cylinder(6, 6, 3.2, true, Math.PI), [0, 1.6, 0]],
      [new THREE.BoxGeometry(1.2, 1, 1.2), [0, 0.5, 6]],
    ],
    // Pen grip.
    [
      [cylinder(1, 1, 9), [0, 4.5, 0]],
      [new THREE.SphereGeometry(2, 10, 6).scale(1, 1.4, 1), [0, 4, 0]],
    ],
    // Tap turner.
    [
      [new THREE.BoxGeometry(8, 1.4, 1.4), [0, 6.5, 0]],
      [new THREE.BoxGeometry(1.4, 6, 1.4), [0, 3, 0]],
    ],
    // Zip puller.
    [
      [new THREE.TorusGeometry(2.5, 0.5, 6, 20), [0, 3, 0]],
      [new THREE.BoxGeometry(1, 3, 1), [0, 7, 0]],
    ],
    // Card holder.
    [
      [new THREE.BoxGeometry(6, 1.4, 5), [0, 0.7, 0]],
      [new THREE.BoxGeometry(6, 5, 0.6), [0, 3.6, -1.4], [-0.35, 0, 0]],
    ],
  ];
}

/** Ten places in two rows of five, 15 cm apart; the mug takes the first. */
const SLOTS: [number, number][] = [...Array(10).keys()].map((i) => [(i % 5) * 15, -Math.floor(i / 5) * 16]);

export function createLineup(theme: Theme): Lineup {
  const object = new THREE.Group();
  const material = new LineMaterial({ color: LINE[theme], linewidth: 1.4, transparent: true, depthWrite: false });
  const items: { line: LineSegments2; geometry: LineSegmentsGeometry; segments: number }[] = [];
  const matrix = new THREE.Matrix4();
  const point = new THREE.Vector3();

  tools().forEach((pieces, i) => {
    const positions: number[] = [];
    for (const [shape, at, turn = [0, 0, 0]] of pieces) {
      matrix.compose(new THREE.Vector3(...at), new THREE.Quaternion().setFromEuler(new THREE.Euler(...turn)), new THREE.Vector3(1, 1, 1));
      const edges = new THREE.EdgesGeometry(shape, 25);
      const attr = edges.getAttribute("position");
      for (let k = 0; k < attr.count; k++) {
        point.fromBufferAttribute(attr, k).applyMatrix4(matrix);
        positions.push(point.x, point.y, point.z);
      }
      edges.dispose();
      shape.dispose();
    }
    const geometry = new LineSegmentsGeometry().setPositions(positions);
    const line = new LineSegments2(geometry, material);
    const [x, z] = SLOTS[i + 1];
    line.position.set(x, 0, z);
    line.visible = false;
    object.add(line);
    items.push({ line, geometry, segments: positions.length / 6 });
  });

  return {
    object,
    setReveal(t) {
      items.forEach(({ line, geometry, segments }, i) => {
        const local = Math.min(Math.max((t - i * 0.07) / 0.4, 0), 1);
        line.visible = local > 0;
        geometry.instanceCount = Math.floor(segments * local);
      });
    },
    setTheme(next) {
      material.color.setHex(LINE[next]);
    },
    setResolution(width, height) {
      material.resolution.set(width, height);
    },
    dispose() {
      items.forEach(({ geometry }) => geometry.dispose());
      material.dispose();
    },
  };
}
