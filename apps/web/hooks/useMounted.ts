"use client";

import { useEffect, useState } from "react";

/**
 * False during server render and the first client render, true afterwards.
 * Anything that differs between build time and the device (dates, platform,
 * stored settings) must render behind this so React can hydrate cleanly —
 * a mismatch throws away the server DOM and, inside the native WebView, can
 * leave the page without event handlers.
 */
export function useMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}
