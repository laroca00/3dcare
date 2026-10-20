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

/** A loop handle: arms out from the wall at the bottom and top, joined by an upright grip. */
const LOOP_ARMS = [...range(5, 7), ...range(22, 24)];
const loop: Omit<MugShape, "sides"> = {
  blocks: range(5, 24).map((layer) =>
    LOOP_ARMS.includes(layer) ? { layer, x: MUG_RADIUS + 1.9, width: 3.8, depth: 1.6 } : { layer, x: MUG_RADIUS + 3.3, width: 1, depth: 2.2 },
  ),
  outline: [
    [[WALL, y(5)], [MUG_RADIUS + 3.8, y(5)], [MUG_RADIUS + 3.8, y(25)], [WALL, y(25)]],
    [[WALL, y(8)], [MUG_RADIUS + 2.8, y(8)], [MUG_RADIUS + 2.8, y(22)], [WALL, y(22)]],
  ],
  reach: MUG_RADIUS + 3.8,
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
