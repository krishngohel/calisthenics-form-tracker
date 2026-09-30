"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { SKILLS, getSkill, type ProgressionDrill } from "@cft/core";
import { SkillProgressChart } from "@/components/dashboard/SkillProgressChart";
import { CoachingPanel } from "@/components/coaching/CoachingPanel";
import { useAuthUser } from "@/hooks/useAuthUser";
import { Screen } from "@/components/app/Screen";
import { createClient } from "@/lib/supabase/client";
import { formatSec } from "@/lib/format";

interface SessionRow {
  skill_id: string;
  duration_ms: number;
  form_score: number;
  started_at: string;
}
interface ProgressRow {
  skill_id: string;
  date: string;
  best_hold_ms: number;
  avg_form_score: number | string;
  session_count: number;
}
interface PlanRow {
  skill_id: string;
  weak_points: string[];
  recommended_drills: ProgressionDrill[];
}

export default function DashboardPage() {
  const { user, loading, configured } = useAuthUser();
  const [sessions, setSessions] = useState<SessionRow[] | null>(null);
  const [progress, setProgress] = useState<ProgressRow[]>([]);
  const [plans, setPlans] = useState<PlanRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const supabase = createClient();
    Promise.all([
      supabase
        .from("hold_sessions")
        .select("skill_id,duration_ms,form_score,started_at")
        .eq("user_id", user.id)
        .order("started_at", { ascending: false })
        .limit(100),
      supabase
        .from("skill_progress_daily")
        .select("skill_id,date,best_hold_ms,avg_form_score,session_count")
        .eq("user_id", user.id)
        .order("date", { ascending: true }),
      supabase
        .from("coaching_plans")
        .select("skill_id,weak_points,recommended_drills")
        .eq("user_id", user.id),
    ])
      .then(([s, p, c]) => {
        if (cancelled) return;
        const firstError = s.error ?? p.error ?? c.error;
        if (firstError) setError(firstError.message);
        setSessions((s.data as SessionRow[]) ?? []);
        setProgress((p.data as ProgressRow[]) ?? []);
        setPlans((c.data as PlanRow[]) ?? []);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Could not load dashboard");
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (!configured) {
    return (
      <Empty title="Cloud sync is not configured">
        Add Supabase credentials to save sessions and see history here. Training works without it.
      </Empty>
    );
  }
  if (loading) return <Empty title="Loading…">Checking your account.</Empty>;
  if (!user) {
    return (
      <Empty title="Sign in to see your progress" cta={{ href: "/login?next=/dashboard", label: "Sign in" }}>
        Saved holds, best times, and coaching plans live here.
      </Empty>
    );
  }
  if (!sessions) return <Empty title="Loading…">Fetching your sessions.</Empty>;

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
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const sessionsThisWeek = sessions.filter((s) => new Date(s.started_at).getTime() >= weekAgo).length;

  return (
    <Screen
      title="Cloud dashboard"
      subtitle="Synced history across your devices"
      back={{ href: "/progress", label: "Progress" }}
      action={
        <Link href="/skills" className="btn-primary text-sm">
          Train
        </Link>
      }
      className="max-w-6xl"
    >

      {error && (
        <p role="alert" className="mb-6 rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger">
          {error}
        </p>
      )}

      <section className="mb-8 grid grid-cols-3 gap-3">
        <Stat label="Skills trained" value={String(trainedSkills)} />
        <Stat label="Best hold" value={bestAnySkillMs ? formatSec(bestAnySkillMs) : "—"} />
        <Stat label="Holds (7d)" value={String(sessionsThisWeek)} />
      </section>

      <div className="mb-10">
        <SkillProgressChart data={chartData} skillName={getSkill(recentSkill)?.name ?? recentSkill} />
      </div>

      <section className="mb-10">
        <h2 className="section-title">All skills</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {SKILLS.map((skill) => {
            const best = bestBySkill[skill.id];
            const lastSession = latestBySkill[skill.id];
            return (
              <Link key={skill.id} href={`/train/${skill.id}`} className="card-interactive p-4">
                <h3 className="font-semibold">{skill.name}</h3>
                <p className="mt-1 text-sm text-muted">Best: {best ? formatSec(best) : "—"}</p>
                {lastSession && (
                  <p className="text-xs text-muted">Last: {new Date(lastSession).toLocaleDateString()}</p>
                )}
              </Link>
            );
          })}
        </div>
      </section>

      {activePlan && (
        <section>
          <h2 className="section-title">Active coaching plan · {getSkill(recentSkill)?.name}</h2>
          <CoachingPanel weakPoints={activePlan.weak_points} drills={activePlan.recommended_drills} />
        </section>
      )}
    </Screen>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-4 sm:p-5">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 text-xl font-bold text-accent-hover sm:text-2xl">{value}</p>
    </div>
  );
}

function Empty({
  title,
  children,
  cta,
}: {
  title: string;
  children: React.ReactNode;
  cta?: { href: string; label: string };
}) {
  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center">
      <div className="card p-8">
        <h1 className="mb-2 text-xl font-bold text-foreground">{title}</h1>
        <p className="mb-6 text-sm text-muted">{children}</p>
        {cta && (
          <Link href={cta.href} className="btn-primary text-sm">
            {cta.label}
          </Link>
        )}
      </div>
    </div>
  );
}
