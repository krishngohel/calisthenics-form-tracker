"use client";

import type { CameraAngle } from "@cft/core";
import { formatMs } from "@/lib/format";

interface ReadyOverlayProps {
  title: string;
  guide: string;
  cameraAngle?: CameraAngle;
  bestMs?: number;
  /** Camera and model are ready; the skeleton is drawing underneath. */
  ready: boolean;
  onStart: () => void;
}

const ANGLE_HINT: Record<CameraAngle, string> = {
  side: "Side on to the camera",
  front: "Face the camera",
  diagonal: "Turn about 45° to the camera",
};

/**
 * Setup card shown over the live preview before a session starts. The
 * skeleton draws behind it so the athlete can frame themselves; nothing is
 * timed until they tap Start (which is also the gesture that unlocks audio).
 */
export function ReadyOverlay({ title, guide, cameraAngle, bestMs, ready, onStart }: ReadyOverlayProps) {
  return (
    <div className="absolute inset-0 z-30 flex items-end justify-center bg-gradient-to-t from-black/85 via-black/40 to-transparent p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div className="w-full max-w-md rounded-3xl bg-black/70 p-5 text-white backdrop-blur-md">
        <div className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-300">Get set</div>
        <h2 className="mt-1 text-2xl font-extrabold leading-tight">{title}</h2>
        <ul className="mt-3 space-y-2 text-sm text-white/85">
          <li className="flex gap-2">
            <span aria-hidden>📱</span>
            <span>Prop the phone up at about hip height, {cameraAngle ? ANGLE_HINT[cameraAngle].toLowerCase() : "facing you"}.</span>
          </li>
          <li className="flex gap-2">
            <span aria-hidden>↔️</span>
            <span>Step back until your whole body is in frame. The skeleton turns green when you&rsquo;re in the hold.</span>
          </li>
          <li className="flex gap-2">
            <span aria-hidden>🎯</span>
            <span>{guide}</span>
          </li>
        </ul>
        <div className="mt-4 flex items-center justify-between gap-3">
          <span className="text-sm text-white/70">{bestMs ? `Your best: ${formatMs(bestMs)}` : "First attempt"}</span>
          <button
            type="button"
            onClick={onStart}
            disabled={!ready}
            className="min-h-12 rounded-full bg-emerald-400 px-6 text-base font-bold text-black shadow-lg transition active:scale-95 disabled:opacity-50"
          >
            {ready ? "Start" : "Loading…"}
          </button>
        </div>
      </div>
    </div>
  );
}
