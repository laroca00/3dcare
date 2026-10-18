import * as THREE from "three";
import type { Printer } from "./printer";

export interface Drawing {
  /** lineT draws the outline; fillT fades the outline out and the real materials in. */
  setReveal(lineT: number, fillT: number): void;
  dispose(): void;
}

const LINE = 0x3cc2b0;
const ACCENT = 0xf5c400;

/**
 * The opening "technical drawing": the printer's own edges drawn as lines,
 * with the logo's concentric arcs behind it, then filled in with materials.
 */
export function createDrawing(printer: Printer): Drawing {
  printer.root.updateMatrixWorld(true);
  const rootInverse = printer.root.matrixWorld.clone().invert();

  // Collect every mesh's sharp edges into one geometry, in build order, so the
  // draw range reveals the printer roughly from the base upwards.
  const positions: number[] = [];
  const v = new THREE.Vector3();
  printer.root.traverse((o) => {
    if (!(o instanceof THREE.Mesh) || o === printer.filament) return;
    const edges = new THREE.EdgesGeometry(o.geometry, 30);
    const toRoot = rootInverse.clone().multiply(o.matrixWorld);
    const attr = edges.getAttribute("position");
    for (let i = 0; i < attr.count; i++) {
      v.fromBufferAttribute(attr, i).applyMatrix4(toRoot);
      positions.push(v.x, v.y, v.z);
    }
    edges.dispose();
  });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  const vertexCount = positions.length / 3;
  const lineMaterial = new THREE.LineBasicMaterial({ color: LINE, transparent: true, depthWrite: false });
  const lines = new THREE.LineSegments(geometry, lineMaterial);
  printer.root.add(lines);

  // Three arcs like the logo, standing behind the printer.
  const arcGroup = new THREE.Group();
  arcGroup.position.set(0, 30, -12);
  const arcMaterials: THREE.LineBasicMaterial[] = [];
  const arcGeometries: THREE.BufferGeometry[] = [];
  [38, 30, 22].forEach((r, i) => {
    const curve = new THREE.EllipseCurve(0, 0, r, r, Math.PI * 0.25, Math.PI * 1.75, false, 0);
    const g = new THREE.BufferGeometry().setFromPoints(curve.getPoints(96));
    const m = new THREE.LineBasicMaterial({ color: i === 0 ? LINE : i === 1 ? 0x2a9d8f : 0x7c63d6, transparent: true, depthWrite: false });
    arcGeometries.push(g);
    arcMaterials.push(m);
    arcGroup.add(new THREE.Line(g, m));
  });
  const dotGeometry = new THREE.CircleGeometry(1.4, 24);
  const dotMaterial = new THREE.MeshBasicMaterial({ color: ACCENT, transparent: true, depthWrite: false });
  arcGroup.add(new THREE.Mesh(dotGeometry, dotMaterial));
  printer.root.add(arcGroup);

  // Real materials fade in while the outline fades out.
  const materials = new Set<THREE.Material>();
  const shadowCasters: THREE.Mesh[] = [];
  printer.root.traverse((o) => {
    if (o instanceof THREE.Mesh && o.parent !== arcGroup) {
      materials.add(o.material as THREE.Material);
      if (o.castShadow) shadowCasters.push(o);
    }
  });
  let lastFill = -1;

  return {
    setReveal(lineT, fillT) {
      geometry.setDrawRange(0, Math.floor((vertexCount * lineT) / 2) * 2);
      const outline = 1 - fillT;
      lineMaterial.opacity = outline;
      lines.visible = outline > 0.01;
      arcMaterials.forEach((m, i) => {
        m.opacity = Math.min(Math.max(lineT * 3 - i, 0), 1) * outline;
      });
      dotMaterial.opacity = lineT * outline;
      arcGroup.visible = outline > 0.01;
      if (fillT !== lastFill) {
        const solid = fillT >= 1;
        for (const m of materials) {
          if (m.transparent !== !solid) {
            m.transparent = !solid;
            m.needsUpdate = true;
          }
          m.opacity = fillT;
          m.depthWrite = solid || fillT > 0.5;
        }
        // A printer that is still only a drawing casts no shadow.
        for (const mesh of shadowCasters) mesh.castShadow = fillT > 0.3;
        lastFill = fillT;
      }
    },
    dispose() {
      geometry.dispose();
      lineMaterial.dispose();
      arcGeometries.forEach((g) => g.dispose());
      arcMaterials.forEach((m) => m.dispose());
      dotGeometry.dispose();
      dotMaterial.dispose();
    },
  };
}
