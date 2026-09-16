"use client";

import { Capacitor } from "@capacitor/core";

/** True inside the Capacitor iOS shell. */
export function isNativePlatform(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

type ImpactStyle = "light" | "medium" | "heavy";
type NotificationType = "success" | "warning" | "error";

/** Haptic tap; silently does nothing on the web. */
export async function hapticImpact(style: ImpactStyle = "medium"): Promise<void> {
  if (!isNativePlatform()) return;
  try {
    const { Haptics, ImpactStyle } = await import("@capacitor/haptics");
    const map = { light: ImpactStyle.Light, medium: ImpactStyle.Medium, heavy: ImpactStyle.Heavy };
    await Haptics.impact({ style: map[style] });
  } catch {
    // plugin unavailable
  }
}

export async function hapticNotify(type: NotificationType): Promise<void> {
  if (!isNativePlatform()) return;
  try {
    const { Haptics, NotificationType } = await import("@capacitor/haptics");
    const map = {
      success: NotificationType.Success,
      warning: NotificationType.Warning,
      error: NotificationType.Error,
    };
    await Haptics.notification({ type: map[type] });
  } catch {
    // plugin unavailable
  }
}

/** Match the native status bar to the page theme. */
export async function syncStatusBar(theme: "light" | "dark"): Promise<void> {
  if (!isNativePlatform()) return;
  try {
    const { StatusBar, Style } = await import("@capacitor/status-bar");
    await StatusBar.setStyle({ style: theme === "dark" ? Style.Dark : Style.Light });
  } catch {
    // plugin unavailable
  }
}

/** Force the status bar to light text (over a dark camera view). */
export async function setStatusBarOverlay(dark: boolean): Promise<void> {
  if (!isNativePlatform()) return;
  try {
    const { StatusBar, Style } = await import("@capacitor/status-bar");
    await StatusBar.setStyle({ style: dark ? Style.Dark : Style.Light });
  } catch {
    // plugin unavailable
  }
}
