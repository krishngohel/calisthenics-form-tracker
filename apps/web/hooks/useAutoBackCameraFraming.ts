"use client";

import { useCallback, useRef, useState } from "react";
import {
  recommendBackCameraZoom,
  recommendFramingGuidance,
  shouldSwitchToNarrowerLens,
  shouldSwitchToWiderLens,
  FRAMING_ZOOM_IN_BODY_SPAN,
  FRAMING_ZOOM_OUT_BODY_SPAN,
  type CameraFacingMode,
  type DistanceContext,
  type ZoomRange,
} from "@cft/core";
import {
  applyZoom,
  formatLensLabel,
  formatZoomLabel,
  listBackCameras,
  pickDefaultBackCamera,
  readCurrentZoom,
  readZoomCapability,
  type BackCameraDevice,
} from "@/lib/camera/backCamera";
import { iosCameraFramingMode } from "@/lib/camera/platform";

const STABLE_MS = 2000;

interface FramingCandidate {
  kind: "zoom" | "wider" | "narrower";
  value: number | string;
  since: number;
}

export interface UseAutoBackCameraFramingResult {
  /** Defaults to back camera for training. */
  facingMode: CameraFacingMode;
  deviceId: string | undefined;
  onFacingModeChange: (mode: CameraFacingMode) => void;
  onStreamReady: (stream: MediaStream) => void;
  onDistanceContext: (ctx: DistanceContext) => void;
  framingLabel: string | null;
  framingGuidance: string | null;
  isManualFraming: boolean;
  enableAutoFraming: () => void;
}

