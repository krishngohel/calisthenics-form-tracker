"use client";

import { forwardRef, useEffect, useRef, useState } from "react";
import type { CameraFacingMode } from "@cft/core";
import { openCameraStream } from "@/lib/camera/openCameraStream";
import { cameraUnavailableReason, iosBrowserName, isIOS } from "@/lib/camera/platform";

export type { CameraFacingMode };

interface CameraFeedProps {
  onVideoReady?: (video: HTMLVideoElement) => void;
  onStreamReady?: (stream: MediaStream) => void;
  className?: string;
  facingMode?: CameraFacingMode;
  deviceId?: string;
  onFacingModeChange?: (mode: CameraFacingMode) => void;
  showFlipButton?: boolean;
  flipButtonClassName?: string;
}

export const CameraFeed = forwardRef<HTMLVideoElement, CameraFeedProps>(
  function CameraFeed(
    {
      onVideoReady,
      onStreamReady,
      className,
      facingMode: facingModeProp,
      deviceId,
      onFacingModeChange,
      showFlipButton = false,
      flipButtonClassName = "absolute right-3 top-3 z-30 cam-btn",
    },
    ref
  ) {
    const [error, setError] = useState<string | null>(null);
    const [internalFacingMode, setInternalFacingMode] =
      useState<CameraFacingMode>("environment");

    const facingMode = facingModeProp ?? internalFacingMode;
    const mirrored = facingMode === "user";
    const effectiveDeviceId = isIOS() ? undefined : deviceId;

    const setFacingMode = (mode: CameraFacingMode) => {
      if (facingModeProp === undefined) {
        setInternalFacingMode(mode);
      }
      onFacingModeChange?.(mode);
    };

    const flipCamera = () => {
      setFacingMode(facingMode === "user" ? "environment" : "user");
    };

    const onVideoReadyRef = useRef(onVideoReady);
    useEffect(() => {
      onVideoReadyRef.current = onVideoReady;
    });

    const onStreamReadyRef = useRef(onStreamReady);
    useEffect(() => {
      onStreamReadyRef.current = onStreamReady;
    });

    useEffect(() => {
      const blocked = cameraUnavailableReason();
      if (blocked) {
        setError(blocked);
        return;
      }

      let stream: MediaStream | null = null;
      let cancelled = false;

      setError(null);

      (async () => {
        try {
          stream = await openCameraStream({
            facingMode,
            deviceId: effectiveDeviceId,
          });
          if (cancelled) {
            stream.getTracks().forEach((t) => t.stop());
            return;
          }
          const video = ref && "current" in ref ? ref.current : null;
          if (video) {
            video.srcObject = stream;
            video.setAttribute("playsinline", "true");
            video.setAttribute("webkit-playsinline", "true");
            await video.play();
            if (!cancelled) {
              onStreamReadyRef.current?.(stream);
              onVideoReadyRef.current?.(video);
            }
          }
        } catch (e) {
          if (!cancelled) {
            if (e instanceof DOMException && e.name === "NotAllowedError") {
              setError(
                `Camera permission denied. On iPhone open Settings → ${iosBrowserName()} → Camera, allow access, then reload this page.`
              );
              return;
            }
            setError(e instanceof Error ? e.message : "Camera access denied");
          }
        }
      })();

      return () => {
        cancelled = true;
        stream?.getTracks().forEach((t) => t.stop());
      };
    }, [ref, facingMode, effectiveDeviceId]);

    if (error) {
      return (
        <div className="flex h-full min-h-[16rem] w-full items-center justify-center bg-surface-muted p-4 text-center text-muted">
          <div>
            <p className="mb-1 font-medium text-foreground">Camera unavailable</p>
            <p className="text-sm">{error}</p>
          </div>
        </div>
      );
    }

    const videoClassName =
      className ??
      `h-full w-full object-cover ${mirrored ? "scale-x-[-1]" : ""}`;

    return (
      <>
        <video
          ref={ref}
          className={videoClassName}
          playsInline
          muted
          autoPlay
        />
        {showFlipButton && (
          <button
            type="button"
            onClick={flipCamera}
            className={flipButtonClassName}
            aria-label={
              facingMode === "user"
                ? "Switch to back camera"
                : "Switch to front camera"
            }
          >
            <FlipCameraIcon />
          </button>
        )}
      </>
    );
  }
);

function FlipCameraIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
      aria-hidden
    >
      <path d="M11 19H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h5" />
      <path d="M13 5h7a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-5" />
      <circle cx="12" cy="12" r="3" />
      <path d="m18 22-3-3 3-3" />
      <path d="m6 2 3 3-3 3" />
    </svg>
  );
}
