"use client";

import Link from "next/link";
import { LEARNING_PATHS, getSkill, getSkillPathStep } from "@cft/core";
import { Screen } from "@/components/app/Screen";
import { useLocalHistory } from "@/hooks/useLocalHistory";
import { usePreferences } from "@/hooks/usePreferences";
import { STARTER_SKILL } from "@/lib/preferences";
import { formatSec } from "@/lib/format";

function greeting(): string {
  const h = new Date().getHours();
  if (h < 5) return "Late session";
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export default function HomePage() {
  const { stats, loaded } = useLocalHistory();
  const { prefs } = usePreferences();

  const focusSkillId = stats.lastSkillId ?? prefs.focusSkillId ?? STARTER_SKILL[prefs.experience];
  const focusSkill = getSkill(focusSkillId) ?? getSkill("plank-hold")!;
  const step = getSkillPathStep(focusSkill.id);
  const best = stats.bestBySkill[focusSkill.id];
  const nextInPath = step && step.step < step.total ? getSkill(step.path.skillIds[step.step]) : null;
  const trainedToday = stats.last7Days[6]?.holds > 0;
  const weekMs = stats.last7Days.reduce((s, d) => s + d.totalMs, 0);
  const maxDay = Math.max(1, ...stats.last7Days.map((d) => d.totalMs));

  return (
    <Screen title={greeting()} subtitle={trainedToday ? "You've trained today. Nice." : "Ready when you are."}>
      <Link href={`/train/${focusSkill.id}`} className="hero-card mb-4 block active:scale-[0.99]">
        <div className="text-xs font-bold uppercase tracking-[0.18em] text-white/80">
          {stats.lastSkillId ? "Continue" : "Start here"}
        </div>
        <div className="mt-1 text-2xl font-extrabold leading-tight">{focusSkill.name}</div>
        <div className="mt-1 text-sm text-white/85">{focusSkill.cameraGuide}</div>
        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm font-semibold text-white/90">
            {best ? `Best ${formatSec(best.durationMs)}` : step ? `${step.path.name} · step ${step.step} of ${step.total}` : ""}
          </div>
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-accent-hover">
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor" aria-hidden>
              <path d="M8 5v14l11-7z" />
            </svg>
          </span>
        </div>
      </Link>

      <div className="mb-6 grid grid-cols-3 gap-3">
        <Tile label="Streak" value={loaded ? `${stats.streakDays}d` : "–"} />
        <Tile label="This week" value={loaded ? formatSec(weekMs) : "–"} />
        <Tile label="Holds" value={loaded ? String(stats.totalHolds) : "–"} />
      </div>

      <section className="stat-tile mb-6">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-sm font-semibold text-foreground">Last 7 days</h2>
          <Link href="/progress" className="text-sm font-medium text-accent">
            Progress
          </Link>
        </div>
        <div className="flex h-20 items-end gap-2" role="img" aria-label="Hold time per day for the last seven days">
          {stats.last7Days.map((d) => (
            <div key={d.date} className="flex flex-1 flex-col items-center gap-1">
              <div className="flex h-14 w-full items-end">
                <div
                  className={`w-full rounded-md ${d.totalMs > 0 ? "bg-accent" : "bg-border-subtle"}`}
                  style={{ height: `${Math.max(6, (d.totalMs / maxDay) * 100)}%` }}
                />
              </div>
              <span className="text-[10px] font-medium text-muted">{new Date(d.date + "T12:00:00").toLocaleDateString(undefined, { weekday: "narrow" })}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-6">
        <h2 className="list-group-title">Quick start</h2>
        <div className="grid grid-cols-2 gap-3">
          <Link href="/train" className="stat-tile active:bg-surface-muted">
            <div className="text-2xl">🎯</div>
            <div className="mt-2 font-bold text-foreground">Auto-detect</div>
            <div className="text-xs text-muted">Strike any hold</div>
          </Link>
          {nextInPath && (
            <Link href={`/train/${nextInPath.id}`} className="stat-tile active:bg-surface-muted">
              <div className="text-2xl">⬆️</div>
              <div className="mt-2 font-bold text-foreground">{nextInPath.name}</div>
              <div className="text-xs text-muted">Next in path</div>
            </Link>
          )}
        </div>
      </section>

      <section>
        <h2 className="list-group-title">Paths</h2>
        <div className="space-y-2">
          {LEARNING_PATHS.map((path) => {
            const trained = path.skillIds.filter((id) => stats.bestBySkill[id]).length;
            return (
              <Link key={path.id} href={`/skills#${path.id}`} className="list-group list-row">
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-foreground">{path.name}</div>
                  <div className="text-xs text-muted">
                    {trained} of {path.skillIds.length} skills trained
                  </div>
                </div>
                <div className="h-1.5 w-16 overflow-hidden rounded-full bg-border-subtle">
                  <div className="h-full bg-accent" style={{ width: `${(trained / path.skillIds.length) * 100}%` }} />
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </Screen>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat-tile">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">{label}</div>
      <div className="mt-1 text-xl font-extrabold text-foreground">{value}</div>
    </div>
  );
}
