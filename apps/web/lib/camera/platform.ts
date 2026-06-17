export function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

/** Chrome on iOS (still uses WebKit — same camera APIs as Safari). */
export function isIOSChrome(): boolean {
  return isIOS() && /CriOS/i.test(navigator.userAgent);
}

export function iosBrowserName(): string {
  if (!isIOS()) return "this browser";
  return isIOSChrome() ? "Chrome" : "Safari";
}

export function isSecureCameraContext(): boolean {
  return typeof window !== "undefined" && window.isSecureContext;
}

export function cameraUnavailableReason(): string | null {
  if (typeof navigator === "undefined") return null;
  if (!isSecureCameraContext()) {
    return "Camera requires HTTPS. Your Netlify site must be opened at its https:// URL.";
  }
  if (!navigator.mediaDevices?.getUserMedia) {
    return "Camera is not supported in this browser.";
  }
  return null;
}

/** iOS browsers expose a single virtual back camera and no zoom constraint API. */
export function iosCameraFramingMode(): "guidance" | "hardware" {
  return isIOS() ? "guidance" : "hardware";
}

export function shouldUseDeviceIdForLens(): boolean {
  return !isIOS();
}
