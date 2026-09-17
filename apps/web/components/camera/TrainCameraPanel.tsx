"use client";

import { useState, type ReactNode, type RefObject } from "react";
import type { CameraFacingMode } from "@cft/core";
import { CameraFeed } from "./CameraFeed";

interface TrainCameraPanelProps {
  videoRef: RefObject<HTMLVideoElement>;
  onVideoReady: () => void;
  onStreamReady?: (stream: MediaStream) => void;
  facingMode: CameraFacingMode;
  deviceId?: string;
  onFacingModeChange: (mode: CameraFacingMode) => void;
  framingLabel?: string | null;
  framingGuidance?: string | null;
  isManualFraming?: boolean;
  onEnableAutoFraming?: () => void;
  /** Full-screen training view (desktop; phones are always full-screen). */
  focus?: boolean;
  onToggleFocus?: () => void;
  /** Fill the parent stage instead of rendering as a card. */
  stage?: boolean;
  voiceEnabled?: boolean;
  voiceSupported?: boolean;
  onToggleVoice?: () => void;
  children?: ReactNode;
  footer?: ReactNode;
}

/**
 * Camera container with the HUD slot. Normal mode is a card; focus mode pins
 * the camera full-screen above everything so the phone becomes a mirror with
 * a timer on it.
 */
export function TrainCameraPanel({
  videoRef,
  onVideoReady,
  onStreamReady,
  facingMode,
  deviceId,
  onFacingModeChange,
  framingLabel,
  framingGuidance,
  isManualFraming = false,
  onEnableAutoFraming,
  focus = false,
  onToggleFocus,
  voiceEnabled = false,
  voiceSupported = false,
  onToggleVoice,
  stage = false,
  children,
  footer,
}: TrainCameraPanelProps) {
  const [cameraError, setCameraError] = useState<string | null>(null);
  const showFraming =
    facingMode === "environment" && (framingLabel || isManualFraming);

  const frameClass = focus
    ? "fixed inset-0 z-[60] bg-black"
    : stage
      ? "relative h-full w-full bg-black max-lg:absolute max-lg:inset-0 lg:aspect-video"
      : "relative -mx-4 aspect-[3/4] max-h-[72vh] overflow-hidden bg-black shadow-card sm:mx-0 sm:aspect-video sm:max-h-none sm:rounded-2xl sm:border sm:border-border";

  return (
    <div>
      <div className={frameClass}>
        <CameraFeed
          ref={videoRef}
          facingMode={facingMode}
          deviceId={facingMode === "environment" ? deviceId : undefined}
          onFacingModeChange={onFacingModeChange}
          onStreamReady={onStreamReady}
          showFlipButton
          flipButtonClassName={
            stage
              ? "absolute right-3 z-30 top-[calc(max(0.75rem,env(safe-area-inset-top))+10.25rem)] cam-btn"
              : "absolute right-3 z-30 top-[max(0.75rem,env(safe-area-inset-top))] cam-btn"
          }
          onVideoReady={onVideoReady}
          onError={setCameraError}
        />
        {!cameraError && children}

        {!cameraError && (
          <div
          className={`absolute right-3 z-30 flex flex-col gap-2 ${
            stage
              ? "top-[calc(max(0.75rem,env(safe-area-inset-top))+13.5rem)]"
              : "top-[calc(max(0.75rem,env(safe-area-inset-top))+3.25rem)]"
          }`}
        >
            {onToggleVoice && voiceSupported && (
              <button
                type="button"
                onClick={onToggleVoice}
                aria-pressed={voiceEnabled}
                aria-label={
                  voiceEnabled ? "Turn voice coach off" : "Turn voice coach on"
                }
                className="cam-btn"
              >
                <SpeakerIcon muted={!voiceEnabled} />
              </button>
            )}
            {onToggleFocus && !stage && (
              <button
                type="button"
                onClick={onToggleFocus}
                aria-pressed={focus}
                aria-label={focus ? "Exit full screen" : "Full screen training"}
                className="cam-btn"
              >
                <ExpandIcon collapse={focus} />
              </button>
            )}
          </div>
        )}

        {!cameraError &&
          framingGuidance &&
          facingMode === "environment" &&
          !isManualFraming && (
            <div className="absolute inset-x-3 z-20 rounded-xl px-4 py-3 text-center text-base font-semibold text-white hud-panel bottom-[max(1rem,env(safe-area-inset-bottom))] sm:bottom-auto sm:top-32">
              {framingGuidance}
            </div>
          )}
      </div>

      {!focus && !stage && (footer || showFraming) && (
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
          {footer && <span>{footer}</span>}
          {showFraming && framingLabel && !isManualFraming && (
            <span>{framingLabel}</span>
          )}
          {showFraming && isManualFraming && <span>Manual framing</span>}
          {showFraming && isManualFraming && onEnableAutoFraming && (
            <button
              type="button"
              onClick={onEnableAutoFraming}
              className="text-accent hover:underline"
            >
              Re-enable auto
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function SpeakerIcon({ muted }: { muted: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
      aria-hidden
    >
      <path d="M11 5 6 9H2v6h4l5 4V5z" />
      {muted ? (
        <path d="m23 9-6 6M17 9l6 6" />
      ) : (
        <>
          <path d="M15.5 8.5a5 5 0 0 1 0 7" />
          <path d="M19 5a9 9 0 0 1 0 14" />
        </>
      )}
    </svg>
  );
}

function ExpandIcon({ collapse }: { collapse: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
      aria-hidden
    >
      {collapse ? (
        <>
          <path d="M8 3v5H3M16 3v5h5M8 21v-5H3M16 21v-5h5" />
        </>
      ) : (
        <>
          <path d="M3 8V3h5M21 8V3h-5M3 16v5h5M21 16v5h-5" />
        </>
      )}
    </svg>
  );
}
