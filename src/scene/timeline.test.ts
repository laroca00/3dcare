import assert from "node:assert/strict";
import { test } from "node:test";
import { SCENES, localProgress, sceneAt, smoothstep } from "./timeline.ts";

test("scenes cover 0 to 1 without gaps", () => {
  assert.equal(SCENES[0].start, 0);
  assert.equal(SCENES.at(-1)!.end, 1);
  for (let i = 1; i < SCENES.length; i++) assert.equal(SCENES[i].start, SCENES[i - 1].end);
  assert.deepEqual(
    SCENES.map((s) => s.id),
    ["draw", "meet", "explode", "print", "use"],
  );
});

test("sceneAt clamps progress outside 0..1", () => {
  assert.equal(sceneAt(-0.5), "draw");
  assert.equal(sceneAt(1.7), "use");
  assert.equal(sceneAt(1), "use");
  assert.equal(sceneAt(0.5), "explode");
});

test("localProgress is 0 before a scene, 1 after it and linear inside", () => {
  assert.ok(Math.abs(localProgress(0.26, "meet") - 0.5) < 1e-9);
  assert.equal(localProgress(0.1, "print"), 0);
  assert.equal(localProgress(0.9, "meet"), 1);
});

test("smoothstep eases and clamps", () => {
  assert.equal(smoothstep(-1), 0);
  assert.equal(smoothstep(2), 1);
  assert.equal(smoothstep(0.5), 0.5);
});
