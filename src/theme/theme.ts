export type Theme = "light" | "dark";

export const THEME_STORAGE_KEY = "3dcare-theme";

/** The visitor's saved choice wins; otherwise the device setting decides. */
export function resolveTheme(stored: string | null, prefersDark: boolean): Theme {
  if (stored === "light" || stored === "dark") return stored;
  return prefersDark ? "dark" : "light";
}

// Runs in <head> before the first paint so the page never flashes the wrong
// theme. It cannot import resolveTheme, so it repeats the same rule; the
// tests run both against the same inputs.
export const themeInitScript = `(function () {
  var stored = null;
  try { stored = localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)}); } catch (e) {}
  var prefersDark = false;
  try { prefersDark = matchMedia("(prefers-color-scheme: dark)").matches; } catch (e) {}
  document.documentElement.dataset.theme =
    stored === "light" || stored === "dark" ? stored : prefersDark ? "dark" : "light";
})();`;
