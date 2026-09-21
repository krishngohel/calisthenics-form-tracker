"use client";

import Link from "next/link";
import { LEARNING_PATHS, athleteLevel, buildSessionPlan, describeGoal, getSkill, getSkillPathStep } from "@cft/core";
import { useMemo } from "react";
import { Screen, ChevronRight, ListGroup, ListRow } from "@/components/app/Screen";
import { useLocalHistory } from "@/hooks/useLocalHistory";
import { usePreferences } from "@/hooks/usePreferences";
import { STARTER_SKILL } from "@/lib/preferences";
import { formatSec } from "@/lib/format";

export default function HomePage() {
  const { stats, loaded, bests, reps } = useLocalHistory();
  const { prefs } = usePreferences();

  const focusSkillId = stats.lastSkillId ?? prefs.focusSkillId ?? STARTER_SKILL[prefs.experience];
  const focusSkill = getSkill(focusSkillId) ?? getSkill("plank-hold")!;
  const step = getSkillPathStep(focusSkill.id);
  const best = stats.bestBySkill[focusSkill.id];
  const weekMs = stats.last7Days.reduce((s, d) => s + d.totalMs, 0);
  const hasHistory = loaded && stats.totalHolds > 0;
  const plan = useMemo(() => buildSessionPlan(bests, reps, 4), [bests, reps]);
  const level = useMemo(() => athleteLevel(bests, reps), [bests, reps]);
  const BAND = { beginner: "Beginner", intermediate: "Intermediate", advanced: "Advanced", elite: "Elite" } as const;

  return (
    <Screen title="Train">
      <Link href={`/train/${focusSkill.id}`} className="primary-row mb-6">
        <div className="min-w-0 flex-1">
          <div className="text-xs text-white/70">{stats.lastSkillId ? "Continue" : "Suggested"}</div>
          <div className="truncate text-xl font-semibold">{focusSkill.name}</div>
          <div className="text-sm text-white/80">
            {[step ? `${step.path.name} ${step.step}/${step.total}` : null, step ? describeGoal(step.goal) : null, best ? `best ${formatSec(best.durationMs)}` : null]
              .filter(Boolean)
              .join(" · ")}
          </div>
        </div>
        <ChevronRight className="text-white/70" />
      </Link>

      {hasHistory && (
        <p className="mb-6 px-1 text-sm text-muted">
          {level.level > 0 ? `Level ${level.level} · ${BAND[level.band]}` : "No goals met yet"} · {stats.streakDays > 0 ? `${stats.streakDays}-day streak` : "no streak yet"} · {formatSec(weekMs)} this week
        </p>
      )}

      {plan.length > 0 && (
        <ListGroup title="Today's plan">
          {plan.map(({ step, prescription, isTest }) => {
            const sk = getSkill(step.skillId);
            const st = getSkillPathStep(step.skillId);
            if (!sk || !st) return null;
            const isRep = !!step.goal.sets;
            return (
              <ListRow
                key={step.skillId}
                href={isRep || isTest ? `/learn/${step.skillId}` : `/train/${step.skillId}`}
                label={sk.name}
                detail={`${st.path.name} · L${step.level} · ${isRep ? "log reps" : isTest ? "find your max" : `working sets, goal ${describeGoal(step.goal)}`}`}
                trailing={<span className="font-mono text-sm tabular-nums text-muted">{prescription}</span>}
              />
            );
          })}
          <ListRow href="/skills/guide" label="Why these numbers" />
        </ListGroup>
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
