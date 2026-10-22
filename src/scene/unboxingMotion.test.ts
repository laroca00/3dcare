import assert from "node:assert/strict";
import { test } from "node:test";
import { flapClosure, unboxingMotion } from "./unboxingMotion.ts";

test("the mug goes into the box before it closes, and the pictures come out after it opens again", () => {
  const start = unboxingMotion(0);
  assert.equal(start.drop, 0);
  assert.equal(start.close, 0);
  const inside = unboxingMotion(0.23);
  assert.equal(inside.drop, 1);
  assert.equal(inside.close, 0);
  const shut = unboxingMotion(0.46);
  assert.equal(shut.close, 1);
  assert.equal(shut.open, 0);
  const out = unboxingMotion(0.72);
  assert.equal(out.open, 1);
  assert.equal(out.cards, 1);
  assert.ok(Math.abs(unboxingMotion(1).slide - 1) < 1e-9);
  assert.equal(unboxingMotion(0.6).slide, 0);
});

test("the side flaps fold first and open last; the long flaps fold last and open first", () => {
  assert.deepEqual(flapClosure(0, 0), { sides: 0, long: 0 });
  const half = flapClosure(0.5, 0);
  assert.ok(half.sides > half.long);
  assert.deepEqual(flapClosure(1, 0), { sides: 1, long: 1 });
  const opening = flapClosure(1, 0.3);
  assert.ok(opening.long < opening.sides);
  const open = flapClosure(1, 1);
  assert.equal(open.sides, 0);
  assert.equal(open.long, 0);
});
