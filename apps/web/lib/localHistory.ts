import type { HoldMode } from "@cft/core";
import { readJson, STORAGE_KEYS, writeJson, writeString } from "./storage";

/**
 * On-device hold history. Every completed hold lands here regardless of
 * sign-in state, so Progress works offline and the home screen can show
 * streaks and personal bests immediately.
 */
export interface LocalHold {
  id: string;
  skillId: string;
  mode: HoldMode;
  durationMs: number;
  formScore: number;
  endedAt: string; // ISO
  /** Rep-based entries are logged by hand for skills trained as reps. Absent means a camera hold. */
  kind?: "hold" | "reps";
  sets?: number;
  reps?: number;
}

export function isRepEntry(h: LocalHold): boolean {
  return h.kind === "reps";
}

const MAX_ENTRIES = 500;

export function readHistory(): LocalHold[] {
  const stored = readJson<unknown>(STORAGE_KEYS.history, []);
  return Array.isArray(stored) ? (stored as LocalHold[]) : [];
}

export function appendHold(hold: Omit<LocalHold, "id">): LocalHold[] {
  const entry: LocalHold = { ...hold, id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}` };
  const next = [entry, ...readHistory()].slice(0, MAX_ENTRIES);
  writeJson(STORAGE_KEYS.history, next);
  return next;
}

/** Log a rep-based session (e.g. 3×8 push-ups) so rep standards on the paths can be met. */
export function appendReps(skillId: string, sets: number, reps: number): LocalHold[] {
  return appendHold({ skillId, mode: "hold_only", durationMs: 0, formScore: 0, endedAt: new Date().toISOString(), kind: "reps", sets, reps });
}

export function clearHistory(): void {
  writeString(STORAGE_KEYS.history, null);
}

export interface DayTotal {
  /** YYYY-MM-DD in local time. */
  date: string;
  totalMs: number;
  holds: number;
}

export interface HistoryStats {
  totalHolds: number;
  totalMs: number;
  /** Consecutive days (ending today or yesterday) with at least one hold. */
  streakDays: number;
  /** Best camera hold per skill. */
  bestBySkill: Record<string, LocalHold>;
  /** Best rep session per skill: most sets, then most reps. */
  bestRepsBySkill: Record<string, { sets: number; reps: number; endedAt: string }>;
  lastBySkill: Record<string, LocalHold>;
  last7Days: DayTotal[];
  lastSkillId: string | null;
}

function localDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function computeStats(history: LocalHold[], now = new Date()): HistoryStats {
  const bestBySkill: Record<string, LocalHold> = {};
  const bestRepsBySkill: HistoryStats["bestRepsBySkill"] = {};
  const lastBySkill: Record<string, LocalHold> = {};
  const byDay = new Map<string, DayTotal>();
  let totalMs = 0;
  let holdCount = 0;

  for (const h of history) {
    if (!lastBySkill[h.skillId]) lastBySkill[h.skillId] = h; // history is newest-first
    const key = localDateKey(new Date(h.endedAt));
    const day = byDay.get(key) ?? { date: key, totalMs: 0, holds: 0 };
    if (isRepEntry(h)) {
      const sets = h.sets ?? 0;
      const reps = h.reps ?? 0;
      const cur = bestRepsBySkill[h.skillId];
      if (!cur || sets > cur.sets || (sets === cur.sets && reps > cur.reps)) bestRepsBySkill[h.skillId] = { sets, reps, endedAt: h.endedAt };
    } else {
      totalMs += h.durationMs;
      holdCount++;
      if (!bestBySkill[h.skillId] || h.durationMs > bestBySkill[h.skillId].durationMs) bestBySkill[h.skillId] = h;
      day.totalMs += h.durationMs;
    }
    day.holds += 1;
    byDay.set(key, day);
  }

  const last7Days: DayTotal[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const key = localDateKey(d);
    last7Days.push(byDay.get(key) ?? { date: key, totalMs: 0, holds: 0 });
  }

  let streakDays = 0;
  const cursor = new Date(now);
  if (!byDay.has(localDateKey(cursor))) cursor.setDate(cursor.getDate() - 1); // today not yet trained → count from yesterday
  while (byDay.has(localDateKey(cursor))) {
    streakDays++;
    cursor.setDate(cursor.getDate() - 1);
  }

  return {
    totalHolds: holdCount,
    totalMs,
    streakDays,
    bestBySkill,
    bestRepsBySkill,
    lastBySkill,
    last7Days,
    lastSkillId: history[0]?.skillId ?? null,
  };
}
