import { createClient } from "./client";
import type { CoachingPlan, FormMetric, HoldMode } from "@cft/core";

export interface HoldSessionInput {
  userId: string;
  skillId: string;
  mode: HoldMode;
  durationMs: number;
  formScore: number;
  metrics: FormMetric[];
  /** Wall-clock time the hold ended; defaults to now. */
  endedAt?: Date;
}

export async function saveHoldSession(input: HoldSessionInput): Promise<void> {
  const supabase = createClient();
  const endedAt = input.endedAt ?? new Date();
  const startedAt = new Date(endedAt.getTime() - input.durationMs);
  const { error } = await supabase.from("hold_sessions").insert({
    user_id: input.userId,
    skill_id: input.skillId,
    mode: input.mode,
    duration_ms: Math.round(input.durationMs),
    form_score: Math.round(input.formScore),
    peak_metrics: input.metrics,
    started_at: startedAt.toISOString(),
  });
  if (error) throw new Error(`saveHoldSession: ${error.message}`);
}

export async function saveCoachingPlan(userId: string, plan: CoachingPlan): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("coaching_plans").upsert(
    {
      user_id: userId,
      skill_id: plan.skillId,
      weak_points: plan.weakPoints,
      recommended_drills: plan.recommendedDrills,
      updated_at: plan.updatedAt,
    },
    { onConflict: "user_id,skill_id" }
  );
  if (error) throw new Error(`saveCoachingPlan: ${error.message}`);
}
