import type { FormMetric } from "../skills/registry";
import { METRIC_TO_DRILL, PROGRESSIONS, type ProgressionDrill } from "./progressions";

export interface CoachingPlan {
  skillId: string;
  weakPoints: string[];
  recommendedDrills: ProgressionDrill[];
  updatedAt: string;
}

export function generateCoachingPlan(
  skillId: string,
  metrics: FormMetric[],
  previousPlan?: CoachingPlan
): CoachingPlan {
  const allDrills = PROGRESSIONS[skillId] ?? [];
  const failed = metrics.filter((m) => !m.passed).sort((a, b) => a.score - b.score);

  const weakPoints = failed.map((m) => m.label);
  const drillIds = new Set<string>();

  for (const metric of failed.slice(0, 3)) {
    const mapped = METRIC_TO_DRILL[metric.id];
    if (mapped) drillIds.add(mapped);
  }

  if (drillIds.size === 0 && allDrills.length > 0) {
    drillIds.add(allDrills[0].id);
  }

  let recommended = allDrills.filter((d) => drillIds.has(d.id));
  if (recommended.length < 3) {
    for (const d of allDrills) {
      if (recommended.length >= 5) break;
      if (!recommended.find((r) => r.id === d.id)) recommended.push(d);
    }
  }

  if (recommended.length === 0 && previousPlan) {
    recommended = previousPlan.recommendedDrills;
  }

  return {
    skillId,
    weakPoints,
    recommendedDrills: recommended.slice(0, 5),
    updatedAt: new Date().toISOString(),
  };
}
