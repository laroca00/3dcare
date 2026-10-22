// The mug's handles, chosen in the slicer: two loops, one loop, or a T-grip on
// each side for a closed fist. The same 30 drawn layers as the wall, measured
// in cm on the mug (x outwards from its axis, y up from its base).
import { LAYER_HEIGHT, MUG_RADIUS } from "./storyMotion.ts";

export type MugShapeId = "double" | "single" | "tgrip";
export const MUG_SHAPES: readonly MugShapeId[] = ["double", "single", "tgrip"];

/** One printed block of a handle in one layer, on the +x side: centre x, width along x, depth along z. */
export interface HandleBlock {
  layer: number;
  x: number;
  width: number;
  depth: number;
  /** A thinner slice within the layer: its bottom and its height, as fractions of the layer (whole layer if left out). */
  slice?: { from: number; size: number };
}

export interface MugShape {
  /** Which sides have a handle: 1 is +x, -1 is -x. */
  sides: readonly (1 | -1)[];
  /** The handle's blocks on the +x side, bottom layer first (a layer may have more than one). */
  blocks: readonly HandleBlock[];
  /** The handle's outline seen from the side (+x side), for the plan. */
  outline: readonly [number, number][][];
  /** How far the handle reaches from the axis (cm). */
  reach: number;
}

const WALL = MUG_RADIUS + 0.2;
const y = (layer: number) => layer * LAYER_HEIGHT;
const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => from + i);

/**
 * A loop handle: a round tube (radius TUBE) bent in a half ellipse from the
 * wall low down, out to an upright grip and back to the wall high up. Each
 * printed layer is the tube's slice at that height, so the stack of layers
 * makes a smooth loop.
 */
const TUBE = 0.55;
const LOOP = { out: 3.25, middle: 4.65, half: 2.9 };
const loopPoint = (t: number): [number, number] => [MUG_RADIUS + LOOP.out * Math.sin(t), LOOP.middle - LOOP.half * Math.cos(t)];

/** The tube's slice at each layer: how far it spans along x, and how deep it is. */
/** Each layer of the loop is drawn as this many thinner slices, so the curve reads smoothly. */
const SLICES = 3;
/** Rounded to 0.01 mm, so the same numbers come out on the server and in the browser. */
const round = (v: number) => Math.round(v * 1000) / 1000;

function loopBlocks(): HandleBlock[] {
  const blocks: HandleBlock[] = [];
  for (let layer = 0; layer < 30; layer++) for (let s = 0; s < SLICES; s++) {
    const height = (layer + (s + 0.5) / SLICES) * LAYER_HEIGHT;
    let min = Infinity;
    let max = -Infinity;
    let deepest = 0;
    for (let i = 0; i <= 240; i++) {
      const [x, py] = loopPoint((i / 240) * Math.PI);
      const dy = Math.abs(py - height);
      if (dy >= TUBE) continue;
      const across = Math.sqrt(TUBE * TUBE - dy * dy);
      min = Math.min(min, x - across);
      max = Math.max(max, x + across);
      deepest = Math.max(deepest, across);
    }
    if (max < min) continue;
    // The part inside the wall is hidden anyway; the slice starts at the wall.
    min = Math.max(min, MUG_RADIUS - 0.1);
    blocks.push({ layer, x: round((min + max) / 2), width: round(max - min), depth: round(deepest * 2), slice: { from: s / SLICES, size: 1 / SLICES } });
  }
  return blocks;
}

/** The loop's outer and inner edge seen from the side, for the plan. */
function loopOutline(grow: number): [number, number][] {
  return Array.from({ length: 41 }, (_, i) => {
    const t = (i / 40) * Math.PI;
    return [round(MUG_RADIUS + (LOOP.out + grow) * Math.sin(t)), round(LOOP.middle - (LOOP.half + grow) * Math.cos(t))];
  });
}

const loop: Omit<MugShape, "sides"> = {
  blocks: loopBlocks(),
  outline: [loopOutline(TUBE), loopOutline(-TUBE)],
  reach: MUG_RADIUS + LOOP.out + TUBE,
};

/** A T-grip: a short stem from the wall at mid height and a thick upright bar to close a fist round. */
const STEM = range(12, 17);
const tgrip: Omit<MugShape, "sides"> = {
  blocks: range(5, 24).flatMap((layer) => [
    ...(STEM.includes(layer) ? [{ layer, x: MUG_RADIUS + 1.4, width: 2.8, depth: 1.6 }] : []),
    { layer, x: MUG_RADIUS + 3.6, width: 1.6, depth: 2.6 },
  ]),
  outline: [
    [
      [WALL, y(12)],
      [MUG_RADIUS + 2.8, y(12)],
      [MUG_RADIUS + 2.8, y(5)],
      [MUG_RADIUS + 4.4, y(5)],
      [MUG_RADIUS + 4.4, y(25)],
      [MUG_RADIUS + 2.8, y(25)],
      [MUG_RADIUS + 2.8, y(18)],
      [WALL, y(18)],
    ],
  ],
  reach: MUG_RADIUS + 4.4,
};

export const SHAPES: Record<MugShapeId, MugShape> = {
  double: { ...loop, sides: [1, -1] },
  single: { ...loop, sides: [1] },
  tgrip: { ...tgrip, sides: [1, -1] },
};

/** Width across the mug and its handles, seen from the side (cm). */
export function mugWidth(id: MugShapeId): number {
  const shape = SHAPES[id];
  const right = shape.sides.includes(1) ? shape.reach : WALL;
  const left = shape.sides.includes(-1) ? shape.reach : WALL;
  return Math.round((right + left) * 10) / 10;
}
