// Motion for the last three scenes: part labels, printing and the hand.
import { clamp01, localProgress, smoothstep } from "./timeline.ts";

/** The printed mug: layer count and size in centimetres (layers are drawn thicker than real ones). */
export const LAYERS = 30;
export const LAYER_HEIGHT = 0.3;
export const MUG_RADIUS = 4;

/** Part labels fade in once the printer is more than half apart. */
export function labelOpacity(explode: number): number {
  return smoothstep((explode - 0.5) / 0.3);
}

/** 0..1 progress of the print job: after reassembly, finished just before the scene ends. */
export function printProgress(progress: number): number {
  return clamp01((localProgress(progress, "print") - 0.2) / 0.75);
}

/** Where the nozzle is at print progress t: tracing the mug wall, one loop per layer. */
export function nozzlePath(t: number): { x: number; y: number; z: number; layer: number } {
  const s = clamp01(t) * LAYERS;
  const layer = Math.floor(s);
  const angle = (s - layer) * Math.PI * 2;
  return {
    x: Math.cos(angle) * MUG_RADIUS,
    z: Math.sin(angle) * MUG_RADIUS,
    y: (Math.min(layer, LAYERS - 1) + 1) * LAYER_HEIGHT,
    layer,
  };
}

/** Last scene, u = 0..1: the mug lifts off the bed, a hand comes in and closes around it. */
export function handMotion(u: number): { lift: number; hand: number; grip: number } {
  return {
    lift: smoothstep(u / 0.3),
    hand: smoothstep((u - 0.3) / 0.35),
    grip: smoothstep((u - 0.65) / 0.3),
  };
}
