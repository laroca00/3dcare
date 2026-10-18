import assert from "node:assert/strict";
import { test } from "node:test";
import { LAYERS, LAYER_HEIGHT, MUG_RADIUS, labelOpacity, nozzlePath, printProgress, handMotion } from "./storyMotion.ts";

test("labels appear once the printer is more than half apart", () => {
  assert.equal(labelOpacity(0), 0);
  assert.equal(labelOpacity(0.5), 0);
  assert.equal(labelOpacity(0.8), 1);
  assert.ok(labelOpacity(0.65) > 0 && labelOpacity(0.65) < 1);
});

test("printing starts after the printer is back together and finishes before the scene ends", () => {
  assert.equal(printProgress(0.6), 0);
  assert.equal(printProgress(0.81), 1);
  assert.ok(printProgress(0.7) > 0 && printProgress(0.7) < 1);
});

test("the nozzle starts on the first layer and ends on the last", () => {
  const start = nozzlePath(0);
  const end = nozzlePath(1);
  assert.equal(start.layer, 0);
  assert.equal(end.layer, LAYERS);
  assert.ok(Math.abs(start.y - LAYER_HEIGHT) < 1e-9);
  assert.ok(Math.abs(end.y - LAYERS * LAYER_HEIGHT) < 1e-9);
});

test("the nozzle traces the mug wall and only rises", () => {
  let lastY = -Infinity;
  for (let i = 0; i <= 200; i++) {
    const p = nozzlePath(i / 200);
    assert.ok(Math.abs(Math.hypot(p.x, p.z) - MUG_RADIUS) < 1e-9);
    assert.ok(p.y >= lastY);
    lastY = p.y;
  }
});

test("in the last scene the mug lifts first, then the hand arrives and closes", () => {
  const early = handMotion(0.1);
  const mid = handMotion(0.45);
  const end = handMotion(1);
  assert.ok(early.lift > 0 && early.hand === 0 && early.grip === 0);
  assert.ok(mid.lift === 1 && mid.hand > 0 && mid.grip === 0);
  assert.deepEqual(end, { lift: 1, hand: 1, grip: 1 });
});
