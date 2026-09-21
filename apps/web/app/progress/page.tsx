"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { SKILLS, athleteLevel, evaluatePathProgress, getSkill } from "@cft/core";
import { Screen, ListGroup, ListRow } from "@/components/app/Screen";
import { useLocalHistory } from "@/hooks/useLocalHistory";
import { useAuthUser } from "@/hooks/useAuthUser";
import { formatMs, formatSec } from "@/lib/format";
import type { LocalHold } from "@/lib/localHistory";

type Range = "7d" | "30d" | "all";

export default function ProgressPage() {
  const { history, stats, loaded, bests: bestMs, reps } = useLocalHistory();
  const { user, configured } = useAuthUser();
  const [range, setRange] = useState<Range>("7d");

  const filtered = useMemo(() => {
    if (range === "all") return history;
    const days = range === "7d" ? 7 : 30;
    const cutoff = Date.now() - days * 86400000;
    return history.filter((h) => new Date(h.endedAt).getTime() >= cutoff);
  }, [history, range]);

  const holdsOnly = filtered.filter((h) => h.kind !== "reps");
  const totalMs = holdsOnly.reduce((s, h) => s + h.durationMs, 0);
  const avgForm = holdsOnly.length ? Math.round(holdsOnly.reduce((s, h) => s + h.formScore, 0) / holdsOnly.length) : 0;
  const bests = SKILLS.filter((s) => stats.bestBySkill[s.id]).sort(
    (a, b) => stats.bestBySkill[b.id].durationMs - stats.bestBySkill[a.id].durationMs
  );
  const grouped = groupByDay(filtered);
  const pathProgress = useMemo(() => evaluatePathProgress(bestMs, reps).filter((p) => p.completed > 0), [bestMs, reps]);
  const level = useMemo(() => athleteLevel(bestMs, reps), [bestMs, reps]);

  return (
    <Screen title="Progress">
      <div className="segmented mb-5" role="tablist" aria-label="Range">
        {(["7d", "30d", "all"] as Range[]).map((r) => (
          <button key={r} type="button" role="tab" aria-selected={range === r} onClick={() => setRange(r)} className={`segmented-btn ${range === r ? "segmented-btn-active" : ""}`}>
            {r === "all" ? "All time" : r === "7d" ? "7 days" : "30 days"}
          </button>
        ))}
      </div>

      {loaded && history.length === 0 ? (
        <ListGroup>
          <ListRow label="No holds yet" detail="Completed holds appear here with their time and form score." />
          <ListRow href="/skills" label="Choose a skill" />
        </ListGroup>
      ) : (
        <ListGroup>
          <ListRow label="Hold time" trailing={<Value>{formatSec(totalMs)}</Value>} />
          <ListRow label="Holds" trailing={<Value>{String(holdsOnly.length)}</Value>} />
          <ListRow label="Rep sessions" trailing={<Value>{String(filtered.length - holdsOnly.length)}</Value>} />
          <ListRow label="Average form" trailing={<Value>{holdsOnly.length ? `${avgForm}%` : "–"}</Value>} />
          <ListRow label="Level" trailing={<Value>{level.level > 0 ? `${level.level} · ${level.metCount} goal${level.metCount === 1 ? "" : "s"} met` : "–"}</Value>} />
          <ListRow label="Streak" trailing={<Value>{`${stats.streakDays} day${stats.streakDays === 1 ? "" : "s"}`}</Value>} />
        </ListGroup>
      )}

      {pathProgress.length > 0 && (
        <ListGroup title="Levels reached">
          {pathProgress.map((p) => (
            <ListRow
              key={p.path.id}
              href={p.next ? `/learn/${p.next.skillId}` : `/skills#${p.path.id}`}
              label={p.path.name}
              detail={p.next ? `Next: ${getSkill(p.next.skillId)?.name ?? p.next.skillId}` : p.blocked ? `Blocked: ${getSkill(p.blocked.skillId)?.name ?? p.blocked.skillId} needs prerequisites` : "Path complete"}
              trailing={<Value>{`Level ${p.level} · ${p.completed}/${p.path.steps.length}`}</Value>}
            />
          ))}
        </ListGroup>
      )}

      {bests.length > 0 && (
        <ListGroup title="Personal bests">
          {bests.map((skill) => {
            const b = stats.bestBySkill[skill.id];
            return (
              <ListRow
                key={skill.id}
                href={`/train/${skill.id}`}
                label={skill.name}
                detail={`${new Date(b.endedAt).toLocaleDateString()} · form ${b.formScore}%`}
                trailing={<Value mono>{formatMs(b.durationMs)}</Value>}
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
              detail={`${new Date(h.endedAt).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })} · ${h.kind === "reps" ? "Reps logged" : `${h.mode === "perfect" ? "Perfect form" : "Hold"} · form ${h.formScore}%`}`}
              trailing={<Value mono>{h.kind === "reps" ? `${h.sets}×${h.reps}` : formatMs(h.durationMs)}</Value>}
            />
          ))}
        </ListGroup>
      ))}

      {configured && (
        <p className="px-4 text-xs text-muted">
          {user ? (
            <>
              Synced to your account.{" "}
              <Link href="/dashboard" className="text-accent">
                Open cloud dashboard
              </Link>
            </>
          ) : (
            <>
              Stored on this device.{" "}
              <Link href="/login" className="text-accent">
                Sign in
              </Link>{" "}
              to back it up.
            </>
          )}
        </p>
      )}
    </Screen>
  );
}

function Value({ children, mono = false }: { children: string; mono?: boolean }) {
  return <span className={`text-base text-muted ${mono ? "font-mono tabular-nums" : ""}`}>{children}</span>;
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
