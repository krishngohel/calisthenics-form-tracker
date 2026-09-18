"use client";

import type { PersistedCue } from "@/hooks/usePersistentCues";

const MAX_VISIBLE = 2;

interface PersistentCueOverlayProps {
  cues: PersistedCue[];
  onDismiss: (id: string) => void;
  onDismissAll?: () => void;
  /** Full-screen stage: leave room for the mode pill at the bottom. */
  stage?: boolean;
}

/**
 * Large, high-contrast cues overlaid on the camera feed.
 * Each cue stays until the athlete taps dismiss.
 */
export function PersistentCueOverlay({
  cues,
  onDismiss,
  onDismissAll,
  stage = false,
}: PersistentCueOverlayProps) {
  if (cues.length === 0) return null;
  // Show the newest few over the video; the full list lives in the coaching panel.
  const visibleCues = cues.slice(-MAX_VISIBLE);
  const hidden = cues.length - visibleCues.length;

  return (
    <div
      className={`pointer-events-none absolute inset-x-0 bottom-0 z-20 flex flex-col gap-2 p-3 sm:p-4 ${
        stage ? "pb-[calc(max(1rem,env(safe-area-inset-bottom))+3rem)]" : "pb-[max(0.75rem,env(safe-area-inset-bottom))]"
      }`}
    >
      {cues.length > 1 && onDismissAll && (
        <button
          type="button"
          onClick={onDismissAll}
          className="pointer-events-auto ml-auto rounded-lg bg-black/70 px-3 py-1.5 text-xs font-medium text-white/90 backdrop-blur-sm hover:bg-black/85"
        >
          Dismiss all
        </button>
      )}
      {hidden > 0 && <p className="text-right text-xs font-medium text-white/80">+{hidden} more below</p>}
      {visibleCues.map((cue) => (
        <div
          key={cue.id}
          className="pointer-events-auto flex items-start gap-3 rounded-2xl border border-emerald-300/50 bg-black/85 p-4 shadow-lg backdrop-blur-md sm:p-5"
        >
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-widest text-emerald-300">
              Form cue
            </p>
            <p className="mt-1 text-lg font-semibold leading-snug text-white sm:text-xl">
              {cue.text}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onDismiss(cue.id)}
            className="shrink-0 rounded-xl bg-emerald-400 px-4 py-3 text-sm font-bold text-black shadow-sm hover:bg-emerald-300"
            aria-label={`Dismiss cue: ${cue.text}`}
          >
            Got it
          </button>
        </div>
      ))}
    </div>
  );
}
