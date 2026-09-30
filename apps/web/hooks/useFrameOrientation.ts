"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { frameRotationFromOrientation, type FrameRotation } from "@cft/core";

type OrientationEventCtor = typeof DeviceOrientationEvent & { requestPermission?: () => Promise<"granted" | "denied"> };

/**
 * Which way the camera frame is rotated relative to gravity. A phone propped
 * port-up delivers an upside-down frame in a portrait-locked app, which makes
 * a dead hang look like a handstand; the rules need gravity-up landmarks.
 *
 * iOS only exposes orientation after a user-gesture permission request, so
 * call `enable()` from the Start tap. Falls back to 0 (no correction) when
 * unavailable.
 */
export function useFrameOrientation() {
  const [rotation, setRotation] = useState<FrameRotation>(0);
  const [available, setAvailable] = useState(false);
  const rotationRef = useRef<FrameRotation>(0);
  const listeningRef = useRef(false);

  const listen = useCallback(() => {
    if (listeningRef.current || typeof window === "undefined") return;
    listeningRef.current = true;
    let last: FrameRotation | null = null;
    let stableSince = 0;
    const onOrientation = (e: DeviceOrientationEvent) => {
      const next = frameRotationFromOrientation(e.beta, e.gamma);
      if (next === null) return;
      // Debounce: the reading must hold for 400ms before the correction flips.
      const now = performance.now();
      if (next !== last) {
        last = next;
        stableSince = now;
        return;
      }
      if (now - stableSince < 400 || next === rotationRef.current) return;
      rotationRef.current = next;
      setRotation(next);
    };
    window.addEventListener("deviceorientation", onOrientation);
    setAvailable(true);
  }, []);

  /** Request permission (iOS) and start listening. Safe to call repeatedly. */
  const enable = useCallback(async () => {
    if (typeof window === "undefined" || !("DeviceOrientationEvent" in window)) return;
    const ctor = DeviceOrientationEvent as OrientationEventCtor;
    try {
      if (typeof ctor.requestPermission === "function") {
        const result = await ctor.requestPermission();
        if (result !== "granted") return;
      }
      listen();
    } catch {
      // Permission prompt failed or was dismissed: no correction, app still works.
    }
  }, [listen]);

  // Browsers without a permission gate (Android, desktop) can listen immediately.
  useEffect(() => {
    if (typeof window === "undefined" || !("DeviceOrientationEvent" in window)) return;
    const ctor = DeviceOrientationEvent as OrientationEventCtor;
    if (typeof ctor.requestPermission !== "function") listen();
  }, [listen]);

  const getRotation = useCallback(() => rotationRef.current, []);
  return { rotation, getRotation, available, enable };
}
