// Checks WCAG contrast of the colour tokens in globals.css, for both themes.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const css = readFileSync(new URL("../src/app/globals.css", import.meta.url), "utf8");

function tokens(selector) {
  const start = css.indexOf(`${selector} {`);
  assert.notEqual(start, -1, `missing block ${selector}`);
  const block = css.slice(start, css.indexOf("}", start));
  return Object.fromEntries([...block.matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{6})/g)].map((m) => [m[1], m[2]]));
}

function luminance(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const light = tokens(":root");
const dark = { ...light, ...tokens(':root[data-theme="dark"]') };

const pairs = [
  ["ink", "paper", 4.5],
  ["ink", "surface", 4.5],
  ["muted", "paper", 4.5],
  ["teal", "paper", 4.5],
  ["on-accent", "teal", 4.5],
  ["on-layer", "layer", 4.5],
  ["footer-text", "footer-bg", 4.5],
  ["footer-muted", "footer-bg", 4.5],
  ["plate", "paper", 1.2],
];

for (const [name, theme] of [["light", light], ["dark", dark]]) {
  for (const [fg, bg, min] of pairs) {
    test(`${name}: --${fg} on --${bg} reaches ${min}:1`, () => {
      assert.ok(theme[fg], `--${fg} is not defined`);
      assert.ok(theme[bg], `--${bg} is not defined`);
      const ratio = contrast(theme[fg], theme[bg]);
      assert.ok(ratio >= min, `${ratio.toFixed(2)}:1`);
    });
  }
}

test("the dark palette also applies when the device prefers dark and no choice is stored", () => {
  assert.match(css, /@media \(prefers-color-scheme: dark\)\s*{\s*:root:not\(\[data-theme="light"\]\)/);
  assert.deepEqual(tokens(':root:not([data-theme="light"])'), tokens(':root[data-theme="dark"]'));
});
