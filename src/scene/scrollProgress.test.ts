import assert from "node:assert/strict";
import { test } from "node:test";
import { progressFor, splitProgress } from "./scrollProgress.ts";

test("progress runs from 0 at the section top to 1 at its end", () => {
  assert.equal(progressFor(0, 5000, 1000), 0);
  assert.equal(progressFor(-2000, 5000, 1000), 0.5);
  assert.equal(progressFor(-9000, 5000, 1000), 1);
  assert.equal(progressFor(400, 5000, 1000), 0);
});

test("a section no taller than the viewport gives 0, not NaN", () => {
  assert.equal(progressFor(-100, 800, 1000), 0);
  assert.equal(progressFor(0, 1000, 1000), 0);
});

test("the story takes its share of the scroll first, then the closing part", () => {
  assert.deepEqual(splitProgress(0, 0.8), { story: 0, outro: 0 });
  assert.deepEqual(splitProgress(0.4, 0.8), { story: 0.5, outro: 0 });
  assert.deepEqual(splitProgress(0.8, 0.8), { story: 1, outro: 0 });
  assert.ok(Math.abs(splitProgress(0.9, 0.8).outro - 0.5) < 1e-9);
  assert.deepEqual(splitProgress(1, 0.8), { story: 1, outro: 1 });
  assert.deepEqual(splitProgress(0.5, 1), { story: 0.5, outro: 0 });
});
