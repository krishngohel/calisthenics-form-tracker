"use client";

import type { ReactNode, RefObject } from "react";
import { CameraFeed, type CameraFacingMode } from "./CameraFeed";

interface TrainCameraPanelProps {
  videoRef: RefObject<HTMLVideoElement>;
  onVideoReady: () => void;
  facingMode: CameraFacingMode;
  onFacingModeChange: (mode: CameraFacingMode) => void;
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
  facingMode,
  onFacingModeChange,
  children,
  footer,
}: TrainCameraPanelProps) {
  return (
    <div>
      <div className="relative aspect-[3/4] max-h-[70vh] overflow-hidden rounded-xl bg-black sm:aspect-video sm:max-h-none">
        <CameraFeed
          ref={videoRef}
          facingMode={facingMode}
          onFacingModeChange={onFacingModeChange}
          showFlipButton
          onVideoReady={onVideoReady}
        />
        {children}
      </div>
      {footer && <div className="mt-2 text-xs text-muted">{footer}</div>}
    </div>
  );
}
