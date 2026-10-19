import assert from "node:assert/strict";
import { test } from "node:test";
import { MOODS, storyLook } from "./lightArc.ts";

test("each part of the story has its own light, in both themes", () => {
  for (const theme of ["dark", "light"] as const) {
    assert.deepEqual(storyLook(theme, 0), MOODS[theme].blueprint);
    assert.deepEqual(storyLook(theme, 0.3), MOODS[theme].studio);
    assert.deepEqual(storyLook(theme, 0.5), MOODS[theme].workshop);
    assert.deepEqual(storyLook(theme, 0.7), MOODS[theme].printing);
    assert.deepEqual(storyLook(theme, 1), MOODS[theme].morning);
  }
});

test("between two parts the light blends", () => {
  const mid = storyLook("dark", 0.17);
  const { blueprint, studio } = MOODS.dark;
  assert.ok(mid.keyIntensity > blueprint.keyIntensity && mid.keyIntensity < studio.keyIntensity);
});
