import assert from "node:assert/strict";
import { test } from "node:test";
import { QualityController, initialQuality } from "./quality.ts";

test("phones and low-core devices start at medium quality", () => {
  assert.equal(initialQuality({ width: 390, dpr: 3, cores: 8 }), 1);
  assert.equal(initialQuality({ width: 1440, dpr: 1, cores: 4 }), 1);
  assert.equal(initialQuality({ width: 1440, dpr: 2, cores: 8 }), 2);
});

const feed = (q: QualityController, frames: number, ms: number) => {
  for (let i = 0; i < frames; i++) q.sample(ms);
  return q.level;
};

test("quality waits for a full window of 60 frames", () => {
  const q = new QualityController(2);
  assert.equal(feed(q, 59, 50), 2);
});

test("sustained slow frames lower quality by one step", () => {
  const q = new QualityController(2);
  assert.equal(feed(q, 60, 30), 1);
});

test("a single long frame does not lower quality", () => {
  const q = new QualityController(2);
  q.sample(200);
  assert.equal(feed(q, 59, 10), 2);
});

test("quality never drops below 0 and never climbs back", () => {
  const q = new QualityController(1);
  feed(q, 60, 40);
  feed(q, 60, 40);
  assert.equal(feed(q, 60, 40), 0);
  assert.equal(feed(q, 600, 5), 0);
});

test("a scene that starts at full quality never drops below medium", () => {
  const q = new QualityController(2, undefined, 1);
  feed(q, 60, 40);
  feed(q, 60, 40);
  assert.equal(feed(q, 60, 40), 1);
});
