import { smoothstep } from "./timeline.ts";

/** Everything the studio lighting changes between themes. Colours are 0xRRGGBB. */
export interface StudioValues {
  background: number;
  /** Warm light spill painted into the background. */
  glow: number;
  glowStrength: number;
  key: number;
  keyIntensity: number;
  rim: number;
  rimIntensity: number;
  /** Soft sky light. */
  fill: number;
  /** Strength of the environment reflections. */
  env: number;
  /** Opacity of the floor shadow. */
  shadow: number;
}

const COLOR_KEYS = ["background", "glow", "key", "rim"] as const;

function mixColor(a: number, b: number, t: number) {
  let out = 0;
  for (const shift of [16, 8, 0]) {
    const ca = (a >> shift) & 0xff;
    const cb = (b >> shift) & 0xff;
    out |= Math.round(ca + (cb - ca) * t) << shift;
  }
  return out;
}

export function mixStudio(from: StudioValues, to: StudioValues, t: number): StudioValues {
  const k = Math.min(Math.max(t, 0), 1);
  const out = { ...from };
  for (const key of Object.keys(from) as (keyof StudioValues)[]) {
    out[key] = (COLOR_KEYS as readonly string[]).includes(key)
      ? mixColor(from[key], to[key], k)
      : from[key] + (to[key] - from[key]) * k;
  }
  return out;
}

/** Eases the studio from its current values to a new target over a fixed time. */
export class StudioTransition {
  private from: StudioValues;
  private to: StudioValues;
  private elapsed: number;
  private readonly durationMs: number;
  current: StudioValues;

  constructor(initial: StudioValues, durationMs = 600) {
    this.from = initial;
    this.to = initial;
    this.current = initial;
    this.durationMs = durationMs;
    this.elapsed = durationMs;
  }

  start(target: StudioValues) {
    this.from = this.current;
    this.to = target;
    this.elapsed = 0;
  }

  /** Advances the blend; returns true while the transition is still running. */
  step(dtMs: number): boolean {
    if (this.elapsed >= this.durationMs) return false;
    this.elapsed = Math.min(this.elapsed + dtMs, this.durationMs);
    const t = this.elapsed / this.durationMs;
    this.current = t >= 1 ? this.to : mixStudio(this.from, this.to, smoothstep(t));
    return t < 1;
  }
}