export function useAutoBackCameraFraming(): UseAutoBackCameraFramingResult {
  const guidanceOnly = iosCameraFramingMode() === "guidance";

  const [facingMode, setFacingMode] = useState<CameraFacingMode>("environment");
  const [deviceId, setDeviceId] = useState<string | undefined>();
  const [framingLabel, setFramingLabel] = useState<string | null>(
    guidanceOnly ? "Auto framing · position yourself" : null
  );
  const [framingGuidance, setFramingGuidance] = useState<string | null>(null);
  const [isManualFraming, setIsManualFraming] = useState(false);

  const autoEnabledRef = useRef(true);
  const trackRef = useRef<MediaStreamTrack | null>(null);
  const zoomRangeRef = useRef<ZoomRange | null>(null);
  const currentZoomRef = useRef(1);
  const backCamerasRef = useRef<BackCameraDevice[]>([]);
  const stableRef = useRef<FramingCandidate | null>(null);
  const camerasLoadedRef = useRef(false);

  const refreshFramingLabel = useCallback(
    (zoom: number | null, lens: BackCameraDevice | null) => {
      if (facingMode !== "environment") {
        setFramingLabel(null);
        setFramingGuidance(null);
        return;
      }
      if (guidanceOnly) {
        setFramingLabel("Auto framing · position yourself");
        return;
      }
      if (zoom != null && zoomRangeRef.current) {
        setFramingLabel(`Auto framing · ${formatZoomLabel(zoom)} zoom`);
        return;
      }
      if (lens) {
        setFramingLabel(`Auto framing · ${formatLensLabel(lens.label)}`);
        return;
      }
      setFramingLabel("Auto framing");
    },
    [facingMode, guidanceOnly]
  );

  const loadBackCameras = useCallback(async () => {
    if (camerasLoadedRef.current || guidanceOnly) return;
    const cameras = await listBackCameras();
    backCamerasRef.current = cameras;
    camerasLoadedRef.current = true;
    if (!deviceId) {
      const picked = pickDefaultBackCamera(cameras);
      if (picked) {
        setDeviceId(picked.deviceId);
        refreshFramingLabel(null, picked);
      }
    }
  }, [deviceId, guidanceOnly, refreshFramingLabel]);

  const onStreamReady = useCallback(
    (stream: MediaStream) => {
      void loadBackCameras();
      const track = stream.getVideoTracks()[0];
      if (!track) return;

      trackRef.current = track;
      if (guidanceOnly) {
        zoomRangeRef.current = null;
        refreshFramingLabel(null, null);
        return;
      }

      const range = readZoomCapability(track);
      zoomRangeRef.current = range;

      if (range) {
        const zoom = readCurrentZoom(track, range);
        currentZoomRef.current = zoom;
        refreshFramingLabel(zoom, null);
        return;
      }

      const lens =
        backCamerasRef.current.find((c) => c.deviceId === deviceId) ??
        pickDefaultBackCamera(backCamerasRef.current);
      refreshFramingLabel(null, lens);
    },
    [deviceId, guidanceOnly, loadBackCameras, refreshFramingLabel]
  );

  const switchLens = useCallback(
    (direction: "wider" | "narrower") => {
      const cameras = backCamerasRef.current;
      if (cameras.length < 2) return false;

      const idx = cameras.findIndex((c) => c.deviceId === deviceId);
      const currentIdx = idx >= 0 ? idx : 0;
      const nextIdx = direction === "wider" ? currentIdx - 1 : currentIdx + 1;
      if (nextIdx < 0 || nextIdx >= cameras.length) return false;

      stableRef.current = null;
      setDeviceId(cameras[nextIdx].deviceId);
      refreshFramingLabel(null, cameras[nextIdx]);
      return true;
    },
    [deviceId, refreshFramingLabel]
  );

  const onDistanceContext = useCallback(
    (ctx: DistanceContext) => {
      if (facingMode !== "environment" || !autoEnabledRef.current) return;
      // No athlete in frame — don't zoom toward an empty room.
      if (!ctx.bodyDetected) {
        stableRef.current = null;
        return;
      }

      if (guidanceOnly) {
        const hint = recommendFramingGuidance(ctx.bodySpan);
        setFramingGuidance(hint);
        setFramingLabel(
          hint ? "Auto framing · adjust position" : "Auto framing · well positioned"
        );
        return;
      }

      const track = trackRef.current;
      const range = zoomRangeRef.current;
      if (!track) return;

      let candidate: FramingCandidate["kind"] | null = null;
      let candidateValue: number | string | null = null;

      if (range) {
        const nextZoom = recommendBackCameraZoom(
          ctx.bodySpan,
          currentZoomRef.current,
          range
        );
        if (nextZoom != null) {
          candidate = "zoom";
          candidateValue = nextZoom;
        } else if (shouldSwitchToWiderLens(ctx.bodySpan, currentZoomRef.current, range)) {
          candidate = "wider";
          candidateValue = "wider";
        } else if (
          shouldSwitchToNarrowerLens(ctx.bodySpan, currentZoomRef.current, range)
        ) {
          candidate = "narrower";
          candidateValue = "narrower";
        }
      } else {
        if (ctx.bodySpan > FRAMING_ZOOM_OUT_BODY_SPAN) {
          candidate = "wider";
          candidateValue = "wider";
        } else if (ctx.bodySpan < FRAMING_ZOOM_IN_BODY_SPAN) {
          candidate = "narrower";
          candidateValue = "narrower";
        }
      }

      setFramingGuidance(recommendFramingGuidance(ctx.bodySpan));

      if (!candidate || candidateValue == null) {
        stableRef.current = null;
        return;
      }

      const now = performance.now();
      const stable = stableRef.current;
      if (stable?.kind === candidate && stable.value === candidateValue) {
        if (now - stable.since < STABLE_MS) return;

        if (candidate === "zoom" && typeof candidateValue === "number") {
          void applyZoom(track, candidateValue)
            .then((applied) => {
              currentZoomRef.current = applied;
              refreshFramingLabel(applied, null);
            })
            .catch(() => {
              // Zoom rejected by the device — fall back to position guidance.
              zoomRangeRef.current = null;
            });
        } else if (candidate === "wider") {
          switchLens("wider");
        } else if (candidate === "narrower") {
          switchLens("narrower");
        }
        stableRef.current = null;
        return;
      }

      stableRef.current = {
        kind: candidate,
        value: candidateValue,
        since: now,
      };
    },
    [facingMode, guidanceOnly, refreshFramingLabel, switchLens]
  );

  const onFacingModeChange = useCallback(
    (mode: CameraFacingMode) => {
      setFacingMode(mode);
      stableRef.current = null;
      if (mode === "user") {
        autoEnabledRef.current = false;
        setIsManualFraming(true);
        setFramingLabel(null);
        setFramingGuidance(null);
        return;
      }
      autoEnabledRef.current = true;
      setIsManualFraming(false);
      void loadBackCameras().then(() => {
        const lens =
          backCamerasRef.current.find((c) => c.deviceId === deviceId) ??
          pickDefaultBackCamera(backCamerasRef.current);
        refreshFramingLabel(
          zoomRangeRef.current ? currentZoomRef.current : null,
          lens
        );
      });
    },
    [deviceId, loadBackCameras, refreshFramingLabel]
  );

  const enableAutoFraming = useCallback(() => {
    if (facingMode !== "environment") return;
    autoEnabledRef.current = true;
    stableRef.current = null;
    setIsManualFraming(false);
    const lens =
      backCamerasRef.current.find((c) => c.deviceId === deviceId) ??
      pickDefaultBackCamera(backCamerasRef.current);
    refreshFramingLabel(
      zoomRangeRef.current ? currentZoomRef.current : null,
      lens
    );
  }, [deviceId, facingMode, refreshFramingLabel]);

  return {
    facingMode,
    deviceId: guidanceOnly ? undefined : deviceId,
    onFacingModeChange,
    onStreamReady,
    onDistanceContext,
    framingLabel,
    framingGuidance,
    isManualFraming,
    enableAutoFraming,
  };
}
