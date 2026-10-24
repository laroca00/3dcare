import assert from "node:assert/strict";
import { test } from "node:test";
import { MOODS, storyLook } from "./lightArc.ts";
import { at } from "./timeline.ts";

test("each part of the story has its own light, in both themes", () => {
  for (const theme of ["dark", "light"] as const) {
    assert.deepEqual(storyLook(theme, 0), MOODS[theme].desk);
    assert.deepEqual(storyLook(theme, at("meet", 0.9)), MOODS[theme].studio);
    assert.deepEqual(storyLook(theme, at("explode", 0.8)), MOODS[theme].workshop);
    assert.deepEqual(storyLook(theme, at("print", 0.6)), MOODS[theme].printing);
    assert.deepEqual(storyLook(theme, at("reveal", 0.5)), MOODS[theme].hero);
    assert.deepEqual(storyLook(theme, at("heat", 0.5)), MOODS[theme].thermal);
    assert.deepEqual(storyLook(theme, at("plan", 0.5)), MOODS[theme].blueprint);
    assert.deepEqual(storyLook(theme, at("layers", 0.5)), MOODS[theme].hero);
    assert.deepEqual(storyLook(theme, at("material", 0.5)), MOODS[theme].material);
    assert.deepEqual(storyLook(theme, 1), MOODS[theme].morning);
  }
});

test("between two parts the light blends", () => {
  const mid = storyLook("dark", at("meet", 0.15));
  const { blueprint, studio } = MOODS.dark;
  assert.ok(mid.keyIntensity > blueprint.keyIntensity && mid.keyIntensity < studio.keyIntensity);
});
