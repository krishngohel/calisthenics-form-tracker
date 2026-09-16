"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { HoldView, CompletedHold } from "./useHoldSession";
import type { PersistedCue } from "./usePersistentCues";
import { useVoiceCoach } from "./useVoiceCoach";
import { useWakeLock } from "./useWakeLock";
import { hapticImpact, hapticNotify, setStatusBarOverlay } from "@/lib/native";
import { chimes, unlockAudio } from "@/lib/sounds";
import { readPreferences } from "@/lib/preferences";

interface FeedbackInput {
  holdView: HoldView;
  cues: PersistedCue[];
  lastHold: CompletedHold | null;
  /** Best before this session began (from local history); 0 if none. */
  allTimeBestMs: number;
}

const TICK_INTERVAL_S = 5;

/**
 * Everything that helps you train without staring at the screen: voice
 * coach, chimes, haptics on hold start / drop / new best, keep-awake, and
 * the full-screen focus mode. Also tracks the personal best across the
 * session so the HUD and result toast can say "new best".
 */
export function useTrainingFeedback({ holdView, cues, lastHold, allTimeBestMs }: FeedbackInput) {
  const voice = useVoiceCoach();
  const [focus, setFocus] = useState(false);
  const [bestMs, setBestMs] = useState(allTimeBestMs);
  const [lastWasBest, setLastWasBest] = useState(false);
  const prevStateRef = useRef(holdView.state);
  const soundsRef = useRef(true);
  const tickTimerRef = useRef<number | null>(null);

  useWakeLock(true);

  useEffect(() => {
    soundsRef.current = readPreferences().sounds;
  }, []);

  // Seed the best from history once it loads (history arrives after mount).
  useEffect(() => {
    setBestMs((b) => Math.max(b, allTimeBestMs));
  }, [allTimeBestMs]);

  const stopTicks = useCallback(() => {
    if (tickTimerRef.current !== null) {
      window.clearInterval(tickTimerRef.current);
      tickTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    voice.onHoldState(holdView.state, holdView.holdStartTime, holdView.lastHoldMs);
    const prev = prevStateRef.current;
    prevStateRef.current = holdView.state;
    if (holdView.state === prev) return;

    if (holdView.state === "holding" && holdView.holdStartTime !== null) {
      void hapticImpact("medium");
      if (soundsRef.current) {
        chimes.start();
        const start = holdView.holdStartTime;
        stopTicks();
        tickTimerRef.current = window.setInterval(() => {
          const elapsed = Math.round((performance.now() - start) / 1000);
          if (elapsed > 0 && elapsed % TICK_INTERVAL_S === 0) chimes.tick();
        }, 1000);
      }
    } else if (holdView.state === "dropped") {
      stopTicks();
      void hapticNotify("warning");
      if (soundsRef.current) chimes.drop();
    } else if (prev === "holding") {
      stopTicks();
    }
  }, [holdView.state, holdView.holdStartTime, holdView.lastHoldMs, voice, stopTicks]);

  // A completed hold that beats the running best.
  useEffect(() => {
    if (!lastHold) return;
    const isBest = lastHold.durationMs > bestMs;
    setLastWasBest(isBest);
    if (isBest) {
      setBestMs(lastHold.durationMs);
      void hapticNotify("success");
      if (soundsRef.current) window.setTimeout(() => chimes.best(), 350);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- react to the hold, not the best it updates
  }, [lastHold]);

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

  useEffect(() => stopTicks, [stopTicks]);

  const toggleFocus = useCallback(() => setFocus((f) => !f), []);
  /** Call from the Start button: iOS only allows audio after a gesture. */
  const armAudio = useCallback(() => unlockAudio(), []);

  return { voice, focus, toggleFocus, bestMs, lastWasBest, armAudio };
}
