import type { Object3D, Vector3 } from "three";
import { localProgress, smoothstep } from "./timeline.ts";

export interface ExplodablePart {
  object: Object3D;
  /** Assembled position. */
  home: Vector3;
  /** Offset from home when fully exploded. */
  explodeDir: Vector3;
}

/** Moves each part from home towards its exploded position; amount 0..1 is eased. */
export function setExplode(parts: readonly ExplodablePart[], amount: number): void {
  const t = smoothstep(amount);
  for (const p of parts) p.object.position.copy(p.home).addScaledVector(p.explodeDir, t);
}

/** How far the printer is taken apart at a given story progress. */
export function explodeAmount(progress: number): number {
  const apart = localProgress(progress, "explode");
  // Reassemble during the first fifth of the print scene.
  const together = Math.min(localProgress(progress, "print") / 0.2, 1);
  return Math.max(apart - together, 0);
}
