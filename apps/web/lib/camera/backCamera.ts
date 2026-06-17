import type { ZoomRange } from "@cft/core";
import { shouldUseDeviceIdForLens } from "./platform";

export interface BackCameraDevice {
  deviceId: string;
  label: string;
  /** Lower rank = wider field of view. */
  fovRank: number;
}

type ZoomCapabilities = MediaTrackCapabilities & {
  zoom?: { min: number; max: number; step?: number };
};

type ZoomSettings = MediaTrackSettings & {
  zoom?: number;
};

function scoreFovRank(label: string): number {
  const l = label.toLowerCase();
  if (l.includes("ultra")) return 0;
  if (l.includes("wide") && !l.includes("ultra")) return 1;
  if (l.includes("tele") || l.includes("2x") || l.includes("3x")) return 3;
  return 2;
}

function isBackCameraLabel(label: string, totalVideoInputs: number): boolean {
  const l = label.toLowerCase();
  if (l.includes("front") || l.includes("user") || l.includes("selfie")) {
    return false;
  }
  if (
    l.includes("back") ||
    l.includes("rear") ||
    l.includes("environment") ||
    l.includes("ultra") ||
    l.includes("tele")
  ) {
    return true;
  }
  // Permission-granted devices with opaque labels: treat sole camera as back.
  return totalVideoInputs === 1;
}

export async function listBackCameras(): Promise<BackCameraDevice[]> {
  if (!shouldUseDeviceIdForLens()) return [];

  const devices = await navigator.mediaDevices.enumerateDevices();
  const videos = devices.filter((d) => d.kind === "videoinput");

  return videos
    .filter((d) => isBackCameraLabel(d.label, videos.length))
    .map((d) => ({
      deviceId: d.deviceId,
      label: d.label || "Back camera",
      fovRank: scoreFovRank(d.label),
    }))
    .sort((a, b) => a.fovRank - b.fovRank || a.label.localeCompare(b.label));
}

export function pickDefaultBackCamera(
  cameras: BackCameraDevice[]
): BackCameraDevice | null {
  if (cameras.length === 0) return null;
  return cameras.find((c) => c.fovRank === 2) ?? cameras[Math.floor(cameras.length / 2)];
}

export function readZoomCapability(track: MediaStreamTrack): ZoomRange | null {
  const caps = track.getCapabilities?.() as ZoomCapabilities | undefined;
  if (!caps?.zoom) return null;
  return {
    min: caps.zoom.min,
    max: caps.zoom.max,
    step: caps.zoom.step ?? 0.1,
  };
}

export function readCurrentZoom(track: MediaStreamTrack, range: ZoomRange): number {
  const settings = track.getSettings?.() as ZoomSettings | undefined;
  return settings?.zoom ?? range.min;
}

export async function applyZoom(
  track: MediaStreamTrack,
  zoom: number
): Promise<number> {
  const withZoom = { zoom } as MediaTrackConstraints;
  try {
    await track.applyConstraints(withZoom);
  } catch {
    await track.applyConstraints({
      advanced: [{ zoom } as MediaTrackConstraintSet],
    });
  }
  const settings = track.getSettings() as ZoomSettings;
  return settings.zoom ?? zoom;
}

export function formatZoomLabel(zoom: number): string {
  return `${zoom.toFixed(1)}×`;
}

export function formatLensLabel(label: string): string {
  const l = label.toLowerCase();
  if (l.includes("ultra")) return "Ultra-wide";
  if (l.includes("tele") || l.includes("2x") || l.includes("3x")) return "Telephoto";
  if (l.includes("wide")) return "Wide";
  if (l.includes("back") || l.includes("rear")) return "Main";
  return "Back camera";
}
