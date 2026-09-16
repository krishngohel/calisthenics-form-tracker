/// <reference lib="webworker" />

import * as poseDetection from "@tensorflow-models/pose-detection";
import * as tf from "@tensorflow/tfjs";
import "@tensorflow/tfjs-backend-webgl";
import {
  FilesetResolver,
  HandLandmarker,
  PoseLandmarker,
} from "@mediapipe/tasks-vision";

export type WorkerBodyProvider = "movenet" | "mediapipe";

type Point = { x: number; y: number; z?: number; visibility?: number };
type Body = Record<string, Point | null>;
type Hands = { left: Point[] | null; right: Point[] | null };

interface WorkerInit {
  type: "init";
  bodyProvider: WorkerBodyProvider;
  enableHands: boolean;
}

interface WorkerDetect {
  type: "detect";
  imageBitmap: ImageBitmap;
  timestamp: number;
  enableHands: boolean;
}

interface WorkerBenchmark {
  type: "benchmark";
  bodyProvider: WorkerBodyProvider;
  durationMs: number;
  imageBitmap: ImageBitmap;
}

type WorkerIn = WorkerInit | WorkerDetect | WorkerBenchmark | { type: "dispose" };

const MP_WASM_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm";
const MP_POSE_MODEL =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";
const MP_HAND_MODEL =
  "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";

let moveNetDetector: poseDetection.PoseDetector | null = null;
let mpPose: PoseLandmarker | null = null;
let handLandmarker: HandLandmarker | null = null;
let bodyProvider: WorkerBodyProvider = "movenet";
let canvas: OffscreenCanvas | null = null;
let ctx: OffscreenCanvasRenderingContext2D | null = null;
let tfReady = false;
let visionFileset: Awaited<ReturnType<typeof FilesetResolver.forVisionTasks>> | null = null;

/**
 * Message handlers run concurrently (each `onmessage` is its own async task),
 * so model loading is funnelled through one shared promise. Without this a
 * `detect` arriving during `init` would load a second copy of the model.
 */
let initKey = "";
let initPromise: Promise<void> | null = null;

const MP_POSE_MAP: Record<number, string> = {
  0: "nose",
  11: "leftShoulder",
  12: "rightShoulder",
  13: "leftElbow",
  14: "rightElbow",
  15: "leftWrist",
  16: "rightWrist",
  23: "leftHip",
  24: "rightHip",
  25: "leftKnee",
  26: "rightKnee",
  27: "leftAnkle",
  28: "rightAnkle",
};

async function initMoveNet(): Promise<void> {
  if (!tfReady) {
    try {
      await tf.setBackend("webgl");
      await tf.ready();
    } catch {
      await tf.setBackend("cpu");
      await tf.ready();
    }
    tfReady = true;
  }
  if (moveNetDetector) return;
  moveNetDetector = await poseDetection.createDetector(
    poseDetection.SupportedModels.MoveNet,
    {
      modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
      enableSmoothing: false,
    }
  );
}

async function getVisionFileset() {
  if (!visionFileset) {
    visionFileset = await FilesetResolver.forVisionTasks(MP_WASM_URL);
  }
  return visionFileset;
}

/** Try the GPU delegate first, fall back to CPU (e.g. no WebGL in workers). */
async function withDelegateFallback<T>(
  create: (delegate: "GPU" | "CPU") => Promise<T>
): Promise<T> {
  try {
    return await create("GPU");
  } catch {
    return create("CPU");
  }
}

async function initMediaPipePose(): Promise<void> {
  if (mpPose) return;
  const vision = await getVisionFileset();
  mpPose = await withDelegateFallback((delegate) =>
    PoseLandmarker.createFromOptions(vision, {
      baseOptions: { modelAssetPath: MP_POSE_MODEL, delegate },
      runningMode: "VIDEO",
      numPoses: 1,
    })
  );
}

async function initHands(): Promise<void> {
  if (handLandmarker) return;
  const vision = await getVisionFileset();
  handLandmarker = await withDelegateFallback((delegate) =>
    HandLandmarker.createFromOptions(vision, {
      baseOptions: { modelAssetPath: MP_HAND_MODEL, delegate },
      runningMode: "VIDEO",
      numHands: 2,
    })
  );
}

function ensureInitialized(
  provider: WorkerBodyProvider,
  enableHands: boolean
): Promise<void> {
  const key = `${provider}:${enableHands}`;
  if (initPromise && initKey === key) return initPromise;
  initKey = key;
  initPromise = (async () => {
    bodyProvider = provider;
    if (provider === "movenet") await initMoveNet();
    else await initMediaPipePose();
    if (enableHands) await initHands();
  })().catch((err) => {
    initPromise = null;
    initKey = "";
    throw err;
  });
  return initPromise;
}

function drawToCanvas(bitmap: ImageBitmap): OffscreenCanvas {
  if (!canvas || canvas.width !== bitmap.width || canvas.height !== bitmap.height) {
    canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    ctx = canvas.getContext("2d");
  }
  ctx!.drawImage(bitmap, 0, 0);
  return canvas;
}

function toCamelCase(name: string): string {
  return name.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
}

/**
 * The image is drawn to the canvas once per frame; both body and hand models
 * read from it.
 */
