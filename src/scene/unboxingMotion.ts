// The unboxing after the home story, over its section's scroll (p = 0..1):
// the mug lowers into an open box, the flaps fold shut and the box turns to
// show its front, then the flaps open again, the camera goes into the box and
// the pictures come out of it and scroll past.
import { clamp01, smoothstep } from "./timeline.ts";

export function unboxingMotion(p: number): {
  drop: number;
  close: number;
  turn: number;
  open: number;
  dive: number;
  cards: number;
  slide: number;
} {
  return {
    drop: smoothstep(p / 0.22),
    close: smoothstep((p - 0.24) / 0.14),
    turn: smoothstep((p - 0.24) / 0.2),
    open: smoothstep((p - 0.48) / 0.1),
    dive: smoothstep((p - 0.54) / 0.12),
    cards: smoothstep((p - 0.62) / 0.08),
    slide: clamp01((p - 0.68) / 0.32),
  };
}

/** How far each flap is shut, 0 open to 1 shut: the short side flaps fold first, then the long ones. */
export function flapClosure(close: number, open: number): { sides: number; long: number } {
  const shut = (from: number, to: number) => smoothstep((close - from) / (to - from)) * (1 - smoothstep((open - (1 - to)) / (to - from)));
  return { sides: shut(0, 0.6), long: shut(0.4, 1) };
}
