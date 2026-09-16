import { readString, STORAGE_KEYS, writeString } from "./storage";

export type ThemePreference = "system" | "light" | "dark";

export function readThemePreference(): ThemePreference {
  const stored = readString(STORAGE_KEYS.theme);
  return stored === "light" || stored === "dark" ? stored : "system";
}

export function applyThemePreference(pref: ThemePreference): void {
  const root = document.documentElement;
  if (pref === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", pref);
  writeString(STORAGE_KEYS.theme, pref === "system" ? null : pref);
}

/** Effective theme after resolving "system". */
export function resolvedTheme(pref: ThemePreference): "light" | "dark" {
  if (pref !== "system") return pref;
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/**
 * Inline bootstrap so the first paint already has the right theme. Kept as a
 * string because it must run before React hydrates.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem(${JSON.stringify(
  STORAGE_KEYS.theme
)});if(t==="light"||t==="dark"){document.documentElement.setAttribute("data-theme",t)}}catch(e){}})();`;
