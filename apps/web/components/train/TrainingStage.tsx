"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { ChevronLeft } from "@/components/app/Screen";
import { Sheet } from "@/components/app/Sheet";

interface TrainingStageProps {
  back: { href: string; label: string };
  title: string;
  /** Compact mode picker shown in the top bar. */
  modeControl: ReactNode;
  /** The camera panel with HUD and overlays as children. */
  camera: ReactNode;
  /** Bottom sheet content shown over the stage (post-hold result); null hides it. */
  sheet?: ReactNode;
  /** Secondary content (chart, coaching) behind a Details button on phones; side column on desktop. */
  details: ReactNode;
  /** Extra top-bar readout (auto-detect status). */
  status?: ReactNode;
}

/**
 * Training layout. On phones the camera fills the screen and everything
 * else floats over it or lives in sheets. On desktop it is a two-column
 * page with the details beside the camera.
 */
export function TrainingStage({ back, title, modeControl, camera, sheet, details, status }: TrainingStageProps) {
  const [detailsOpen, setDetailsOpen] = useState(false);

  return (
    <div className="stage">
      <div className="stage-camera">
        {camera}

        <div className="stage-topbar">
          <Link href={back.href} className="cam-btn" aria-label={`Back to ${back.label}`}>
            <ChevronLeft />
          </Link>
          <div className="hud-panel min-w-0 flex-1 truncate py-1.5 text-center text-sm font-semibold">{title}</div>
          <button type="button" onClick={() => setDetailsOpen(true)} className="cam-btn" aria-label="Session details">
            <DotsIcon />
          </button>
        </div>
        {status && <div className="stage-status">{status}</div>}
        <div className="stage-mode">{modeControl}</div>

        {sheet && <div className="stage-sheet">{sheet}</div>}
      </div>

      <aside className="stage-side">{details}</aside>

      <Sheet open={detailsOpen} onClose={() => setDetailsOpen(false)} title="Session">
        <div className="space-y-4 pb-4">{details}</div>
      </Sheet>
    </div>
  );
}

function DotsIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden>
      <circle cx="5" cy="12" r="2" />
      <circle cx="12" cy="12" r="2" />
      <circle cx="19" cy="12" r="2" />
    </svg>
  );
}
