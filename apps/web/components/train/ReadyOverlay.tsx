"use client";

import type { CameraAngle } from "@cft/core";
import { formatMs } from "@/lib/format";

interface ReadyOverlayProps {
  title: string;
  guide: string;
  cameraAngle?: CameraAngle;
  bestMs?: number;
  ready: boolean;
  onStart: () => void;
}

const ANGLE_HINT: Record<CameraAngle, string> = {
  side: "side-on to the camera",
  front: "facing the camera",
  diagonal: "turned about 45° to the camera",
};

/** Setup card over the live preview. Nothing is timed until Start. */
export function ReadyOverlay({ title, guide, cameraAngle, bestMs, ready, onStart }: ReadyOverlayProps) {
  return (
    <div className="absolute inset-0 z-30 flex items-end justify-center bg-gradient-to-t from-black/80 via-black/30 to-transparent p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div className="w-full max-w-md rounded-2xl bg-black/70 p-5 text-white backdrop-blur-md">
        <h2 className="text-xl font-semibold">{title}</h2>
        <p className="mt-1 text-sm text-white/80">
          Prop the phone at hip height, {cameraAngle ? ANGLE_HINT[cameraAngle] : "facing you"}, with your whole body in frame. {guide}
        </p>
        <div className="mt-4 flex items-center justify-between gap-3">
          <span className="text-sm text-white/70">{bestMs ? `Best ${formatMs(bestMs)}` : ""}</span>
          <button type="button" onClick={onStart} disabled={!ready} className="min-h-11 rounded-full bg-white px-6 text-base font-semibold text-black transition active:opacity-80 disabled:opacity-50">
            {ready ? "Start" : "Loading…"}
          </button>
        </div>
      </div>
    </div>
  );
}
