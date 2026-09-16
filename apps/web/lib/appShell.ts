import { readFlag, STORAGE_KEYS, writeString } from "./storage";

/**
 * The "app shell" is the native-style chrome: bottom tab bar, large-title
 * screens, no marketing nav. It is used inside the Capacitor app and on
 * phone-sized web viewports; desktop web keeps the top nav.
 *
 * Capacitor injects `window.Capacitor` at document start, so this inline
 * script can mark <html data-native> before first paint and CSS decides
 * which chrome to show — no hydration mismatch, no flash.
 */
export const APP_SHELL_INIT_SCRIPT = `(function(){try{var c=window.Capacitor;if(c&&typeof c.isNativePlatform==="function"&&c.isNativePlatform()){document.documentElement.setAttribute("data-native","true")}}catch(e){}})();`;

/** Viewport width at or below which the web uses the app shell. */
export const APP_SHELL_MAX_WIDTH = 640;

export function isOnboarded(): boolean {
  if (typeof window === "undefined") return true;
  return readFlag(STORAGE_KEYS.onboarded);
}

export function setOnboarded(done: boolean): void {
  writeString(STORAGE_KEYS.onboarded, done ? "1" : null);
}

/** True when the app-shell chrome is active (native, or a phone-width web viewport). */
export function isAppShellActive(): boolean {
  if (typeof window === "undefined") return false;
  if (document.documentElement.hasAttribute("data-native")) return true;
  return window.matchMedia(`(max-width: ${APP_SHELL_MAX_WIDTH}px)`).matches;
}
