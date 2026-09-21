"use client";

import { LEARNING_PATHS, bandForLevel, describeGoal, getSkill, isGoalMet, unmetPrerequisites, type Band } from "@cft/core";
import { useMemo, useState } from "react";
import { Screen, ListGroup, ListRow } from "@/components/app/Screen";
import { useLocalHistory } from "@/hooks/useLocalHistory";
import { formatSec } from "@/lib/format";

const BAND_LABEL: Record<Band, string> = { beginner: "Beginner", intermediate: "Intermediate", advanced: "Advanced", elite: "Elite" };

export default function SkillsPage() {
  const { stats, bests, reps } = useLocalHistory();
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const visiblePaths = useMemo(
    () =>
      q
        ? LEARNING_PATHS.map((p) => ({ ...p, steps: p.steps.filter((s) => (getSkill(s.skillId)?.name ?? "").toLowerCase().includes(q) || p.name.toLowerCase().includes(q)) })).filter((p) => p.steps.length > 0)
        : LEARNING_PATHS,
    [q]
  );

  return (
    <Screen title="Paths" subtitle="Tap a skill to learn it, then train it">
      <input
        type="search"
        inputMode="search"
        className="input-field mb-5"
        placeholder="Search skills"
        aria-label="Search skills"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {!q && (
        <ListGroup>
          <ListRow href="/skills/guide" label="How progression works" detail="Working holds, volume, and when to move up" />
          <ListRow href="/train" label="Auto-detect" detail="Strike any hold and the app names it" />
        </ListGroup>
      )}
      {q && visiblePaths.length === 0 && <p className="px-4 text-sm text-muted">No skill matches “{query}”.</p>}
      {visiblePaths.map((path) => (
        <div key={path.id} id={path.id} className="scroll-mt-4">
          <ListGroup title={path.name}>
            {path.steps.map((step) => {
              const skill = getSkill(step.skillId);
              if (!skill) return null;
              const index = LEARNING_PATHS.find((p) => p.id === path.id)?.steps.findIndex((s) => s.skillId === step.skillId) ?? 0;
              const best = stats.bestBySkill[step.skillId];
              const bestReps = stats.bestRepsBySkill[step.skillId];
              const achieved = isGoalMet(step.skillId, bests, reps);
              const unmet = unmetPrerequisites(step.skillId, bests, reps);
              const band = bandForLevel(step.level);
              const detail = (
                <span className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                  <span className={band === "beginner" || band === "intermediate" ? "chip-muted" : "chip"}>L{step.level} · {BAND_LABEL[band]}</span>
                  <span>{describeGoal(step.goal)}</span>
                  {best && <span>· best {formatSec(best.durationMs)}</span>}
                  {!best && bestReps && <span>· logged {bestReps.sets}×{bestReps.reps}</span>}
                  {unmet.length > 0 && (
                    <span className="basis-full text-warning">
                      Needs {unmet.map((id) => getSkill(id)?.name ?? id).join(", ")}
                    </span>
                  )}
                  {step.focus && <span className="basis-full">{step.focus}</span>}
                </span>
              );
              return (
                <ListRow
                  key={step.skillId}
                  href={`/learn/${step.skillId}`}
                  label={`${index + 1}. ${skill.name}`}
                  detail={detail}
                  trailing={
                    achieved ? (
                      <span className="text-sm font-semibold text-success" aria-label="Goal reached">
                        ✓
                      </span>
                    ) : undefined
                  }
                />
              );
            })}
          </ListGroup>
          {!q && <p className="-mt-4 mb-6 px-4 text-xs text-muted">{path.description}</p>}
        </div>
      ))}
    </Screen>
  );
}
