"use client";

import Link from "next/link";
import { LEARNING_PATHS, getSkill, getSkillPathStep } from "@cft/core";
import { Screen, ChevronRight } from "@/components/app/Screen";
import { useLocalHistory } from "@/hooks/useLocalHistory";
import { usePreferences } from "@/hooks/usePreferences";
import { useMounted } from "@/hooks/useMounted";
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
  const mounted = useMounted();

  const focusSkillId = stats.lastSkillId ?? prefs.focusSkillId ?? STARTER_SKILL[prefs.experience];
  const focusSkill = getSkill(focusSkillId) ?? getSkill("plank-hold")!;
  const step = getSkillPathStep(focusSkill.id);
  const best = stats.bestBySkill[focusSkill.id];
  const weekMs = stats.last7Days.reduce((s, d) => s + d.totalMs, 0);

  return (
    <Screen title={mounted ? greeting() : "Welcome"}>
      <Link href={`/train/${focusSkill.id}`} className="hero-card mb-3 block active:opacity-90">
        <div className="text-xs font-semibold uppercase tracking-wide text-white/80">{stats.lastSkillId ? "Continue" : "Start here"}</div>
        <div className="mt-1 text-2xl font-bold leading-tight">{focusSkill.name}</div>
        <div className="mt-3 flex items-center justify-between">
          <div className="text-sm text-white/85">
            {best ? `Best ${formatSec(best.durationMs)}` : step ? `${step.path.name} · step ${step.step} of ${step.total}` : ""}
          </div>
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-accent-hover">
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor" aria-hidden>
              <path d="M8 5v14l11-7z" />
            </svg>
          </span>
        </div>
      </Link>

      <Link href="/train" className="list-group list-row mb-6">
        <div className="flex-1 font-semibold text-foreground">Auto-detect any hold</div>
        <ChevronRight />
      </Link>

      <div className="mb-6 grid grid-cols-3 gap-3">
        <Tile label="Streak" value={loaded ? `${stats.streakDays}d` : "–"} />
        <Tile label="This week" value={loaded ? formatSec(weekMs) : "–"} />
        <Tile label="Holds" value={loaded ? String(stats.totalHolds) : "–"} />
      </div>

      <h2 className="list-group-title">Paths</h2>
      <div className="list-group">
        {LEARNING_PATHS.map((path) => {
          const trained = path.skillIds.filter((id) => stats.bestBySkill[id]).length;
          return (
            <Link key={path.id} href={`/skills#${path.id}`} className="list-row">
              <div className="min-w-0 flex-1">
                <div className="font-medium text-foreground">{path.name}</div>
                <div className="text-xs text-muted">
                  {trained} of {path.skillIds.length} trained
                </div>
              </div>
              <div className="h-1.5 w-14 overflow-hidden rounded-full bg-fill">
                <div className="h-full bg-accent" style={{ width: `${(trained / path.skillIds.length) * 100}%` }} />
              </div>
              <ChevronRight />
            </Link>
          );
        })}
      </div>
    </Screen>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat-tile">
      <div className="text-xs text-muted">{label}</div>
      <div className="mt-0.5 text-xl font-bold text-foreground">{value}</div>
    </div>
  );
}
