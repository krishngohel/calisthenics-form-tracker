"use client";

import Link from "next/link";
import { LEARNING_PATHS, getSkill } from "@cft/core";
import { Screen, ChevronRight } from "@/components/app/Screen";
import { useLocalHistory } from "@/hooks/useLocalHistory";
import { formatSec } from "@/lib/format";

export default function SkillsPage() {
  const { stats } = useLocalHistory();

  return (
    <Screen title="Paths" subtitle="Each path builds toward a goal skill. Train in order or jump in.">
      <Link href="/train" className="hero-card mb-6 flex items-center justify-between gap-4 active:scale-[0.99]">
        <div>
          <div className="text-lg font-extrabold">Auto-detect</div>
          <div className="text-sm text-white/85">Strike a hold and the app picks the skill.</div>
        </div>
        <span className="text-2xl">→</span>
      </Link>

      {LEARNING_PATHS.map((path) => (
        <section key={path.id} id={path.id} className="mb-8 scroll-mt-4">
          <div className="mb-2 flex items-baseline justify-between px-1">
            <h2 className="text-lg font-bold text-foreground">{path.name}</h2>
            <span className="text-xs text-muted">{path.skillIds.length} skills</span>
          </div>
          <p className="mb-3 px-1 text-sm text-muted">{path.description}</p>
          <div className="list-group">
            {path.skillIds.map((skillId, index) => {
              const skill = getSkill(skillId);
              if (!skill) return null;
              const best = stats.bestBySkill[skillId];
              return (
                <Link key={skillId} href={`/train/${skillId}`} className="list-row">
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                      best ? "bg-accent text-accent-foreground" : "bg-accent-soft text-accent-hover"
                    }`}
                  >
                    {best ? "✓" : index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-foreground">{skill.name}</div>
                    <div className="truncate text-xs text-muted">
                      {best ? `Best ${formatSec(best.durationMs)} · ` : ""}
                      {skill.cameraAngle} view
                    </div>
                  </div>
                  <ChevronRight />
                </Link>
              );
            })}
          </div>
        </section>
      ))}
    </Screen>
  );
}
