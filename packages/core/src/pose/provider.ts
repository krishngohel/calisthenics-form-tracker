/** Normalized 2D landmark in 0–1 space relative to frame. */
export interface Landmark {
  x: number;
  y: number;
  z?: number;
  visibility?: number;
}

export type BodyLandmarks = Record<string, Landmark | null>;

export interface HandLandmarks {
  left: Landmark[] | null;
  right: Landmark[] | null;
}

export interface PoseFrame {
  body: BodyLandmarks;
  hands: HandLandmarks;
  timestamp: number;
  provider: "movenet" | "mediapipe";
}

export type BodyProviderId = "movenet" | "mediapipe";

export interface PoseProviderConfig {
  bodyProvider: BodyProviderId;
  enableHands: boolean;
  inputSize: number;
}

export const DEFAULT_POSE_CONFIG: PoseProviderConfig = {
  bodyProvider: "movenet",
  enableHands: false,
  inputSize: 256,
};

/** MoveNet keypoint names mapped to our canonical body keys. */
export const MOVENET_KEY_MAP: Record<string, string> = {
  nose: "nose",
  left_eye: "leftEye",
  right_eye: "rightEye",
  left_ear: "leftEar",
  right_ear: "rightEar",
  left_shoulder: "leftShoulder",
  right_shoulder: "rightShoulder",
  left_elbow: "leftElbow",
  right_elbow: "rightElbow",
  left_wrist: "leftWrist",
  right_wrist: "rightWrist",
  left_hip: "leftHip",
  right_hip: "rightHip",
  left_knee: "leftKnee",
  right_knee: "rightKnee",
  left_ankle: "leftAnkle",
  right_ankle: "rightAnkle",
};

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

export interface BenchmarkStats {
  provider: BodyProviderId;
  framesProcessed: number;
  droppedFrames: number;
  avgInferenceMs: number;
  p95InferenceMs: number;
  avgFps: number;
  jitterScore: number;
}

export interface PoseProvider {
  readonly id: BodyProviderId;
  init(): Promise<void>;
  detect(
    imageData: ImageData,
    timestamp: number,
    enableHands: boolean
  ): Promise<PoseFrame | null>;
  dispose(): void;
}
