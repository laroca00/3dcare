import * as THREE from "three";
import { Line2 } from "three/addons/lines/Line2.js";
import { LineGeometry } from "three/addons/lines/LineGeometry.js";
import { LineMaterial } from "three/addons/lines/LineMaterial.js";
import { LineSegments2 } from "three/addons/lines/LineSegments2.js";
import { LineSegmentsGeometry } from "three/addons/lines/LineSegmentsGeometry.js";
import type { Theme } from "../theme/theme";
import type { Printer } from "./printer";

export interface Drawing {
  /** lineT draws the outline; fillT fades the outline out and the real materials in. */
  setReveal(lineT: number, fillT: number): void;
  setTheme(theme: Theme): void;
  /** Line widths are in pixels, so the lines need the canvas size. */
  setResolution(width: number, height: number): void;
  dispose(): void;
}

// The site's teal and violet: deep on paper, bright on the dark studio.
const LINE: Record<Theme, number> = { light: 0x00756a, dark: 0x3cc2b0 };
const ARCS: Record<Theme, number[]> = {
  light: [0x00756a, 0x2a9d8f, 0x5b3fa8],
  dark: [0x3cc2b0, 0x2a9d8f, 0x7c63d6],
};
const ACCENT = 0xf5c400;

/**
 * The opening "technical drawing": the printer's own edges drawn as lines,
 * with the logo's concentric arcs behind it, then filled in with materials.
 */
export function createDrawing(printer: Printer, theme: Theme): Drawing {
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
  const geometry = new LineSegmentsGeometry().setPositions(positions);
  const segmentCount = positions.length / 6;
  const lineMaterial = new LineMaterial({ color: LINE[theme], linewidth: 1.6, transparent: true, depthWrite: false });
  const lines = new LineSegments2(geometry, lineMaterial);
  printer.root.add(lines);

  // Three arcs like the logo, standing behind the printer.
  const arcGroup = new THREE.Group();
  arcGroup.position.set(0, 30, -12);
  const arcMaterials: LineMaterial[] = [];
  const arcGeometries: LineGeometry[] = [];
  [38, 30, 22].forEach((r, i) => {
    const curve = new THREE.EllipseCurve(0, 0, r, r, Math.PI * 0.25, Math.PI * 1.75, false, 0);
    const g = new LineGeometry().setPositions(curve.getPoints(96).flatMap((p) => [p.x, p.y, 0]));
    const m = new LineMaterial({ color: ARCS[theme][i], linewidth: 2.4, transparent: true, depthWrite: false });
    arcGeometries.push(g);
    arcMaterials.push(m);
    arcGroup.add(new Line2(g, m));
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
      geometry.instanceCount = Math.floor(segmentCount * lineT);
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
    setTheme(next) {
      lineMaterial.color.setHex(LINE[next]);
      arcMaterials.forEach((m, i) => m.color.setHex(ARCS[next][i]));
    },
    setResolution(width, height) {
      lineMaterial.resolution.set(width, height);
      arcMaterials.forEach((m) => m.resolution.set(width, height));
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
