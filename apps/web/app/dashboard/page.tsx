import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SKILLS, getSkill } from "@cft/core";
import { SkillProgressChart } from "@/components/dashboard/SkillProgressChart";
import { CoachingPanel } from "@/components/coaching/CoachingPanel";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [sessionsRes, progressRes, plansRes] = await Promise.all([
    supabase
      .from("hold_sessions")
      .select("*")
      .eq("user_id", user.id)
      .order("started_at", { ascending: false })
      .limit(50),
    supabase
      .from("skill_progress_daily")
      .select("*")
      .eq("user_id", user.id)
      .order("date", { ascending: true }),
    supabase
      .from("coaching_plans")
      .select("*")
      .eq("user_id", user.id),
  ]);

  const sessions = sessionsRes.data ?? [];
  const progress = progressRes.data ?? [];
  const plans = plansRes.data ?? [];

  const bestBySkill: Record<string, number> = {};
  const latestBySkill: Record<string, string> = {};
  for (const s of sessions) {
    bestBySkill[s.skill_id] = Math.max(bestBySkill[s.skill_id] ?? 0, s.duration_ms);
    if (!latestBySkill[s.skill_id]) latestBySkill[s.skill_id] = s.started_at;
  }

  const recentSkill = sessions[0]?.skill_id ?? "handstand";
  const chartData = progress
    .filter((p) => p.skill_id === recentSkill)
    .map((p) => ({
      date: p.date,
      bestHoldMs: p.best_hold_ms,
      avgFormScore: Number(p.avg_form_score),
      sessionCount: p.session_count,
    }));

  const activePlan = plans.find((p) => p.skill_id === recentSkill);
  const trainedSkills = Object.keys(bestBySkill).length;
  const bestAnySkillMs = Math.max(0, ...Object.values(bestBySkill));
  const sessionsThisWeek = sessions.filter((s) => {
    const ts = new Date(s.started_at).getTime();
    return Date.now() - ts <= 7 * 24 * 60 * 60 * 1000;
  }).length;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted">Welcome back — track your skill progress</p>
        </div>
        <Link
          href="/skills"
          className="inline-flex min-h-11 items-center rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-bg"
        >
          Train
        </Link>
      </div>

      <section className="mb-8 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-white/10 bg-surface p-4">
          <p className="text-xs uppercase tracking-wide text-muted">Trained skills</p>
          <p className="mt-1 text-2xl font-semibold">{trainedSkills}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-surface p-4">
          <p className="text-xs uppercase tracking-wide text-muted">Best hold</p>
          <p className="mt-1 text-2xl font-semibold">
            {bestAnySkillMs ? `${(bestAnySkillMs / 1000).toFixed(1)}s` : "—"}
          </p>
        </div>
        <div className="rounded-xl border border-white/10 bg-surface p-4">
          <p className="text-xs uppercase tracking-wide text-muted">Sessions (7d)</p>
          <p className="mt-1 text-2xl font-semibold">{sessionsThisWeek}</p>
        </div>
      </section>

      <div className="mb-10">
        <SkillProgressChart
          data={chartData}
          skillName={getSkill(recentSkill)?.name ?? recentSkill}
        />
      </div>

      <section className="mb-10">
        <h2 className="mb-4 text-lg font-semibold">All skills</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {SKILLS.map((skill) => {
            const best = bestBySkill[skill.id];
            const lastSession = latestBySkill[skill.id];
            return (
              <Link
                key={skill.id}
                href={`/train/${skill.id}`}
                className="rounded-xl border border-white/10 bg-surface p-4 hover:border-accent/40"
              >
                <h3 className="font-medium">{skill.name}</h3>
                <p className="mt-1 text-sm text-muted">
                  Best: {best ? `${(best / 1000).toFixed(1)}s` : "—"}
                </p>
                {lastSession && (
                  <p className="text-xs text-muted">
                    Last: {new Date(lastSession).toLocaleDateString()}
                  </p>
                )}
              </Link>
            );
          })}
        </div>
      </section>

      {activePlan && (
        <section>
          <h2 className="mb-4 text-lg font-semibold">Active coaching plan</h2>
          <CoachingPanel
            weakPoints={activePlan.weak_points as string[]}
            drills={activePlan.recommended_drills as import("@cft/core").ProgressionDrill[]}
          />
        </section>
      )}
    </div>
  );
}
