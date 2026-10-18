"use client";

import { useSyncExternalStore } from "react";
import type { Theme } from "./theme";

// The theme lives on <html data-theme>, set before paint by the inline script.
function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
}

export const readTheme = (): Theme => (document.documentElement.dataset.theme === "dark" ? "dark" : "light");

/** The current theme, or null during server rendering and hydration. */
export function useTheme(): Theme | null {
  return useSyncExternalStore(subscribe, readTheme, () => null);
}
