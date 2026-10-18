import assert from "node:assert/strict";
import { test } from "node:test";
import { resolveTheme, themeInitScript } from "./theme.ts";

test("a stored choice wins over the device setting", () => {
  assert.equal(resolveTheme("dark", false), "dark");
  assert.equal(resolveTheme("light", true), "light");
});

test("without a stored choice the device setting decides", () => {
  assert.equal(resolveTheme(null, true), "dark");
  assert.equal(resolveTheme(null, false), "light");
});

test("an unknown stored value falls back to the device setting", () => {
  assert.equal(resolveTheme("purple", true), "dark");
});

function runInitScript(storage: { getItem(key: string): string | null }, prefersDark: boolean) {
  const document = { documentElement: { dataset: {} as Record<string, string> } };
  const matchMedia = (query: string) => ({ matches: prefersDark && query.includes("dark") });
  new Function("document", "localStorage", "matchMedia", themeInitScript)(document, storage, matchMedia);
  return document.documentElement.dataset.theme;
}

test("the pre-paint script applies the stored theme", () => {
  assert.equal(runInitScript({ getItem: () => "light" }, true), "light");
});

test("the pre-paint script falls back to the device setting when storage throws", () => {
  const throwing = {
    getItem(): string | null {
      throw new Error("SecurityError");
    },
  };
  assert.equal(runInitScript(throwing, true), "dark");
});
