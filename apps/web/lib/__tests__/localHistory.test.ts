import { describe, it, expect } from "vitest";
import { computeStats, type LocalHold } from "../localHistory";

function hold(skillId: string, daysAgo: number, durationMs = 10000, formScore = 80, now = new Date("2026-09-16T15:00:00")): LocalHold {
  const d = new Date(now);
  d.setDate(d.getDate() - daysAgo);
  return { id: `${skillId}-${daysAgo}`, skillId, mode: "hold_only", durationMs, formScore, endedAt: d.toISOString() };
}

const NOW = new Date("2026-09-16T15:00:00");

describe("computeStats", () => {
  it("handles an empty history", () => {
    const s = computeStats([], NOW);
    expect(s.totalHolds).toBe(0);
    expect(s.streakDays).toBe(0);
    expect(s.last7Days).toHaveLength(7);
    expect(s.last7Days.every((d) => d.holds === 0)).toBe(true);
    expect(s.lastSkillId).toBeNull();
  });

  it("counts a streak through today", () => {
    const s = computeStats([hold("a", 0), hold("a", 1), hold("b", 2)], NOW);
    expect(s.streakDays).toBe(3);
  });

  it("keeps a streak alive when today has no hold yet", () => {
    const s = computeStats([hold("a", 1), hold("a", 2)], NOW);
    expect(s.streakDays).toBe(2);
  });

  it("breaks the streak on a missed day", () => {
    const s = computeStats([hold("a", 0), hold("a", 2)], NOW);
    expect(s.streakDays).toBe(1);
  });

  it("tracks best and latest per skill and buckets the last seven days", () => {
    const history = [hold("plank", 0, 20000, 90), hold("plank", 1, 40000, 70), hold("lsit", 8, 5000, 60)];
    const s = computeStats(history, NOW);
    expect(s.bestBySkill.plank.durationMs).toBe(40000);
    expect(s.lastBySkill.plank.durationMs).toBe(20000);
    expect(s.lastSkillId).toBe("plank");
    expect(s.totalMs).toBe(65000);
    expect(s.last7Days[6].holds).toBe(1); // today
    expect(s.last7Days[5].totalMs).toBe(40000); // yesterday
    expect(s.last7Days.reduce((n, d) => n + d.holds, 0)).toBe(2); // 8-day-old hold excluded
  });
});
