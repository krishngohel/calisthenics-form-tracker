import type { CameraFacingMode } from "@cft/core";
import { isIOS } from "./platform";

export interface OpenCameraOptions {
  facingMode: CameraFacingMode;
  deviceId?: string;
}

function videoOnly(
  constraints: MediaTrackConstraints | boolean
): MediaStreamConstraints {
  return { video: constraints, audio: false };
}

/**
 * Open the camera with progressive fallbacks.
 * iOS Safari is picky about exact deviceId / resolution constraints.
 */
export async function openCameraStream(
  options: OpenCameraOptions
): Promise<MediaStream> {
  const { facingMode, deviceId } = options;
  const ios = isIOS();
  const attempts: MediaStreamConstraints[] = [];

  if (deviceId && !ios) {
    attempts.push(
      videoOnly({
        deviceId: { exact: deviceId },
        width: { ideal: 1280 },
        height: { ideal: 720 },
        frameRate: { ideal: 30, max: 60 },
      })
    );
  }

  if (ios) {
    attempts.push(
      videoOnly({ facingMode: { exact: facingMode } }),
      videoOnly({ facingMode: { ideal: facingMode } }),
      videoOnly({ facingMode }),
      videoOnly({
        facingMode: { ideal: facingMode },
        width: { ideal: 1280 },
        height: { ideal: 720 },
      }),
      videoOnly(true)
    );
  } else {
    attempts.push(
      videoOnly({
        facingMode: { ideal: facingMode },
        width: { ideal: 1280 },
        height: { ideal: 720 },
        frameRate: { ideal: 30, max: 60 },
      }),
      videoOnly({
        facingMode: { ideal: facingMode },
        width: { ideal: 1280 },
        height: { ideal: 720 },
      }),
      videoOnly({ facingMode: { ideal: facingMode } }),
      videoOnly({ facingMode }),
      videoOnly(true)
    );
  }

  let lastError: unknown;
  for (const constraints of attempts) {
    try {
      return await navigator.mediaDevices.getUserMedia(constraints);
    } catch (error) {
      lastError = error;
      if (error instanceof DOMException && error.name === "NotAllowedError") {
        throw error;
      }
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Could not open camera with any supported settings");
}
