import type { Object3D, Vector3 } from "three";
import { clamp01, localProgress, smoothstep } from "./timeline.ts";

export interface ExplodablePart {
  object: Object3D;
  /** Assembled position. */
  home: Vector3;
  /** Offset from home when fully exploded. */
  explodeDir: Vector3;
}

/** Eases out past the end and settles back, like a part lifted off and let go. */
export function easeOutBack(t: number, overshoot = 1.4): number {
  const x = clamp01(t) - 1;
  return 1 + x * x * ((overshoot + 1) * x + overshoot);
}

/**
 * Moves each part from home towards its exploded position; amount 0..1 is
 * eased. With a stagger, the last part in the list moves first and each one
 * before it follows a little later, settling with a slight overshoot.
 */
export function setExplode(parts: readonly ExplodablePart[], amount: number, stagger = 0): void {
  const span = 1 - stagger * (parts.length - 1);
  parts.forEach((p, i) => {
    const local = clamp01((amount - stagger * (parts.length - 1 - i)) / span);
    const t = stagger ? easeOutBack(smoothstep(local)) : smoothstep(local);
    p.object.position.copy(p.home).addScaledVector(p.explodeDir, t);
  });
}

/**
 * How far the printer is taken apart at a given story progress: it starts
 * once the printer has nearly reached the middle of the stage.
 */
export function explodeAmount(progress: number): number {
  const apart = clamp01((localProgress(progress, "explode") - 0.35) / 0.5);
  // Reassemble during the first fifth of the print scene.
  const together = Math.min(localProgress(progress, "print") / 0.2, 1);
  return Math.max(apart - together, 0);
}

/** 0..1: how far the printer has moved to the middle of the stage (it goes back while printing starts). */
export function centerAmount(progress: number): number {
  const there = smoothstep(localProgress(progress, "explode") / 0.45);
  const back = smoothstep(localProgress(progress, "print") / 0.25);
  return Math.max(there - back, 0);
}

/** Radians: one full turn on its own axis while the printer moves to the middle. */
export function spinTurn(progress: number): number {
  return smoothstep(localProgress(progress, "explode") / 0.5) * Math.PI * 2;
}
