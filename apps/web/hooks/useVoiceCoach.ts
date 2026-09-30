"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { HoldState } from "@cft/core";
import { readVoiceEnabled, writeVoiceEnabled } from "@/lib/preferences";

/** Seconds between count-outs while holding. */
const COUNT_INTERVAL_S = 5;
/** Minimum gap between spoken cues so coaching never talks over itself. */
const CUE_GAP_MS = 4000;

function speechAvailable(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

/**
 * Speaks hold events and cues so the athlete never has to look at the screen
 * mid-hold. Opt-in (a tap is also what unlocks audio on iOS).
 */
export function useVoiceCoach() {
  const [enabled, setEnabled] = useState(false);
  const [supported, setSupported] = useState(false);
  const enabledRef = useRef(false);
  const lastCueAtRef = useRef(0);
  const lastCueTextRef = useRef("");
  const countTimerRef = useRef<number | null>(null);
  const prevStateRef = useRef<HoldState>("idle");

  useEffect(() => {
    setSupported(speechAvailable());
    const stored = readVoiceEnabled();
    setEnabled(stored);
    enabledRef.current = stored;
  }, []);

  const speak = useCallback((text: string, priority = false) => {
    if (!enabledRef.current || !speechAvailable()) return;
    if (priority) window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.05;
    utterance.pitch = 1;
    window.speechSynthesis.speak(utterance);
  }, []);

  const stopCounting = useCallback(() => {
    if (countTimerRef.current !== null) {
      window.clearInterval(countTimerRef.current);
      countTimerRef.current = null;
    }
  }, []);

  const toggle = useCallback(() => {
    const next = !enabledRef.current;
    enabledRef.current = next;
    setEnabled(next);
    writeVoiceEnabled(next);
    if (next) speak("Voice coach on", true);
    else {
      stopCounting();
      if (speechAvailable()) window.speechSynthesis.cancel();
    }
  }, [speak, stopCounting]);

  /** Call whenever the hold state changes. */
  const onHoldState = useCallback(
    (state: HoldState, holdStartTime: number | null, lastHoldMs: number) => {
      const prev = prevStateRef.current;
      prevStateRef.current = state;
      if (state === prev) return;

      if (state === "holding" && holdStartTime !== null) {
        speak("Hold", true);
        stopCounting();
        countTimerRef.current = window.setInterval(() => {
          const elapsed = Math.round((performance.now() - holdStartTime) / 1000);
          if (elapsed > 0 && elapsed % COUNT_INTERVAL_S === 0) speak(String(elapsed));
        }, 1000);
      } else if (state === "dropped") {
        stopCounting();
        const seconds = (lastHoldMs / 1000).toFixed(1);
        speak(`${seconds} seconds`, true);
      } else if (prev === "holding") {
        stopCounting();
      }
    },
    [speak, stopCounting]
  );

  /** Call with the current pinned cue texts; the newest unspoken one is read. */
  const onCues = useCallback(
    (cues: string[]) => {
      const latest = cues[cues.length - 1];
      if (!latest || latest === lastCueTextRef.current) return;
      const now = performance.now();
      if (now - lastCueAtRef.current < CUE_GAP_MS) return;
      lastCueAtRef.current = now;
      lastCueTextRef.current = latest;
      speak(latest);
    },
    [speak]
  );

  useEffect(() => {
    return () => {
      stopCounting();
      if (speechAvailable()) window.speechSynthesis.cancel();
    };
  }, [stopCounting]);

  return useMemo(
    () => ({ enabled, supported, toggle, onHoldState, onCues }),
    [enabled, supported, toggle, onHoldState, onCues]
  );
}
