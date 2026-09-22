"use client";

interface CameraStatusBannerProps {
  ready: boolean;
  error: string | null;
  videoReady: boolean;
  /** Show the "keep full body in frame" warning. */
  visibilityWarning?: boolean;
  /** Neutral hint shown when nothing else is (e.g. auto-detect scanning). */
  hint?: string | null;
  /** Full-screen stage: sit below the top bar and HUD. */
  stage?: boolean;
}

const BASE = "absolute inset-x-0 z-10 mx-auto w-fit max-w-[calc(100%-2rem)] rounded-xl px-4 py-2 text-center text-sm font-medium";
const TOP = "top-[calc(max(0.75rem,env(safe-area-inset-top))+7.5rem)]";
const TOP_STAGE = "top-[calc(max(0.75rem,env(safe-area-inset-top))+10.5rem)] !max-w-[calc(100%-7.5rem)]";

/** One slot above the camera for loading / error / framing messages. */
export function CameraStatusBanner({
  ready,
  error,
  videoReady,
  visibilityWarning = false,
  hint,
  stage = false,
}: CameraStatusBannerProps) {
  const pos = stage ? TOP_STAGE : TOP;
  if (error) {
    return (
      <div className={`${BASE} ${pos} bg-danger/90 text-white`} role="alert">
        Detection error: {error}
      </div>
    );
  }
  if (videoReady && !ready) {
    return (
      <div className={`${BASE} ${pos} hud-panel`}>Loading pose model…</div>
    );
  }
  if (ready && visibilityWarning) {
    return (
      <div className={`${BASE} ${pos} bg-danger/90 text-white`} role="status">
        Move back — keep your full body in frame
      </div>
    );
  }
  if (ready && hint) {
    return (
      <div className={`${BASE} ${pos} hud-panel`}>{hint}</div>
    );
  }
  return null;
}
