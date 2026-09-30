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
          className="pointer-events-auto ml-auto rounded-full bg-black/70 px-3 py-1.5 text-xs text-white/90 backdrop-blur-sm"
        >
          Dismiss all
        </button>
      )}
      {hidden > 0 && <p className="text-right text-xs text-white/70">+{hidden} more</p>}
      {visibleCues.map((cue) => (
        <div
          key={cue.id}
          className="pointer-events-auto flex items-center gap-3 rounded-2xl bg-black/80 px-4 py-3 backdrop-blur-md"
        >
          <div className="min-w-0 flex-1">
            <p className="text-base font-medium leading-snug text-white">{cue.text}</p>
          </div>
          <button
            type="button"
            onClick={() => onDismiss(cue.id)}
            className="shrink-0 rounded-full bg-white/15 px-3 py-1.5 text-sm font-medium text-white"
            aria-label={`Dismiss cue: ${cue.text}`}
          >
            Got it
          </button>
        </div>
      ))}
    </div>
  );
}
