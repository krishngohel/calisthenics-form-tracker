import type { HoldMode } from "@cft/core";

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
}

const KEY = "cft-history";
const MAX_ENTRIES = 500;

export function readHistory(): LocalHold[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as LocalHold[]) : [];
  } catch {
    return [];
  }
}

export function appendHold(hold: Omit<LocalHold, "id">): LocalHold[] {
  const entry: LocalHold = { ...hold, id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}` };
  const next = [entry, ...readHistory()].slice(0, MAX_ENTRIES);
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent("cft:history"));
  } catch {
    // ignore
  }
  return next;
}

export function clearHistory(): void {
  try {
    localStorage.removeItem(KEY);
    window.dispatchEvent(new CustomEvent("cft:history"));
  } catch {
    // ignore
  }
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
  bestBySkill: Record<string, LocalHold>;
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
  const lastBySkill: Record<string, LocalHold> = {};
  const byDay = new Map<string, DayTotal>();
  let totalMs = 0;

  for (const h of history) {
    totalMs += h.durationMs;
    if (!bestBySkill[h.skillId] || h.durationMs > bestBySkill[h.skillId].durationMs) bestBySkill[h.skillId] = h;
    if (!lastBySkill[h.skillId]) lastBySkill[h.skillId] = h; // history is newest-first
    const key = localDateKey(new Date(h.endedAt));
    const day = byDay.get(key) ?? { date: key, totalMs: 0, holds: 0 };
    day.totalMs += h.durationMs;
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
    totalHolds: history.length,
    totalMs,
    streakDays,
    bestBySkill,
    lastBySkill,
    last7Days,
    lastSkillId: history[0]?.skillId ?? null,
  };
}
