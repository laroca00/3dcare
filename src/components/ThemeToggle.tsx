"use client";

import { THEME_STORAGE_KEY, type Theme } from "@/theme/theme";
import { useTheme } from "@/theme/useTheme";

/** Switches between the light and dark theme and remembers the choice in this browser. */
export function ThemeToggle({ label }: { label: string }) {
  const theme = useTheme();

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Storage blocked: the theme still changes for this visit.
    }
  }

  return (
    <button type="button" className="theme-toggle" aria-pressed={theme === "dark"} onClick={toggle}>
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        {theme === "dark" ? (
          <path d="M12 4V2m0 20v-2m8-8h2M2 12h2m13.66-5.66 1.41-1.41M4.93 19.07l1.41-1.41m0-11.32L4.93 4.93m14.14 14.14-1.41-1.41M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z" />
        ) : (
          <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z" />
        )}
      </svg>
      <span className="visually-hidden">{label}</span>
    </button>
  );
}
