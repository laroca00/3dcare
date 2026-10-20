import assert from "node:assert/strict";
import { test } from "node:test";
import { circleAt, constructionCircles, wordmarkCircles } from "./wordmark.ts";

test("the wordmark sits above the mug and spans about 20 cm", () => {
  const circles = wordmarkCircles();
  assert.ok(circles.length > 60 && circles.length < 200);
  const xs = circles.map((c) => c.x);
  const width = Math.max(...xs) - Math.min(...xs);
  assert.ok(width > 16 && width < 21, `width ${width}`);
  assert.ok(Math.abs(Math.max(...xs) + Math.min(...xs)) < 0.5, "centred over the axis");
  assert.ok(Math.min(...circles.map((c) => c.y - c.r)) > 10, "above the mug's 9 cm");
});

const near = (a: { x: number; y: number; r: number }, b: { x: number; y: number; r: number }) =>
  Math.abs(a.x - b.x) + Math.abs(a.y - b.y) + Math.abs(a.r - b.r) < 1e-9;

test("each circle goes from its construction circle to its place in the wordmark", () => {
  const to = wordmarkCircles();
  const from = constructionCircles(to.length);
  assert.equal(from.length, to.length);
  const n = to.length;
  assert.ok(near(circleAt(from[0], to[0], 0, n, 0), from[0]));
  assert.ok(near(circleAt(from[n - 1], to[n - 1], n - 1, n, 1), to[n - 1]));
  const early = circleAt(from[n - 1], to[n - 1], n - 1, n, 0.3);
  assert.ok(near(early, from[n - 1]), "the last circle has not left yet");
});
