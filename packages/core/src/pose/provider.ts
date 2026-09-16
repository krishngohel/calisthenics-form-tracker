/** Normalized 2D landmark in 0–1 space relative to the video frame. */
export interface Landmark {
  x: number;
  y: number;
  z?: number;
  /** Model confidence for this point (MoveNet score / MediaPipe visibility). */
  visibility?: number;
}

export type BodyLandmarks = Record<string, Landmark | null>;

export interface HandLandmarks {
  left: Landmark[] | null;
  right: Landmark[] | null;
}

export type BodyProviderId = "movenet" | "mediapipe";

export interface PoseFrame {
  body: BodyLandmarks;
  hands: HandLandmarks;
  timestamp: number;
  provider: BodyProviderId;
}

export const SKELETON_CONNECTIONS: [string, string][] = [
  ["leftShoulder", "rightShoulder"],
  ["leftShoulder", "leftElbow"],
  ["leftElbow", "leftWrist"],
  ["rightShoulder", "rightElbow"],
  ["rightElbow", "rightWrist"],
  ["leftShoulder", "leftHip"],
  ["rightShoulder", "rightHip"],
  ["leftHip", "rightHip"],
  ["leftHip", "leftKnee"],
  ["leftKnee", "leftAnkle"],
  ["rightHip", "rightKnee"],
  ["rightKnee", "rightAnkle"],
  ["nose", "leftShoulder"],
  ["nose", "rightShoulder"],
];
