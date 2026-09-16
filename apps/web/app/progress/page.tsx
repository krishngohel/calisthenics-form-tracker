"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { SKILLS, getSkill } from "@cft/core";
import { Screen, ListGroup, ListRow } from "@/components/app/Screen";
import { useLocalHistory } from "@/hooks/useLocalHistory";
import { useAuthUser } from "@/hooks/useAuthUser";
import { formatMs, formatSec } from "@/lib/format";
import type { LocalHold } from "@/lib/localHistory";

type Range = "7d" | "30d" | "all";

export default function ProgressPage() {
  const { history, stats, loaded } = useLocalHistory();
  const { user, configured } = useAuthUser();
  const [range, setRange] = useState<Range>("7d");

  const filtered = useMemo(() => {
    if (range === "all") return history;
    const days = range === "7d" ? 7 : 30;
    const cutoff = Date.now() - days * 86400000;
    return history.filter((h) => new Date(h.endedAt).getTime() >= cutoff);
  }, [history, range]);

  const totalMs = filtered.reduce((s, h) => s + h.durationMs, 0);
  const avgForm = filtered.length ? Math.round(filtered.reduce((s, h) => s + h.formScore, 0) / filtered.length) : 0;
  const trainedSkills = Object.keys(stats.bestBySkill).length;
  const bests = SKILLS.filter((s) => stats.bestBySkill[s.id]).sort(
    (a, b) => stats.bestBySkill[b.id].durationMs - stats.bestBySkill[a.id].durationMs
  );
  const grouped = groupByDay(filtered);

  return (
    <Screen
      title="Progress"
      subtitle={configured ? (user ? "Synced to your account" : "Stored on this device") : "Stored on this device"}
    >
      <div className="segmented mb-5" role="tablist" aria-label="Range">
        {(["7d", "30d", "all"] as Range[]).map((r) => (
          <button key={r} type="button" role="tab" aria-selected={range === r} onClick={() => setRange(r)} className={`segmented-btn ${range === r ? "segmented-btn-active" : ""}`}>
            {r === "all" ? "All time" : r === "7d" ? "7 days" : "30 days"}
          </button>
        ))}
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3">
        <Tile label="Hold time" value={formatSec(totalMs)} />
        <Tile label="Holds" value={String(filtered.length)} />
        <Tile label="Avg form" value={filtered.length ? `${avgForm}%` : "–"} />
        <Tile label="Streak" value={`${stats.streakDays} day${stats.streakDays === 1 ? "" : "s"}`} />
      </div>

      {loaded && history.length === 0 && (
        <div className="stat-tile mb-6 text-center">
          <div className="text-3xl">🏁</div>
          <div className="mt-2 font-bold text-foreground">No holds yet</div>
          <p className="mt-1 text-sm text-muted">Your first completed hold shows up here with its time and form score.</p>
          <Link href="/skills" className="btn-primary mt-4 w-full text-sm">
            Pick a skill
          </Link>
        </div>
      )}

      {bests.length > 0 && (
        <ListGroup title={`Personal bests · ${trainedSkills} skill${trainedSkills === 1 ? "" : "s"}`}>
          {bests.map((skill) => {
            const b = stats.bestBySkill[skill.id];
            return (
              <ListRow
                key={skill.id}
                href={`/train/${skill.id}`}
                label={skill.name}
                detail={`${new Date(b.endedAt).toLocaleDateString()} · form ${b.formScore}%`}
                trailing={<span className="font-mono text-base font-bold text-accent">{formatMs(b.durationMs)}</span>}
              />
            );
          })}
        </ListGroup>
      )}

      {grouped.map(([day, holds]) => (
        <ListGroup key={day} title={day}>
          {holds.map((h) => (
            <ListRow
              key={h.id}
              label={getSkill(h.skillId)?.name ?? h.skillId}
              detail={`${new Date(h.endedAt).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })} · ${h.mode === "perfect" ? "Perfect form" : "Hold only"} · form ${h.formScore}%`}
              trailing={<span className="font-mono text-base font-semibold text-foreground">{formatMs(h.durationMs)}</span>}
            />
          ))}
        </ListGroup>
      ))}

      {configured && !user && history.length > 0 && (
        <p className="px-1 text-center text-sm text-muted">
          <Link href="/login" className="font-medium text-accent">
            Sign in
          </Link>{" "}
          to back up your history and see it on other devices.
        </p>
      )}
    </Screen>
  );
}

function groupByDay(holds: LocalHold[]): [string, LocalHold[]][] {
  const map = new Map<string, LocalHold[]>();
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();
  for (const h of holds) {
    const d = new Date(h.endedAt);
    const ds = d.toDateString();
    const label = ds === today ? "Today" : ds === yesterday ? "Yesterday" : d.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
    const list = map.get(label) ?? [];
    list.push(h);
    map.set(label, list);
  }
  return Array.from(map.entries());
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat-tile">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">{label}</div>
      <div className="mt-1 text-2xl font-extrabold text-foreground">{value}</div>
    </div>
  );
}
