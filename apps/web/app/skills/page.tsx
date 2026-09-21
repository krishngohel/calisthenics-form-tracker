"use client";

import { FAMILIES, LEARNING_PATHS, bandForLevel, describeGoal, familyLevels, getSkill, isGoalMet, pathsByFamily, unmetPrerequisites, type Band, type FamilyId } from "@cft/core";
import { useMemo, useState } from "react";
import { Screen, ListGroup, ListRow } from "@/components/app/Screen";
import { useLocalHistory } from "@/hooks/useLocalHistory";
import { formatSec } from "@/lib/format";

const BAND_LABEL: Record<Band, string> = { beginner: "Beginner", intermediate: "Intermediate", advanced: "Advanced", elite: "Elite" };

export default function SkillsPage() {
  const { stats, bests, reps } = useLocalHistory();
  const [query, setQuery] = useState("");
  const [family, setFamily] = useState<FamilyId | "all">("all");
  const q = query.trim().toLowerCase();
  const levels = useMemo(() => familyLevels(bests, reps), [bests, reps]);
  const groups = useMemo(
    () =>
      pathsByFamily()
        .filter((g) => family === "all" || g.family.id === family)
        .map((g) => ({
          ...g,
          paths: q
            ? g.paths.map((p) => ({ ...p, steps: p.steps.filter((s) => (getSkill(s.skillId)?.name ?? "").toLowerCase().includes(q) || p.name.toLowerCase().includes(q)) })).filter((p) => p.steps.length > 0)
            : g.paths,
        }))
        .filter((g) => g.paths.length > 0),
    [family, q]
  );

  return (
    <Screen title="Paths" subtitle="Five families of movement, each with its ladders">
      <div className="segmented mb-3" role="tablist" aria-label="Family">
        {(["all", ...FAMILIES.map((f) => f.id)] as const).map((id) => (
          <button key={id} type="button" role="tab" aria-selected={family === id} onClick={() => setFamily(id)} className={`segmented-btn ${family === id ? "segmented-btn-active" : ""}`}>
            {id === "all" ? "All" : FAMILIES.find((f) => f.id === id)!.name}
          </button>
        ))}
      </div>
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
      {q && groups.length === 0 && <p className="px-4 text-sm text-muted">No skill matches “{query}”.</p>}
      {groups.map(({ family: fam, paths }) => {
        const lvl = levels.find((l) => l.family.id === fam.id);
        return (
          <section key={fam.id} id={`family-${fam.id}`} className="mb-2 scroll-mt-4">
            <div className="mb-3 flex items-end justify-between gap-3 px-1">
              <div className="min-w-0">
                <h2 className="text-xl font-bold text-foreground">{fam.name}</h2>
                {!q && <p className="text-sm text-muted">{fam.description}</p>}
              </div>
              {lvl && lvl.completed > 0 && (
                <span className="chip shrink-0" aria-label={`${fam.name} level ${lvl.level}`}>
                  L{lvl.level} · {lvl.completed}/{lvl.total}
                </span>
              )}
            </div>
            {paths.map((path) => (
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
          </section>
        );
      })}
    </Screen>
  );
}