async function detectBody(source: OffscreenCanvas, timestamp: number): Promise<Body> {
  const body: Body = {};
  const image = source as unknown as HTMLCanvasElement;

  if (bodyProvider === "movenet" && moveNetDetector) {
    const poses = await moveNetDetector.estimatePoses(image, { flipHorizontal: false });
    const keypoints = poses[0]?.keypoints;
    if (keypoints) {
      for (const kp of keypoints) {
        const rawName = (kp as { name?: string }).name;
        if (!rawName || kp.x == null || kp.y == null) continue;
        body[toCamelCase(rawName)] = {
          x: kp.x / source.width,
          y: kp.y / source.height,
          visibility: kp.score,
        };
      }
    }
  } else if (mpPose) {
    const result = mpPose.detectForVideo(image, timestamp);
    const landmarks = result.landmarks[0];
    if (landmarks) {
      for (const [idxStr, key] of Object.entries(MP_POSE_MAP)) {
        const idx = Number(idxStr);
        const lm = landmarks[idx];
        if (lm) {
          body[key] = {
            x: lm.x,
            y: lm.y,
            z: lm.z,
            visibility: lm.visibility ?? result.worldLandmarks[0]?.[idx]?.visibility,
          };
        }
      }
    }
  }

  return body;
}

function dist(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/**
 * MediaPipe's "Left"/"Right" handedness assumes a mirrored (selfie) image, so
 * it is inverted for the back camera. Assigning each hand to the nearest body
 * wrist is camera-agnostic.
 */
function detectHands(source: OffscreenCanvas, timestamp: number, body: Body): Hands {
  if (!handLandmarker) return { left: null, right: null };
  const result = handLandmarker.detectForVideo(
    source as unknown as HTMLCanvasElement,
    timestamp
  );
  const hands: Hands = { left: null, right: null };
  const leftWrist = body.leftWrist;
  const rightWrist = body.rightWrist;

  result.landmarks.forEach((lm, i) => {
    const pts = lm.map((p) => ({ x: p.x, y: p.y }));
    const handWrist = pts[0];
    let side: "left" | "right";
    if (leftWrist && rightWrist && handWrist) {
      side = dist(handWrist, leftWrist) <= dist(handWrist, rightWrist) ? "left" : "right";
    } else if (leftWrist && !rightWrist) {
      side = "left";
    } else if (rightWrist && !leftWrist) {
      side = "right";
    } else {
      // No body wrists to anchor on — fall back to the model's label, un-mirrored.
      side = result.handedness[i]?.[0]?.categoryName === "Left" ? "right" : "left";
    }
    if (hands[side]) side = side === "left" ? "right" : "left";
    if (!hands[side]) hands[side] = pts;
  });

  return hands;
}

self.onmessage = async (ev: MessageEvent<WorkerIn>) => {
  const msg = ev.data;
  try {
    if (msg.type === "init") {
      await ensureInitialized(msg.bodyProvider, msg.enableHands);
      self.postMessage({ type: "ready", bodyProvider });
    } else if (msg.type === "detect") {
      try {
        if (!initPromise) {
          self.postMessage({ type: "skipped", timestamp: msg.timestamp });
          return;
        }
        await ensureInitialized(bodyProvider, msg.enableHands);

        const t0 = performance.now();
        const source = drawToCanvas(msg.imageBitmap);
        const body = await detectBody(source, msg.timestamp);
        const hands = msg.enableHands
          ? detectHands(source, msg.timestamp, body)
          : { left: null, right: null };
        const inferenceMs = performance.now() - t0;
        self.postMessage({
          type: "result",
          body,
          hands,
          timestamp: msg.timestamp,
          inferenceMs,
          provider: bodyProvider,
          frameWidth: source.width,
          frameHeight: source.height,
        });
      } finally {
        msg.imageBitmap.close();
      }
    } else if (msg.type === "benchmark") {
      try {
        await ensureInitialized(msg.bodyProvider, false);
        const source = drawToCanvas(msg.imageBitmap);
        const times: number[] = [];
        let dropped = 0;
        let frames = 0;
        const targetInterval = 1000 / 20;
        const start = performance.now();

        while (performance.now() - start < msg.durationMs) {
          const t0 = performance.now();
          try {
            await detectBody(source, t0);
            frames++;
            times.push(performance.now() - t0);
          } catch {
            dropped++;
          }
          // Pace to the target rate without busy-waiting.
          const wait = targetInterval - (performance.now() - t0);
          if (wait > 0) await new Promise((r) => setTimeout(r, wait));
        }

        const elapsedSec = (performance.now() - start) / 1000;
        times.sort((a, b) => a - b);
        const avg = times.reduce((s, t) => s + t, 0) / (times.length || 1);
        const p95 = times[Math.floor(times.length * 0.95)] ?? avg;
        self.postMessage({
          type: "benchmarkResult",
          provider: msg.bodyProvider,
          framesProcessed: frames,
          droppedFrames: dropped,
          avgInferenceMs: avg,
          p95InferenceMs: p95,
          avgFps: frames / elapsedSec,
        });
      } finally {
        msg.imageBitmap.close();
      }
    } else if (msg.type === "dispose") {
      moveNetDetector?.dispose();
      mpPose?.close();
      handLandmarker?.close();
      moveNetDetector = null;
      mpPose = null;
      handLandmarker = null;
      initPromise = null;
      initKey = "";
    }
  } catch (err) {
    self.postMessage({
      type: "error",
      message: err instanceof Error ? err.message : String(err),
    });
  }
};

export {};
