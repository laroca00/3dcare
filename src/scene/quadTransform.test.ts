import assert from "node:assert/strict";
import { test } from "node:test";
import { quadTransform, type Point } from "./quadTransform.ts";

/** Applies a CSS matrix3d (column-major) to a 2D point, with the perspective divide. */
function apply(css: string, [x, y]: Point): Point {
  const m = css.slice(9, -1).split(",").map(Number);
  const w = m[3] * x + m[7] * y + m[15];
  return [(m[0] * x + m[4] * y + m[12]) / w, (m[1] * x + m[5] * y + m[13]) / w];
}

test("the element's corners land on the four target points", () => {
  const corners: [Point, Point, Point, Point] = [
    [120, 80],
    [610, 60],
    [140, 360],
    [580, 400],
  ];
  const css = quadTransform(400, 220, corners);
  const source: Point[] = [
    [0, 0],
    [400, 0],
    [0, 220],
    [400, 220],
  ];
  source.forEach((p, i) => {
    const [u, v] = apply(css, p);
    assert.ok(Math.abs(u - corners[i][0]) < 1e-6 && Math.abs(v - corners[i][1]) < 1e-6);
  });
});

test("a plain move and scale stays affine", () => {
  const css = quadTransform(100, 50, [
    [10, 20],
    [210, 20],
    [10, 120],
    [210, 120],
  ]);
  const m = css.slice(9, -1).split(",").map(Number);
  assert.ok(Math.abs(m[3]) < 1e-9 && Math.abs(m[7]) < 1e-9);
  assert.ok(Math.abs(m[0] - 2) < 1e-9 && Math.abs(m[5] - 2) < 1e-9);
});
