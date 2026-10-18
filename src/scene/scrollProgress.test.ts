import assert from "node:assert/strict";
import { test } from "node:test";
import { progressFor } from "./scrollProgress.ts";

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
