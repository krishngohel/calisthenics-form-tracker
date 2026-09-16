export type ThemePreference = "system" | "light" | "dark";

export const THEME_STORAGE_KEY = "cft-theme";

export function readThemePreference(): ThemePreference {
  if (typeof window === "undefined") return "system";
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === "light" || stored === "dark") return stored;
  } catch {
    // ignore
  }
  return "system";
}

export function applyThemePreference(pref: ThemePreference): void {
  const root = document.documentElement;
  if (pref === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", pref);
  try {
    if (pref === "system") localStorage.removeItem(THEME_STORAGE_KEY);
    else localStorage.setItem(THEME_STORAGE_KEY, pref);
  } catch {
    // ignore
  }
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
  THEME_STORAGE_KEY
)});if(t==="light"||t==="dark"){document.documentElement.setAttribute("data-theme",t)}}catch(e){}})();`;
