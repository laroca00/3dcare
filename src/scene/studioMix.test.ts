import assert from "node:assert/strict";
import { test } from "node:test";
import { StudioTransition, mixStudio, type StudioValues } from "./studioMix.ts";

const black: StudioValues = {
  background: 0x000000,
  glow: 0x000000,
  glowStrength: 0,
  key: 0x000000,
  keyIntensity: 0,
  rim: 0x000000,
  rimIntensity: 0,
  fill: 0,
  env: 0,
  shadow: 0,
};

const white: StudioValues = {
  background: 0xffffff,
  glow: 0xffffff,
  glowStrength: 1,
  key: 0xffffff,
  keyIntensity: 4,
  rim: 0xffffff,
  rimIntensity: 2,
  fill: 1,
  env: 1,
  shadow: 0.2,
};

test("mixing at the ends returns the end values", () => {
  assert.deepEqual(mixStudio(black, white, 0), black);
  assert.deepEqual(mixStudio(black, white, 1), white);
});

test("mixing halfway blends colours per channel and numbers linearly", () => {
  const mid = mixStudio(black, white, 0.5);
  assert.equal(mid.background, 0x808080);
  assert.equal(mid.keyIntensity, 2);
  assert.equal(mid.shadow, 0.1);
});

test("mixing clamps t to 0..1", () => {
  assert.deepEqual(mixStudio(black, white, -1), black);
  assert.deepEqual(mixStudio(black, white, 5), white);
});

test("a transition reaches its target after its duration and then stops", () => {
  const tr = new StudioTransition(black, 600);
  tr.start(white);
  assert.equal(tr.step(300), true);
  assert.ok(tr.current.keyIntensity > 0 && tr.current.keyIntensity < 4);
  assert.equal(tr.step(300), false);
  assert.deepEqual(tr.current, white);
});

test("a new target mid-transition continues from the current blend", () => {
  const tr = new StudioTransition(black, 600);
  tr.start(white);
  tr.step(300);
  const halfway = tr.current.keyIntensity;
  tr.start(black);
  tr.step(1);
  assert.ok(tr.current.keyIntensity <= halfway && tr.current.keyIntensity > 0);
  tr.step(600);
  assert.deepEqual(tr.current, black);
});
