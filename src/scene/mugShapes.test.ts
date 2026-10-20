import assert from "node:assert/strict";
import { test } from "node:test";
import { MUG_SHAPES, SHAPES, mugWidth } from "./mugShapes.ts";
import { LAYERS } from "./storyMotion.ts";

test("the measurements on the plan match each mug", () => {
  assert.equal(mugWidth("double"), 15.6);
  assert.equal(mugWidth("single"), 12);
  assert.equal(mugWidth("tgrip"), 16.8);
});

test("every handle is printed inside the mug's layers, bottom first", () => {
  for (const id of MUG_SHAPES) {
    const { blocks, reach } = SHAPES[id];
    const layers = blocks.map((b) => b.layer);
    assert.deepEqual(layers, [...layers].sort((a, b) => a - b));
    for (const b of blocks) {
      assert.ok(b.layer >= 0 && b.layer < LAYERS);
      assert.ok(b.x + b.width / 2 <= reach + 1e-9, `${id} reaches past its outline`);
    }
  }
});
