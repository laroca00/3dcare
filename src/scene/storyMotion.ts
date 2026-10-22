// Motion for the last three scenes: part labels, printing and the mug on the table.
import { clamp01, localProgress, smoothstep } from "./timeline.ts";

/** The printed mug: layer count and size in centimetres (layers are drawn thicker than real ones). */
export const LAYERS = 60;
export const LAYER_HEIGHT = 0.15;
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

/**
 * The mug takes over, r = 0..1: the print head lifts away, the mug rises off
 * the bed towards the camera turning once, and the giant line glows behind it.
 * Once it has stopped turning, a hand reaches in (reach), closes its fingers
 * round a handle (grip), and lets go again before the scene ends.
 */
export function revealMotion(r: number): { lift: number; rise: number; turn: number; type: number; reach: number; grip: number } {
  return {
    lift: smoothstep(r / 0.2),
    rise: smoothstep((r - 0.1) / 0.4),
    turn: smoothstep((r - 0.1) / 0.5) * Math.PI * 2,
    type: Math.min(smoothstep((r - 0.25) / 0.2), 1 - smoothstep((r - 0.85) / 0.15)),
    reach: Math.min(smoothstep((r - 0.5) / 0.22), 1 - smoothstep((r - 0.88) / 0.12)),
    grip: Math.min(smoothstep((r - 0.66) / 0.1), 1 - smoothstep((r - 0.84) / 0.06)),
  };
}

/** Last scene, u = 0..1: the mug moves down to the table, coffee is poured, then steam rises. */
export function endingMotion(u: number): { travel: number; bounce: number; pour: number; steam: number } {
  // After landing the mug hops once, a little, and settles (in cm).
  const landed = clamp01((u - 0.55) / 0.12);
  return {
    travel: smoothstep(u / 0.55),
    bounce: landed > 0 && landed < 1 ? Math.sin(landed * Math.PI) * 0.8 * (1 - landed) : 0,
    pour: smoothstep((u - 0.55) / 0.25),
    steam: smoothstep((u - 0.75) / 0.15),
  };
}

/**
 * The four looks at the fresh mug, each 0..1: through a thermal camera (with
 * how far it has cooled), as a plan whose construction circles gather into the
 * wordmark, up close on its layers, and in the material's cream room. `hero`
 * holds the mug facing the camera (and beside the text on wide screens)
 * through all four.
 */
export function heroLooks(progress: number): {
  hero: number;
  thermal: number;
  cool: number;
  plan: number;
  gather: number;
  macro: number;
  material: number;
} {
  const h = localProgress(progress, "heat");
  const pl = localProgress(progress, "plan");
  const l = localProgress(progress, "layers");
  const m = localProgress(progress, "material");
  const out = 1 - smoothstep((m - 0.8) / 0.2);
  return {
    hero: Math.min(smoothstep(h / 0.3), out),
    thermal: Math.min(smoothstep(h / 0.25), 1 - smoothstep((h - 0.8) / 0.2)),
    cool: h,
    plan: Math.min(smoothstep(pl / 0.2), 1 - smoothstep((pl - 0.85) / 0.15)),
    gather: smoothstep((pl - 0.3) / 0.45),
    macro: Math.min(smoothstep(l / 0.35), 1 - smoothstep((l - 0.75) / 0.25)),
    material: Math.min(smoothstep(m / 0.25), out),
  };
}
