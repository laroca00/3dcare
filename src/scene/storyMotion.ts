// Motion for the last three scenes: part labels, printing and the mug on the table.
import { clamp01, localProgress, smoothstep } from "./timeline.ts";

/** The printed mug: layer count and size in centimetres (layers are drawn thicker than real ones). */
export const LAYERS = 30;
export const LAYER_HEIGHT = 0.3;
export const MUG_RADIUS = 4;

/** Part labels fade in once the printer is more than half apart. */
export function labelOpacity(explode: number): number {
  return smoothstep((explode - 0.5) / 0.3);
}

// The print scene: the printer comes back together (0–0.2), the camera moves
// in to its screen where the visitor slices the mug and picks a colour
// (0.24–0.4), pulls back while the toolpaths appear on the bed, then it prints.

/** 0..1: how far the camera has moved in to the printer's screen. */
export function screenZoom(progress: number): number {
  const t = localProgress(progress, "print");
  return Math.min(smoothstep((t - 0.12) / 0.12), 1 - smoothstep((t - 0.4) / 0.1));
}

/** 0..1: how much the slicer on the printer's screen shows; usable while it is up close. */
export function slicerPanel(progress: number): number {
  const t = localProgress(progress, "print");
  return Math.min(smoothstep((t - 0.22) / 0.04), 1 - smoothstep((t - 0.38) / 0.04));
}

/** 0..1: the sliced toolpaths appearing on the bed, layer by layer, as the camera pulls back. */
export function slicerProgress(progress: number): number {
  return clamp01((localProgress(progress, "print") - 0.4) / 0.08);
}

/** 0..1 progress of the print job: after the toolpaths are on the bed, finished just before the scene ends. */
export function printProgress(progress: number): number {
  return clamp01((localProgress(progress, "print") - 0.48) / 0.47);
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

/** Last scene, u = 0..1: the mug moves from the bed to the table, coffee is poured, then steam rises. */
export function endingMotion(u: number): { lift: number; travel: number; bounce: number; pour: number; steam: number } {
  // After landing the mug hops once, a little, and settles (in cm).
  const landed = clamp01((u - 0.55) / 0.12);
  return {
    lift: smoothstep(u / 0.3),
    travel: smoothstep(u / 0.55),
    bounce: landed > 0 && landed < 1 ? Math.sin(landed * Math.PI) * 0.8 * (1 - landed) : 0,
    pour: smoothstep((u - 0.55) / 0.25),
    steam: smoothstep((u - 0.75) / 0.15),
  };
}
