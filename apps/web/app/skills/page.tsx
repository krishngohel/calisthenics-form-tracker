"use client";

import { LEARNING_PATHS, describeGoal, getSkill } from "@cft/core";
import { Screen, ListGroup, ListRow } from "@/components/app/Screen";
import { useLocalHistory } from "@/hooks/useLocalHistory";
import { formatSec } from "@/lib/format";

export default function SkillsPage() {
  const { stats } = useLocalHistory();

  return (
    <Screen title="Paths">
      {LEARNING_PATHS.map((path) => (
        <div key={path.id} id={path.id} className="scroll-mt-4">
          <ListGroup title={path.name}>
            {path.steps.map(({ skillId, goal }, index) => {
              const skill = getSkill(skillId);
              if (!skill) return null;
              const best = stats.bestBySkill[skillId];
              const achieved = !!goal.holdSec && !!best && best.durationMs >= goal.holdSec * 1000;
              const detail = [describeGoal(goal), best ? `best ${formatSec(best.durationMs)}` : null].filter(Boolean).join(" · ");
              return (
                <ListRow
                  key={skillId}
                  href={`/train/${skillId}`}
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
      <ListGroup>
        <ListRow href="/train" label="Auto-detect" detail="Strike any hold and the app names it" />
      </ListGroup>
    </Screen>
  );
}
