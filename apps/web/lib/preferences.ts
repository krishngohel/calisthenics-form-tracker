import type { HoldMode } from "@cft/core";
import { readFlag, readJson, STORAGE_KEYS, writeFlag, writeJson } from "./storage";

export type ExperienceLevel = "beginner" | "intermediate" | "advanced";

export interface Preferences {
  experience: ExperienceLevel;
  defaultMode: HoldMode;
  /** Skill to suggest on the home screen; set from experience or last trained. */
  focusSkillId: string | null;
  /** Chimes on hold start, tick, drop, and new best (independent of the voice coach). */
  sounds: boolean;
}

export const DEFAULT_PREFERENCES: Preferences = {
  experience: "beginner",
  defaultMode: "hold_only",
  focusSkillId: null,
  sounds: true,
};

export const EXPERIENCE_LABELS: Record<ExperienceLevel, string> = {
  beginner: "Getting started",
  intermediate: "Training skills",
  advanced: "Advanced holds",
};

/** First skill worth opening for each experience level. */
export const STARTER_SKILL: Record<ExperienceLevel, string> = {
  beginner: "plank-hold",
  intermediate: "l-sit",
  advanced: "tuck-planche",
};

export function readPreferences(): Preferences {
  const stored = readJson<Partial<Preferences>>(STORAGE_KEYS.preferences, {});
  return { ...DEFAULT_PREFERENCES, ...stored };
}

export function writePreferences(update: Partial<Preferences>): Preferences {
  const next = { ...readPreferences(), ...update };
  writeJson(STORAGE_KEYS.preferences, next);
  return next;
}

export function readVoiceEnabled(): boolean {
  return readFlag(STORAGE_KEYS.voice);
}

export function writeVoiceEnabled(enabled: boolean): void {
  writeFlag(STORAGE_KEYS.voice, enabled);
}
