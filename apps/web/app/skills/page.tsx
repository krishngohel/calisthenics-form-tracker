"use client";

import Link from "next/link";
import { LEARNING_PATHS, getSkill } from "@cft/core";

export default function SkillsPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:py-8">
      <h1 className="mb-2 text-xl font-bold text-foreground sm:text-2xl">
        Learning paths
      </h1>
      <p className="mb-6 text-sm leading-relaxed text-muted sm:text-base">
        Follow each path in order — earlier skills build the strength and positions
        needed for later ones.
      </p>

      <Link
        href="/train"
        className="card-interactive mb-8 flex items-center justify-between border-accent/25 bg-accent-soft/40 p-4 sm:p-5"
      >
        <div>
          <h2 className="font-semibold text-accent-hover">Auto-detect training</h2>
          <p className="mt-1 text-sm text-muted">
            Already know a hold? The camera picks the skill automatically.
          </p>
        </div>
        <span className="text-xl text-accent">→</span>
      </Link>

      <div className="space-y-10">
        {LEARNING_PATHS.map((path) => (
          <section key={path.id}>
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-accent-hover">
                {path.name}
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-muted">
                {path.description}
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
                    <Link
                      href={`/train/${skillId}`}
                      className="group flex gap-3 card-interactive p-4 sm:gap-4 sm:p-5"
                    >
                      <div className="flex shrink-0 flex-col items-center">
                        <span
                          className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold ${
                            isFirst
                              ? "bg-accent text-accent-foreground shadow-sm"
                              : "bg-accent-soft text-accent-hover group-hover:bg-accent-muted/50"
                          }`}
                        >
                          {index + 1}
                        </span>
                        {!isLast && (
                          <span
                            className="mt-1 min-h-4 w-px flex-1 bg-border"
                            aria-hidden
                          />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-medium text-foreground">
                            {skill.name}
                          </h3>
                          {isFirst && (
                            <span className="chip">Start here</span>
                          )}
                          {isLast && path.skillIds.length > 1 && (
                            <span className="rounded-full bg-surface-muted px-2 py-0.5 text-xs font-medium text-muted">
                              Path goal
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-sm leading-relaxed text-muted">
                          {skill.cameraGuide}
                        </p>
                        <p className="mt-2 text-xs capitalize text-muted/80">
                          {skill.cameraAngle} camera
                          {skill.needsHands ? " · hands tracked" : ""}
                        </p>
                      </div>

                      <span className="shrink-0 self-center text-muted transition group-hover:text-accent">
                        →
                      </span>
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
