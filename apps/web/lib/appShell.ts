/**
 * The "app shell" is the native-style chrome: bottom tab bar, large-title
 * screens, no marketing nav. It is used inside the Capacitor app and on
 * phone-sized web viewports; desktop web keeps the top nav.
 *
 * Capacitor injects `window.Capacitor` at document start, so this inline
 * script can mark <html data-native> before first paint and CSS decides
 * which chrome to show — no hydration mismatch, no flash.
 */
export const ONBOARDED_KEY = "cft-onboarded";

export const APP_SHELL_INIT_SCRIPT = `(function(){try{var c=window.Capacitor;if(c&&typeof c.isNativePlatform==="function"&&c.isNativePlatform()){document.documentElement.setAttribute("data-native","true")}if(localStorage.getItem(${JSON.stringify(
  ONBOARDED_KEY
)})==="1"){document.documentElement.setAttribute("data-onboarded","true")}}catch(e){}})();`;

export function isOnboarded(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return localStorage.getItem(ONBOARDED_KEY) === "1";
  } catch {
    return true;
  }
}

export function setOnboarded(done: boolean): void {
  try {
    if (done) localStorage.setItem(ONBOARDED_KEY, "1");
    else localStorage.removeItem(ONBOARDED_KEY);
    document.documentElement.toggleAttribute("data-onboarded", done);
  } catch {
    // ignore
  }
}

/** True when the app-shell chrome is active (native, or a phone-width web viewport). */
export function isAppShellActive(): boolean {
  if (typeof window === "undefined") return false;
  if (document.documentElement.hasAttribute("data-native")) return true;
  return window.matchMedia("(max-width: 640px)").matches;
}
