"use client";

import { LEARNING_PATHS, bandForLevel, describeGoal, getPathForSkill, getSkill, type Band } from "@cft/core";
import { Screen, ListGroup, ListRow } from "@/components/app/Screen";
import { useLocalHistory } from "@/hooks/useLocalHistory";
import { formatSec } from "@/lib/format";

const BAND_LABEL: Record<Band, string> = { beginner: "Beginner", intermediate: "Intermediate", advanced: "Advanced", elite: "Elite" };

export default function SkillsPage() {
  const { stats } = useLocalHistory();

  /** A hold-based goal counts as met when the best logged hold reaches it. Rep-based goals are tracked outside the app. */
  const goalMet = (skillId: string) => {
    const goal = getPathForSkill(skillId)?.steps.find((s) => s.skillId === skillId)?.goal;
    const best = stats.bestBySkill[skillId];
    return !!goal?.holdSec && !!best && best.durationMs >= goal.holdSec * 1000;
  };

  return (
    <Screen title="Paths" subtitle="Levels 1–16 follow the Overcoming Gravity charts">
      <ListGroup>
        <ListRow href="/skills/guide" label="How progression works" detail="Working holds, volume, and when to move up" />
        <ListRow href="/train" label="Auto-detect" detail="Strike any hold and the app names it" />
      </ListGroup>
      {LEARNING_PATHS.map((path) => (
        <div key={path.id} id={path.id} className="scroll-mt-4">
          <ListGroup title={path.name}>
            {path.steps.map((step, index) => {
              const skill = getSkill(step.skillId);
              if (!skill) return null;
              const best = stats.bestBySkill[step.skillId];
              const achieved = goalMet(step.skillId);
              const unmet = (step.prerequisites ?? []).filter((id) => !goalMet(id));
              const band = bandForLevel(step.level);
              const detail = (
                <span className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                  <span className={band === "beginner" || band === "intermediate" ? "chip-muted" : "chip"}>L{step.level} · {BAND_LABEL[band]}</span>
                  <span>{describeGoal(step.goal)}</span>
                  {best && <span>· best {formatSec(best.durationMs)}</span>}
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
                  href={`/train/${step.skillId}`}
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
          <p className="-mt-4 mb-6 px-4 text-xs text-muted">{path.description}</p>
        </div>
      ))}
    </Screen>
  );
}
