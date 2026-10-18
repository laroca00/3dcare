import assert from "node:assert/strict";
import { test } from "node:test";
import { Group, Vector3 } from "three";
import { explodeAmount, setExplode, type ExplodablePart } from "./explode.ts";

function part(home: [number, number, number], dir: [number, number, number]): ExplodablePart {
  const object = new Group();
  object.position.set(...home);
  return { object, home: new Vector3(...home), explodeDir: new Vector3(...dir) };
}

test("at 0 every part sits at home", () => {
  const p = part([1, 2, 3], [0, 10, 0]);
  setExplode([p], 0);
  assert.deepEqual(p.object.position.toArray(), [1, 2, 3]);
});

test("at 1 every part has moved its full explode distance", () => {
  const p = part([1, 2, 3], [0, 10, -4]);
  setExplode([p], 1);
  assert.deepEqual(p.object.position.toArray(), [1, 12, -1]);
});

test("the movement is eased and clamped", () => {
  const p = part([0, 0, 0], [0, 10, 0]);
  setExplode([p], 0.5);
  assert.equal(p.object.position.y, 5);
  setExplode([p], 0.25);
  assert.ok(p.object.position.y < 2.5);
  setExplode([p], 3);
  assert.equal(p.object.position.y, 10);
});

test("the printer comes apart during the explode scene and back together early in the print scene", () => {
  assert.equal(explodeAmount(0.3), 0);
  assert.ok(Math.abs(explodeAmount(0.47) - 0.5) < 1e-9);
  assert.equal(explodeAmount(0.58), 1);
  assert.ok(Math.abs(explodeAmount(0.604) - 0.5) < 1e-9);
  assert.equal(explodeAmount(0.7), 0);
  assert.equal(explodeAmount(1), 0);
});
