"use client";

import { PROGRESSION_GUIDE, getSkill, workingHoldSec } from "@cft/core";
import { Screen, ListGroup } from "@/components/app/Screen";
import { useLocalHistory } from "@/hooks/useLocalHistory";
import { formatSec } from "@/lib/format";

const g = PROGRESSION_GUIDE;

function Para({ children }: { children: React.ReactNode }) {
  return <p className="px-4 py-3 text-sm leading-relaxed text-foreground">{children}</p>;
}

/** Plain-language summary of how the paths are meant to be trained. */
export default function ProgressionGuidePage() {
  const { stats } = useLocalHistory();
  const recent = Object.values(stats.bestBySkill)
    .sort((a, b) => b.endedAt.localeCompare(a.endedAt))
    .slice(0, 3);

  return (
    <Screen title="Progression" back={{ href: "/skills", label: "Paths" }}>
      <ListGroup title="Families and ladders">
        <Para>
          Skills are grouped into five movement families: Push, Pull, Handstand, Core and Legs. Each family holds a few ladders, so
          pike push-ups, handstand push-ups and the planche all live under Push, while the levers and iron cross sit under Pull.
          Train something from Push and Pull most sessions, and add Handstand, Core and Legs work around them.
        </Para>
      </ListGroup>
      <ListGroup title="Levels">
        <Para>
          Every step has a level from 1 to 16, taken from the Overcoming Gravity charts. Levels 1–4 are beginner, 5–8 intermediate,
          9–12 advanced and 13–16 elite. Steps at the same level across different paths are about equally hard, so a straddle press
          (level 7) sits alongside archer pull-ups and the back lever.
        </Para>
      </ListGroup>
      <ListGroup title="Working holds">
        <Para>
          Test a max hold, then train at {Math.round(g.workingHoldFraction[0] * 100)}–{Math.round(g.workingHoldFraction[1] * 100)}% of it for
          {" "}{g.setsPerSession[0]}–{g.setsPerSession[1]} sets, {g.totalHoldSecPerSession[0]}–{g.totalHoldSecPerSession[1]} s of total hold per session.
          Stop each set while the form is still clean. If the position breaks, the set is over.
        </Para>
        {recent.length > 0 && (
          <div className="px-4 pb-3 text-xs text-muted">
            {recent.map((h) => (
              <div key={h.skillId}>
                {getSkill(h.skillId)?.name ?? h.skillId}: best {formatSec(h.durationMs)}, work {workingHoldSec(h.durationMs / 1000).map((s) => `${s} s`).join("–")}
              </div>
            ))}
          </div>
        )}
      </ListGroup>
      <ListGroup title="Moving up">
        <Para>
          Train each static {g.sessionsPerWeek[0]}–{g.sessionsPerWeek[1]} times a week. Move to the next step once you meet its goal with clean
          form on a fresh day, not just once. Steps with a rep goal are logged outside the app; the app tracks holds.
        </Para>
      </ListGroup>
      <ListGroup title="Handstand and presses">
        <Para>
          Balance work is skill practice: {g.handstandTarget.sets}×{g.handstandTarget.holdSec} s wall or free handstands, most days, never to
          failure. Presses need three things at once: straight-arm strength from planche leans, compression from the L-sit and V-sit family, and
          the handstand itself. Each press step lists those as prerequisites.
        </Para>
      </ListGroup>
      <ListGroup title="Prerequisites">
        <Para>
          A step that says “Needs …” expects you to reach those goals first. Nothing is locked; the label is there so you do not stall on a
          skill whose building blocks are missing.
        </Para>
      </ListGroup>
      <p className="px-4 text-xs text-muted">Sources: {g.sources.join("; ")}.</p>
    </Screen>
  );
}
