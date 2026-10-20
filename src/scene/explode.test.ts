import assert from "node:assert/strict";
import { test } from "node:test";
import { Group, Vector3 } from "three";
import { centerAmount, easeOutBack, explodeAmount, setExplode, spinTurn, type ExplodablePart } from "./explode.ts";

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

test("with a stagger the last part leaves first and every part ends at its full distance", () => {
  const first = part([0, 0, 0], [0, 10, 0]);
  const last = part([0, 0, 0], [0, 10, 0]);
  setExplode([first, last], 0.3, 0.2);
  assert.ok(last.object.position.y > first.object.position.y);
  setExplode([first, last], 1, 0.2);
  assert.ok(Math.abs(first.object.position.y - 10) < 1e-9 && Math.abs(last.object.position.y - 10) < 1e-9);
  setExplode([first, last], 0, 0.2);
  assert.equal(first.object.position.y, 0);
});

test("easeOutBack overshoots before settling at 1", () => {
  assert.equal(easeOutBack(0), 0);
  assert.ok(easeOutBack(0.8) > 1);
  assert.ok(Math.abs(easeOutBack(1) - 1) < 1e-9);
});

/** Story progress at a point inside the explode and print scenes. */
const apart = (t: number) => 0.31 + 0.18 * t;
const printing = (t: number) => 0.49 + 0.2 * t;

test("the printer comes apart in the second half of the explode scene and back together early in the print scene", () => {
  assert.equal(explodeAmount(0.25), 0);
  assert.ok(explodeAmount(apart(0.35)) < 1e-9);
  assert.ok(Math.abs(explodeAmount(apart(0.6)) - 0.5) < 1e-9);
  assert.equal(explodeAmount(apart(1)), 1);
  assert.ok(Math.abs(explodeAmount(printing(0.1)) - 0.5) < 1e-9);
  assert.equal(explodeAmount(printing(0.6)), 0);
  assert.equal(explodeAmount(1), 0);
});

test("the printer turns once on its axis while it moves to the middle, before it comes apart", () => {
  assert.equal(centerAmount(0.25), 0);
  assert.equal(spinTurn(0.25), 0);
  const settled = apart(0.5);
  assert.equal(centerAmount(settled), 1);
  assert.ok(Math.abs(spinTurn(settled) - Math.PI * 2) < 1e-9);
  assert.equal(explodeAmount(apart(0.3)), 0);
  assert.equal(centerAmount(apart(1)), 1);
  assert.equal(centerAmount(printing(0.6)), 0);
});
