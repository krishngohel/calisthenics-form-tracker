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

let moveNetDetector: poseDetection.PoseDetector | null = null;
let mpPose: PoseLandmarker | null = null;
let handLandmarker: HandLandmarker | null = null;
let bodyProvider: WorkerBodyProvider = "movenet";
let canvas: OffscreenCanvas | null = null;
let ctx: OffscreenCanvasRenderingContext2D | null = null;
let initializedProvider: WorkerBodyProvider | null = null;
let tfReady = false;

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
    await tf.setBackend("webgl");
    await tf.ready();
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

async function initMediaPipePose(): Promise<void> {
  if (mpPose) return;
  const vision = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm"
  );
  mpPose = await PoseLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath:
        "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
      delegate: "GPU",
    },
    runningMode: "VIDEO",
    numPoses: 1,
  });
}

async function initHands(): Promise<void> {
  if (handLandmarker) return;
  const vision = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm"
  );
  handLandmarker = await HandLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath:
        "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
      delegate: "GPU",
    },
    runningMode: "VIDEO",
    numHands: 2,
  });
}

function ensureCanvas(w: number, h: number): OffscreenCanvasRenderingContext2D {
  if (!canvas || canvas.width !== w || canvas.height !== h) {
    canvas = new OffscreenCanvas(w, h);
    ctx = canvas.getContext("2d")!;
  }
  return ctx!;
}

function toCamelCase(name: string): string {
  return name.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
}

async function detectBody(
  bitmap: ImageBitmap,
  timestamp: number
): Promise<Record<string, { x: number; y: number; z?: number; visibility?: number } | null>> {
  const body: Record<string, { x: number; y: number; z?: number; visibility?: number } | null> = {};

  if (bodyProvider === "movenet" && moveNetDetector) {
    const c = ensureCanvas(bitmap.width, bitmap.height);
    c.drawImage(bitmap, 0, 0);
    const poses = await moveNetDetector.estimatePoses(
      canvas! as unknown as HTMLCanvasElement,
      { flipHorizontal: false }
    );
    if (poses[0]?.keypoints) {
      for (const kp of poses[0].keypoints) {
        const rawName = (kp as { name?: string }).name;
        if (!rawName || kp.x == null || kp.y == null) continue;
        const key = toCamelCase(rawName);
        body[key] = {
          x: kp.x / bitmap.width,
          y: kp.y / bitmap.height,
          visibility: kp.score,
        };
      }
    }
  } else if (mpPose) {
    const c = ensureCanvas(bitmap.width, bitmap.height);
    c.drawImage(bitmap, 0, 0);
    const result = mpPose.detectForVideo(
      canvas! as unknown as HTMLCanvasElement,
      timestamp
    );
    if (result.landmarks[0]) {
      for (const [idxStr, key] of Object.entries(MP_POSE_MAP)) {
        const idx = parseInt(idxStr, 10);
        const lm = result.landmarks[0][idx];
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

async function detectHands(
  bitmap: ImageBitmap,
  timestamp: number
): Promise<{ left: { x: number; y: number }[] | null; right: { x: number; y: number }[] | null }> {
  if (!handLandmarker) {
    return { left: null, right: null };
  }
  const c = ensureCanvas(bitmap.width, bitmap.height);
  c.drawImage(bitmap, 0, 0);
  const result = handLandmarker.detectForVideo(
    canvas! as unknown as HTMLCanvasElement,
    timestamp
  );
  let left: { x: number; y: number }[] | null = null;
  let right: { x: number; y: number }[] | null = null;
  result.landmarks.forEach((lm, i) => {
    const pts = lm.map((p) => ({ x: p.x, y: p.y }));
    const label = result.handedness[i]?.[0]?.categoryName;
    if (label === "Left") left = pts;
    else right = pts;
  });
  return { left, right };
}

async function ensureInitialized(
  provider: WorkerBodyProvider,
  enableHands: boolean
): Promise<void> {
  bodyProvider = provider;
  if (provider === "movenet") {
    await initMoveNet();
  } else {
    await initMediaPipePose();
  }
  if (enableHands) await initHands();
  initializedProvider = provider;
}

self.onmessage = async (ev: MessageEvent<WorkerIn>) => {
  const msg = ev.data;
  try {
    if (msg.type === "init") {
      await ensureInitialized(msg.bodyProvider, msg.enableHands);
      self.postMessage({ type: "ready", bodyProvider });
    } else if (msg.type === "detect") {
      if (initializedProvider !== bodyProvider) {
        await ensureInitialized(bodyProvider, msg.enableHands);
      } else if (msg.enableHands) {
        await initHands();
      }

      const t0 = performance.now();
      const body = await detectBody(msg.imageBitmap, msg.timestamp);
      const hands = msg.enableHands
        ? await detectHands(msg.imageBitmap, msg.timestamp)
        : { left: null, right: null };
      msg.imageBitmap.close();
      const inferenceMs = performance.now() - t0;
      self.postMessage({
        type: "result",
        body,
        hands,
        timestamp: msg.timestamp,
        inferenceMs,
        provider: bodyProvider,
      });
    } else if (msg.type === "benchmark") {
      const prev = bodyProvider;
      await ensureInitialized(msg.bodyProvider, false);
      const times: number[] = [];
      let dropped = 0;
      let frames = 0;
      const targetInterval = 1000 / 20;
      const start = performance.now();

      while (performance.now() - start < msg.durationMs) {
        const t0 = performance.now();
        try {
          await detectBody(msg.imageBitmap, t0);
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
      msg.imageBitmap.close();
      times.sort((a, b) => a - b);
      const avg = times.reduce((s, t) => s + t, 0) / (times.length || 1);
      const p95 = times[Math.floor(times.length * 0.95)] ?? avg;
      bodyProvider = prev;
      self.postMessage({
        type: "benchmarkResult",
        provider: msg.bodyProvider,
        framesProcessed: frames,
        droppedFrames: dropped,
        avgInferenceMs: avg,
        p95InferenceMs: p95,
        avgFps: frames / elapsedSec,
      });
    } else if (msg.type === "dispose") {
      moveNetDetector?.dispose();
      mpPose?.close();
      handLandmarker?.close();
      moveNetDetector = null;
      mpPose = null;
      handLandmarker = null;
      initializedProvider = null;
    }
  } catch (err) {
    self.postMessage({
      type: "error",
      message: err instanceof Error ? err.message : String(err),
    });
  }
};

export {};
