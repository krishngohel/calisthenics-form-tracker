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
  const bests = SKILLS.filter((s) => stats.bestBySkill[s.id]).sort(
    (a, b) => stats.bestBySkill[b.id].durationMs - stats.bestBySkill[a.id].durationMs
  );
  const grouped = groupByDay(filtered);

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
          <ListRow label="Holds" trailing={<Value>{String(filtered.length)}</Value>} />
          <ListRow label="Average form" trailing={<Value>{filtered.length ? `${avgForm}%` : "–"}</Value>} />
          <ListRow label="Streak" trailing={<Value>{`${stats.streakDays} day${stats.streakDays === 1 ? "" : "s"}`}</Value>} />
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
              detail={`${new Date(h.endedAt).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })} · ${h.mode === "perfect" ? "Perfect form" : "Hold"} · form ${h.formScore}%`}
              trailing={<Value mono>{formatMs(h.durationMs)}</Value>}
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
