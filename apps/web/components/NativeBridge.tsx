"use client";

import { useEffect } from "react";
import { isNativePlatform, syncStatusBar } from "@/lib/native";
import { readThemePreference, resolvedTheme } from "@/lib/theme";

/**
 * Wires the native shell to the page: marks the document as native (CSS
 * hooks), keeps the status bar in step with the theme, and hides the splash.
 */
export function NativeBridge() {
  useEffect(() => {
    if (!isNativePlatform()) return;
    document.documentElement.setAttribute("data-native", "true");

    const sync = () => void syncStatusBar(resolvedTheme(readThemePreference()));
    sync();
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    media.addEventListener("change", sync);
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

    import("@capacitor/splash-screen")
      .then(({ SplashScreen }) => SplashScreen.hide())
      .catch(() => undefined);

    return () => {
      media.removeEventListener("change", sync);
      observer.disconnect();
    };
  }, []);
  return null;
}
