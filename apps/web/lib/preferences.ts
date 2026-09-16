import type { HoldMode } from "@cft/core";

export type ExperienceLevel = "beginner" | "intermediate" | "advanced";

export interface Preferences {
  experience: ExperienceLevel;
  defaultMode: HoldMode;
  /** Skill to suggest on the home screen; set from experience or last trained. */
  focusSkillId: string | null;
}

const KEY = "cft-preferences";

export const DEFAULT_PREFERENCES: Preferences = {
  experience: "beginner",
  defaultMode: "hold_only",
  focusSkillId: null,
};

/** First skill worth opening for each experience level. */
export const STARTER_SKILL: Record<ExperienceLevel, string> = {
  beginner: "plank-hold",
  intermediate: "l-sit",
  advanced: "tuck-planche",
};

export function readPreferences(): Preferences {
  if (typeof window === "undefined") return DEFAULT_PREFERENCES;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_PREFERENCES;
    const parsed = JSON.parse(raw) as Partial<Preferences>;
    return { ...DEFAULT_PREFERENCES, ...parsed };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export function writePreferences(update: Partial<Preferences>): Preferences {
  const next = { ...readPreferences(), ...update };
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent("cft:preferences"));
  } catch {
    // ignore
  }
  return next;
}
