"use client";

import { LEARNING_PATHS, getSkill } from "@cft/core";
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
            {path.skillIds.map((skillId, index) => {
              const skill = getSkill(skillId);
              if (!skill) return null;
              const best = stats.bestBySkill[skillId];
              return (
                <ListRow
                  key={skillId}
                  href={`/train/${skillId}`}
                  label={`${index + 1}. ${skill.name}`}
                  detail={best ? `Best ${formatSec(best.durationMs)}` : undefined}
                />
              );
            })}
          </ListGroup>
        </div>
      ))}
      <ListGroup>
        <ListRow href="/train" label="Auto-detect" detail="Strike any hold and the app names it" />
      </ListGroup>
    </Screen>
  );
}
