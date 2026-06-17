"use client";

import type { PersistedCue } from "@/hooks/usePersistentCues";

interface PersistentCueOverlayProps {
  cues: PersistedCue[];
  onDismiss: (id: string) => void;
  onDismissAll?: () => void;
}

/**
 * Large, high-contrast cues overlaid on the camera feed.
 * Each cue stays until the athlete taps dismiss.
 */
export function PersistentCueOverlay({
  cues,
  onDismiss,
  onDismissAll,
}: PersistentCueOverlayProps) {
  if (cues.length === 0) return null;

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex flex-col gap-2 p-3 sm:p-4">
      {cues.length > 1 && onDismissAll && (
        <button
          type="button"
          onClick={onDismissAll}
          className="pointer-events-auto ml-auto rounded-lg bg-black/70 px-3 py-1.5 text-xs font-medium text-white/90 backdrop-blur-sm hover:bg-black/85"
        >
          Dismiss all
        </button>
      )}
      {cues.map((cue) => (
        <div
          key={cue.id}
          className="pointer-events-auto flex items-start gap-3 rounded-xl border border-accent/50 bg-black/85 p-4 shadow-lg backdrop-blur-md sm:p-5"
        >
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-widest text-accent">
              Form cue
            </p>
            <p className="mt-1 text-lg font-semibold leading-snug text-white sm:text-xl">
              {cue.text}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onDismiss(cue.id)}
            className="shrink-0 rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-accent-foreground shadow-sm hover:bg-accent-hover"
            aria-label={`Dismiss cue: ${cue.text}`}
          >
            Got it
          </button>
        </div>
      ))}
    </div>
  );
}
