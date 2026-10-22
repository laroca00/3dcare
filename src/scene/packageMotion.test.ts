import assert from "node:assert/strict";
import { test } from "node:test";
import { flapClosure, packageMotion } from "./packageMotion.ts";

const near = (a: number, b: number) => Math.abs(a - b) < 1e-9;

test("the mug goes into the package before it shuts, the pictures come out after it opens, and the mug comes out at the end", () => {
  const start = packageMotion(0);
  assert.equal(start.box, 0);
  assert.equal(start.drop, 0);
  const inside = packageMotion(0.16);
  assert.ok(near(inside.drop, 1));
  assert.equal(inside.close, 0);
  const shut = packageMotion(0.3);
  assert.ok(near(shut.close, 1));
  assert.equal(shut.open, 0);
  assert.ok(near(shut.contents, 1));
  const strip = packageMotion(0.6);
  assert.ok(near(strip.open, 1));
  assert.ok(near(strip.cards, 1));
  assert.equal(strip.contents, 0);
  assert.equal(packageMotion(0.47).slide, 0);
  assert.ok(near(packageMotion(0.8).slide, 1));
  const end = packageMotion(1);
  assert.equal(end.box, 0);
  assert.equal(end.drop, 0);
  assert.equal(end.frame, 0);
  assert.equal(end.cards, 0);
});

test("the side flaps fold first and open last; the long flaps fold last and open first", () => {
  assert.deepEqual(flapClosure(0, 0), { sides: 0, long: 0 });
  const half = flapClosure(0.5, 0);
  assert.ok(half.sides > half.long);
  assert.deepEqual(flapClosure(1, 0), { sides: 1, long: 1 });
  const opening = flapClosure(1, 0.3);
  assert.ok(opening.long < opening.sides);
  assert.deepEqual(flapClosure(1, 1), { sides: 0, long: 0 });
});
