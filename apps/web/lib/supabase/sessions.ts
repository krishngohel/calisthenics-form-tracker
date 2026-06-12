import { createClient } from "./client";
import type { CoachingPlan } from "@cft/core";
import type { FormMetric } from "@cft/core";

export interface HoldSessionInput {
  userId: string;
  skillId: string;
  mode: "hold_only" | "perfect";
  durationMs: number;
  formScore: number;
  metrics: FormMetric[];
}

export async function saveHoldSession(input: HoldSessionInput) {
  const supabase = createClient();
  const { error } = await supabase.from("hold_sessions").insert({
    user_id: input.userId,
    skill_id: input.skillId,
    mode: input.mode,
    duration_ms: input.durationMs,
    form_score: input.formScore,
    peak_metrics: input.metrics,
    started_at: new Date().toISOString(),
  });
  if (error) console.error("saveHoldSession", error);
}

export async function saveCoachingPlan(userId: string, plan: CoachingPlan) {
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
  if (error) console.error("saveCoachingPlan", error);
}

export async function fetchUserSessions(userId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("hold_sessions")
    .select("*")
    .eq("user_id", userId)
    .order("started_at", { ascending: false });
  if (error) return [];
  return data ?? [];
}

export async function fetchDailyProgress(userId: string, skillId?: string) {
  const supabase = createClient();
  let query = supabase
    .from("skill_progress_daily")
    .select("*")
    .eq("user_id", userId)
    .order("date", { ascending: true });
  if (skillId) query = query.eq("skill_id", skillId);
  const { data, error } = await query;
  if (error) return [];
  return data ?? [];
}

export async function fetchCoachingPlans(userId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("coaching_plans")
    .select("*")
    .eq("user_id", userId);
  if (error) return [];
  return data ?? [];
}
