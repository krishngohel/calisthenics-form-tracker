"use client";

import { forwardRef, useEffect, useRef, useState } from "react";

export type CameraFacingMode = "user" | "environment";

interface CameraFeedProps {
  onVideoReady?: (video: HTMLVideoElement) => void;
  className?: string;
  facingMode?: CameraFacingMode;
  onFacingModeChange?: (mode: CameraFacingMode) => void;
  showFlipButton?: boolean;
}

export const CameraFeed = forwardRef<HTMLVideoElement, CameraFeedProps>(
  function CameraFeed(
    {
      onVideoReady,
      className,
      facingMode: facingModeProp,
      onFacingModeChange,
      showFlipButton = false,
    },
    ref
  ) {
    const [error, setError] = useState<string | null>(null);
    const [internalFacingMode, setInternalFacingMode] =
      useState<CameraFacingMode>("user");

    const facingMode = facingModeProp ?? internalFacingMode;
    const mirrored = facingMode === "user";

    const setFacingMode = (mode: CameraFacingMode) => {
      if (facingModeProp === undefined) {
        setInternalFacingMode(mode);
      }
      onFacingModeChange?.(mode);
    };

    const flipCamera = () => {
      setFacingMode(facingMode === "user" ? "environment" : "user");
    };

    // Keep the callback in a ref so a new inline prop never restarts the camera.
    const onVideoReadyRef = useRef(onVideoReady);
    useEffect(() => {
      onVideoReadyRef.current = onVideoReady;
    });

    useEffect(() => {
      let stream: MediaStream | null = null;
      let cancelled = false;

      setError(null);

      (async () => {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: { ideal: facingMode },
              width: { ideal: 1280 },
              height: { ideal: 720 },
              frameRate: { ideal: 30, max: 60 },
            },
            audio: false,
          });
          if (cancelled) {
            stream.getTracks().forEach((t) => t.stop());
            return;
          }
          const video = ref && "current" in ref ? ref.current : null;
          if (video) {
            video.srcObject = stream;
            await video.play();
            if (!cancelled) onVideoReadyRef.current?.(video);
          }
        } catch (e) {
          if (!cancelled) {
            setError(e instanceof Error ? e.message : "Camera access denied");
          }
        }
      })();

      return () => {
        cancelled = true;
        stream?.getTracks().forEach((t) => t.stop());
      };
    }, [ref, facingMode]);

    if (error) {
      return (
        <div className="flex aspect-[3/4] items-center justify-center rounded-xl bg-surface p-4 text-center text-muted sm:aspect-video">
          <div>
            <p className="mb-1 font-medium text-white">Camera unavailable</p>
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
        />
        {showFlipButton && (
          <button
            type="button"
            onClick={flipCamera}
            className="absolute right-3 top-3 z-30 flex h-11 w-11 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-sm transition hover:bg-black/80 active:scale-95"
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
