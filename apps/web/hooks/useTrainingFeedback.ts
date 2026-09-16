"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { HoldView } from "./useHoldSession";
import type { PersistedCue } from "./usePersistentCues";
import { useVoiceCoach } from "./useVoiceCoach";
import { useWakeLock } from "./useWakeLock";
import { hapticImpact, hapticNotify, setStatusBarOverlay } from "@/lib/native";

/**
 * Everything that helps you train without staring at the screen: voice
 * coach, haptics on hold start / drop / new best, keep-awake, and the
 * full-screen focus mode.
 */
export function useTrainingFeedback(holdView: HoldView, cues: PersistedCue[], bestHoldMs: number) {
  const voice = useVoiceCoach();
  const [focus, setFocus] = useState(false);
  const prevStateRef = useRef(holdView.state);
  const prevBestRef = useRef(bestHoldMs);

  useWakeLock(true);

  useEffect(() => {
    voice.onHoldState(holdView.state, holdView.holdStartTime, holdView.lastHoldMs);
    const prev = prevStateRef.current;
    prevStateRef.current = holdView.state;
    if (holdView.state === prev) return;
    if (holdView.state === "holding") void hapticImpact("medium");
    else if (holdView.state === "dropped") void hapticNotify("warning");
  }, [holdView.state, holdView.holdStartTime, holdView.lastHoldMs, voice]);

  useEffect(() => {
    if (bestHoldMs > prevBestRef.current && prevBestRef.current > 0) void hapticNotify("success");
    prevBestRef.current = bestHoldMs;
  }, [bestHoldMs]);

  useEffect(() => {
    voice.onCues(cues.map((c) => c.text));
  }, [cues, voice]);

  useEffect(() => {
    void setStatusBarOverlay(focus);
    if (!focus) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFocus(false);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [focus]);

  const toggleFocus = useCallback(() => setFocus((f) => !f), []);

  return { voice, focus, toggleFocus };
}
