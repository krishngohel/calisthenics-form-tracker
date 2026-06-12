"use client";

import Link from "next/link";
import { SKILLS_BY_CATEGORY, type SkillCategory } from "@cft/core";

const CATEGORY_LABELS: Record<SkillCategory, string> = {
  upper: "Upper Body",
  static: "Static Holds",
  bosu: "Bosu Ball",
  legs: "Legs",
};

export default function SkillsPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="mb-2 text-2xl font-bold">Skills</h1>
      <p className="mb-6 text-muted">
        Select a skill to train with auto hold timer and form coaching.
      </p>

      <Link
        href="/train"
        className="mb-8 flex items-center justify-between rounded-xl border border-accent/40 bg-accent/10 p-5 transition hover:bg-accent/20"
      >
        <div>
          <h2 className="font-semibold text-accent">Auto-detect skill</h2>
          <p className="mt-1 text-sm text-muted">
            Start training without picking — the camera figures out which hold you are doing.
          </p>
        </div>
        <span className="text-accent">→</span>
      </Link>

      {(Object.keys(SKILLS_BY_CATEGORY) as SkillCategory[]).map((cat) => (
        <section key={cat} className="mb-10">
          <h2 className="mb-4 text-lg font-semibold text-accent">
            {CATEGORY_LABELS[cat]}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {SKILLS_BY_CATEGORY[cat].map((skill) => (
              <Link
                key={skill.id}
                href={`/train/${skill.id}`}
                className="rounded-xl border border-white/10 bg-surface p-4 transition hover:border-accent/40 hover:bg-surface/80"
              >
                <h3 className="font-medium">{skill.name}</h3>
                <p className="mt-1 text-xs text-muted capitalize">
                  {skill.cameraAngle} camera
                  {skill.needsHands ? " · hands" : ""}
                </p>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
