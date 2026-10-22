// The open model package, at the end of "design and print" (q = 0..1 through
// the package scene): a box rises under the floating mug, the mug lowers into
// it, the flaps fold shut and the box turns its label to the camera while what
// comes with every model is listed. Then it opens, the camera looks inside and
// the pictures come out as a strip that slides past. Finally the camera pulls
// back, the mug lifts out and the box sinks away, ready for the morning table.
import { clamp01, smoothstep } from "./timeline.ts";

export function packageMotion(q: number): {
  box: number;
  frame: number;
  drop: number;
  close: number;
  turn: number;
  open: number;
  dive: number;
  cards: number;
  slide: number;
  contents: number;
} {
  const lift = smoothstep((q - 0.88) / 0.1);
  const close = smoothstep((q - 0.16) / 0.1);
  const open = smoothstep((q - 0.34) / 0.08);
  return {
    box: Math.min(smoothstep(q / 0.06), 1 - smoothstep((q - 0.94) / 0.06)),
    frame: Math.min(smoothstep(q / 0.1), 1 - smoothstep((q - 0.88) / 0.1)),
    drop: smoothstep((q - 0.04) / 0.12) * (1 - lift),
    close,
    turn: smoothstep((q - 0.16) / 0.14),
    open,
    dive: Math.min(smoothstep((q - 0.38) / 0.08), 1 - smoothstep((q - 0.82) / 0.06)),
    cards: Math.min(smoothstep((q - 0.44) / 0.06), 1 - smoothstep((q - 0.8) / 0.05)),
    slide: clamp01((q - 0.48) / 0.32),
    contents: Math.min(close, 1 - open),
  };
}

/** How far each flap is shut, 0 open to 1 shut: the short side flaps fold first, then the long ones. */
export function flapClosure(close: number, open: number): { sides: number; long: number } {
  const shut = (from: number, to: number) => smoothstep((close - from) / (to - from)) * (1 - smoothstep((open - (1 - to)) / (to - from)));
  return { sides: shut(0, 0.6), long: shut(0.4, 1) };
}
