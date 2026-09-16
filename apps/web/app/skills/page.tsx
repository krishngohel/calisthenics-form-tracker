"use client";

import Link from "next/link";
import { LEARNING_PATHS, getSkill } from "@cft/core";

const PATH_ACCENTS: Record<string, string> = {
  push: "from-teal-500/20 to-transparent",
  pull: "from-sky-500/20 to-transparent",
  handstand: "from-violet-500/20 to-transparent",
  "static-strength": "from-amber-500/20 to-transparent",
  legs: "from-rose-500/20 to-transparent",
};

export default function SkillsPage() {
  return (
    <div className="page">
      <h1 className="page-title">Learning paths</h1>
      <p className="mb-6 mt-1 max-w-2xl text-sm leading-relaxed text-muted sm:text-base">
        Follow each path in order — earlier skills build the strength and positions needed for later ones.
      </p>

      <Link
        href="/train"
        className="card-interactive mb-8 flex items-center justify-between gap-4 border-accent/30 bg-gradient-to-r from-accent-soft to-transparent p-4 sm:p-5"
      >
        <div className="min-w-0">
          <h2 className="text-base font-bold text-accent-hover sm:text-lg">Auto-detect training</h2>
          <p className="mt-1 text-sm text-muted">Already know a hold? The camera picks the skill automatically.</p>
        </div>
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent text-xl text-accent-foreground">→</span>
      </Link>

      <div className="space-y-10">
        {LEARNING_PATHS.map((path) => (
          <section key={path.id} aria-labelledby={`path-${path.id}`}>
            <div className={`mb-4 rounded-2xl bg-gradient-to-r p-4 ${PATH_ACCENTS[path.id] ?? ""}`}>
              <h2 id={`path-${path.id}`} className="text-lg font-bold text-foreground sm:text-xl">
                {path.name}
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-muted">{path.description}</p>
              <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-muted">
                {path.skillIds.length} {path.skillIds.length === 1 ? "skill" : "skills"}
              </p>
            </div>

            <ol className="space-y-3">
              {path.skillIds.map((skillId, index) => {
                const skill = getSkill(skillId);
                if (!skill) return null;
                const isFirst = index === 0;
                const isLast = index === path.skillIds.length - 1;

                return (
                  <li key={skillId}>
                    <Link href={`/train/${skillId}`} className="group flex gap-3 card-interactive p-4 sm:gap-4 sm:p-5">
                      <div className="flex shrink-0 flex-col items-center">
                        <span
                          className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold ${
                            isFirst
                              ? "bg-accent text-accent-foreground shadow-sm"
                              : "bg-accent-soft text-accent-hover group-hover:bg-accent-muted/60"
                          }`}
                        >
                          {index + 1}
                        </span>
                        {!isLast && <span className="mt-1 min-h-4 w-px flex-1 bg-border" aria-hidden />}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-semibold text-foreground">{skill.name}</h3>
                          {isFirst && <span className="chip">Start here</span>}
                          {isLast && path.skillIds.length > 1 && <span className="chip-muted">Path goal</span>}
                        </div>
                        <p className="mt-1 text-sm leading-relaxed text-muted">{skill.cameraGuide}</p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          <span className="chip-muted capitalize">{skill.cameraAngle} camera</span>
                          {skill.needsHands && <span className="chip-muted">Hands tracked</span>}
                        </div>
                      </div>

                      <span className="shrink-0 self-center text-xl text-muted transition group-hover:text-accent">→</span>
                    </Link>
                  </li>
                );
              })}
            </ol>
          </section>
        ))}
      </div>
    </div>
  );
}
