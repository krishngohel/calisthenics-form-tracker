"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  EQUIPMENT_LABEL,
  PROGRESSIONS,
  bandForLevel,
  describeGoal,
  evaluateSkill,
  getLesson,
  getSkill,
  getSkillPathStep,
  getTargetPose,
  isGoalMet,
  unmetPrerequisites,
  workingHoldSec,
} from "@cft/core";
import { Screen, ChevronRight, ListGroup, ListRow } from "@/components/app/Screen";
import { useLocalHistory } from "@/hooks/useLocalHistory";
import { formatSec } from "@/lib/format";
import { PoseFigure } from "./PoseFigure";
import { RepLogSheet } from "./RepLogSheet";

const BAND_LABEL = { beginner: "Beginner", intermediate: "Intermediate", advanced: "Advanced", elite: "Elite" } as const;

function Bullets({ items }: { items: string[] }) {
  return (
    <ul className="list-disc space-y-1.5 px-4 py-3 pl-9 text-sm leading-relaxed text-foreground">
      {items.map((t) => (
        <li key={t}>{t}</li>
      ))}
    </ul>
  );
}

/** Lesson screen: what the skill is, how to do it, what the camera checks, then Train. */
export function SkillLesson({ skillId }: { skillId: string }) {
  const skill = getSkill(skillId);
  const lesson = getLesson(skillId);
  const step = getSkillPathStep(skillId);
  const { stats, bests, reps } = useLocalHistory();
  const [logOpen, setLogOpen] = useState(false);

  /** Metric labels the evaluator scores, read off the target pose so the list matches the rules exactly. */
  const checks = useMemo(() => {
    if (!skill) return [];
    const pose = getTargetPose(skill.id);
    if (!pose) return [];
    try {
      return evaluateSkill(skill.id, pose, { left: null, right: null }, [], "perfect")?.metrics.map((m) => m.label) ?? [];
    } catch {
      return [];
    }
  }, [skill]);

  if (!skill || !lesson) {
    return (
      <Screen title="Not found" back={{ href: "/skills", label: "Paths" }}>
        <p className="px-4 text-sm text-muted">This skill has no lesson yet.</p>
      </Screen>
    );
  }

  const best = stats.bestBySkill[skill.id];
  const bestReps = stats.bestRepsBySkill[skill.id];
  const met = isGoalMet(skill.id, bests, reps);
  const unmet = unmetPrerequisites(skill.id, bests, reps);
  const repGoal = step?.goal.sets && step.goal.reps ? { sets: step.goal.sets, reps: step.goal.reps } : null;
  const prereqs = step?.prerequisites ?? [];
  const drills = PROGRESSIONS[skill.id] ?? [];
  const nextId = step && step.step < step.total ? step.path.skillIds[step.step] : null;
  const prevId = step && step.step > 1 ? step.path.skillIds[step.step - 2] : null;

  return (
    <Screen
      title={skill.name}
      subtitle={step ? `${step.path.name} · step ${step.step} of ${step.total}` : undefined}
      back={{ href: "/skills", label: "Paths" }}
    >
      <div className="mb-4 flex items-start gap-4 px-1">
        <p className="min-w-0 flex-1 text-base leading-relaxed text-foreground">{lesson.summary}</p>
        <div className="h-24 w-24 shrink-0 rounded-2xl bg-surface-muted p-2 text-accent">
          <PoseFigure skillId={skill.id} className="h-full w-full" />
        </div>
      </div>

      <div className="mb-5 flex flex-wrap gap-1.5 px-1">
        {step && <span className={bandForLevel(step.level) === "beginner" || bandForLevel(step.level) === "intermediate" ? "chip-muted" : "chip"}>L{step.level} · {BAND_LABEL[bandForLevel(step.level)]}</span>}
        {lesson.equipment.map((e) => (
          <span key={e} className="chip-muted">
            {EQUIPMENT_LABEL[e]}
          </span>
        ))}
        <span className="chip-muted">{skill.cameraAngle === "side" ? "Side camera" : skill.cameraAngle === "front" ? "Front camera" : "Any angle"}</span>
      </div>

      <Link href={`/train/${skill.id}`} className="primary-row mb-6" data-testid="lesson-train">
        <div className="min-w-0 flex-1">
          <div className="text-xs text-white/70">Train with the camera</div>
          <div className="text-xl font-semibold">Start {skill.name}</div>
          <div className="text-sm text-white/80">
            {[step ? describeGoal(step.goal) : null, best ? `best ${formatSec(best.durationMs)}` : null, met ? "goal reached" : null].filter(Boolean).join(" · ")}
          </div>
        </div>
        <ChevronRight className="text-white/70" />
      </Link>

      {repGoal && (
        <ListGroup title="Rep standard">
          <ListRow
            onClick={() => setLogOpen(true)}
            label="Log a session"
            detail={bestReps ? `Best logged ${bestReps.sets}×${bestReps.reps} · ${new Date(bestReps.endedAt).toLocaleDateString()}` : `Reach ${repGoal.sets}×${repGoal.reps} clean reps to complete this step`}
            trailing={<span className={`text-sm font-semibold ${met ? "text-success" : "text-accent"}`}>{met ? "✓" : "Log"}</span>}
          />
          <RepLogSheet open={logOpen} onClose={() => setLogOpen(false)} skillId={skill.id} skillName={skill.name} defaultSets={repGoal.sets} defaultReps={repGoal.reps} />
        </ListGroup>
      )}

      {step && (prereqs.length > 0 || step.focus) && (
        <ListGroup title="Before you start">
          {step.focus && <ListRow label="Focus" detail={step.focus} />}
          {prereqs.map((id) => {
            const p = getSkill(id);
            const pStep = getSkillPathStep(id);
            const ok = !unmet.includes(id);
            return (
              <ListRow
                key={id}
                href={`/learn/${id}`}
                label={p?.name ?? id}
                detail={pStep ? describeGoal(pStep.goal) : undefined}
                trailing={<span className={`text-sm font-semibold ${ok ? "text-success" : "text-warning"}`}>{ok ? "✓" : "Needs work"}</span>}
              />
            );
          })}
        </ListGroup>
      )}

      <ListGroup title="Set up">
        <Bullets items={lesson.setup} />
      </ListGroup>
      <ListGroup title="While you hold">
        <Bullets items={lesson.cues} />
      </ListGroup>
      <ListGroup title="Common faults">
        {lesson.faults.map((f) => (
          <ListRow key={f.mistake} label={f.mistake} detail={f.fix} />
        ))}
      </ListGroup>

      {checks.length > 0 && (
        <ListGroup title="What the camera checks">
          <ListRow label={skill.cameraGuide} detail={checks.join(" · ")} />
        </ListGroup>
      )}

      {best && step?.goal.holdSec && (
        <ListGroup title="Your numbers">
          <ListRow label="Best hold" trailing={<span className="text-base text-muted">{formatSec(best.durationMs)}</span>} />
          <ListRow label="Working hold (60–75%)" trailing={<span className="text-base text-muted">{workingHoldSec(best.durationMs / 1000).map((s) => `${s} s`).join("–")}</span>} />
          <ListRow label="Goal" trailing={<span className={`text-base ${met ? "text-success" : "text-muted"}`}>{`${step.goal.holdSec} s${met ? " ✓" : ""}`}</span>} />
        </ListGroup>
      )}

      {drills.length > 0 && (
        <ListGroup title="Drills that build it">
          {drills.map((d) => (
            <ListRow
              key={d.id}
              label={d.name}
              detail={[d.description, d.sets && d.reps ? `${d.sets}×${d.reps}` : d.sets && d.targetHoldSec ? `${d.sets}×${d.targetHoldSec} s` : null].filter(Boolean).join(" · ")}
            />
          ))}
        </ListGroup>
      )}

      {(prevId || nextId) && (
        <ListGroup title="On this path">
          {prevId && <ListRow href={`/learn/${prevId}`} label={`Previous: ${getSkill(prevId)?.name ?? prevId}`} />}
          {nextId && <ListRow href={`/learn/${nextId}`} label={`Next: ${getSkill(nextId)?.name ?? nextId}`} />}
        </ListGroup>
      )}
    </Screen>
  );
}
