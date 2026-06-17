"use client";

import type { ReactNode, RefObject } from "react";
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
  children?: ReactNode;
  footer?: ReactNode;
}

/**
 * Mobile-first camera container: taller aspect on phones for full-body framing,
 * with a flip control and overlay slot.
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
  children,
  footer,
}: TrainCameraPanelProps) {
  const showFraming =
    facingMode === "environment" && (framingLabel || isManualFraming);

  return (
    <div>
      <div className="relative aspect-[3/4] max-h-[70vh] overflow-hidden rounded-2xl border border-border bg-black shadow-card sm:aspect-video sm:max-h-none">
        <CameraFeed
          ref={videoRef}
          facingMode={facingMode}
          deviceId={facingMode === "environment" ? deviceId : undefined}
          onFacingModeChange={onFacingModeChange}
          onStreamReady={onStreamReady}
          showFlipButton
          onVideoReady={onVideoReady}
        />
        {children}
        {framingGuidance && facingMode === "environment" && !isManualFraming && (
          <div className="absolute inset-x-3 top-14 z-20 rounded-lg bg-black/75 px-4 py-3 text-center text-sm text-white backdrop-blur-sm">
            {framingGuidance}
          </div>
        )}
      </div>
      {(footer || showFraming) && (
        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
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
