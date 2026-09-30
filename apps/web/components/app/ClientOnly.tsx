"use client";

import { useSyncExternalStore, type ReactNode } from "react";

const subscribe = () => () => undefined;

/**
 * Renders nothing during server rendering and the hydration pass, then the
 * children on the first client render. Built on useSyncExternalStore so the
 * server/client snapshot difference is handled by React by design — it
 * never counts as a hydration mismatch.
 *
 * The whole app tree sits behind this: the static export ships an empty
 * shell, and the native WebView (or browser) renders everything client-side.
 */
export function ClientOnly({ children, fallback = null }: { children: ReactNode; fallback?: ReactNode }) {
  const isClient = useSyncExternalStore(subscribe, () => true, () => false);
  return <>{isClient ? children : fallback}</>;
}
