"use client";

import Link from "next/link";
import { LEARNING_PATHS, getSkill, getSkillPathStep } from "@cft/core";
import { Screen, ChevronRight, ListGroup, ListRow } from "@/components/app/Screen";
import { useLocalHistory } from "@/hooks/useLocalHistory";
import { usePreferences } from "@/hooks/usePreferences";
import { STARTER_SKILL } from "@/lib/preferences";
import { formatSec } from "@/lib/format";

export default function HomePage() {
  const { stats, loaded } = useLocalHistory();
  const { prefs } = usePreferences();

  const focusSkillId = stats.lastSkillId ?? prefs.focusSkillId ?? STARTER_SKILL[prefs.experience];
  const focusSkill = getSkill(focusSkillId) ?? getSkill("plank-hold")!;
  const step = getSkillPathStep(focusSkill.id);
  const best = stats.bestBySkill[focusSkill.id];
  const weekMs = stats.last7Days.reduce((s, d) => s + d.totalMs, 0);
  const hasHistory = loaded && stats.totalHolds > 0;

  return (
    <Screen title="Train">
      <Link href={`/train/${focusSkill.id}`} className="primary-row mb-6">
        <div className="min-w-0 flex-1">
          <div className="text-xs text-white/70">{stats.lastSkillId ? "Continue" : "Suggested"}</div>
          <div className="truncate text-xl font-semibold">{focusSkill.name}</div>
          <div className="text-sm text-white/80">
            {best ? `Best ${formatSec(best.durationMs)}` : step ? `${step.path.name}, step ${step.step} of ${step.total}` : ""}
          </div>
        </div>
        <ChevronRight className="text-white/70" />
      </Link>

      {hasHistory && (
        <p className="mb-6 px-1 text-sm text-muted">
          {stats.streakDays > 0 ? `${stats.streakDays}-day streak` : "No streak yet"} · {formatSec(weekMs)} this week · {stats.totalHolds} hold
          {stats.totalHolds === 1 ? "" : "s"}
        </p>
      )}

      <ListGroup title="Paths">
        {LEARNING_PATHS.map((path) => {
          const trained = path.skillIds.filter((id) => stats.bestBySkill[id]).length;
          return (
            <ListRow
              key={path.id}
              href={`/skills#${path.id}`}
              label={path.name}
              detail={trained > 0 ? `${trained} of ${path.skillIds.length} skills trained` : `${path.skillIds.length} skills`}
            />
          );
        })}
      </ListGroup>

      <ListGroup>
        <ListRow href="/train" label="Auto-detect" detail="Strike any hold and the app names it" />
      </ListGroup>
    </Screen>
  );
}
