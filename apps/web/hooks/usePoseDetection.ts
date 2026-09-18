"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  BodyProviderId,
  HandLandmarks,
  Landmark,
  PerformanceTier,
  DistanceContext,
} from "@cft/core";
import {
  HandInterpolator,
  LandmarkInterpolator,
  LandmarkPersistence,
  PoseSmoother,
  rejectOutliers,
  getDistanceContext,
  dropLowConfidence,
  detectPerformanceTier,
  PERFORMANCE_PROFILES,
  OVERLAY_SMOOTHING,
  HOLD_SMOOTHING,
} from "@cft/core";
import { readString, STORAGE_KEYS, writeString } from "@/lib/storage";
import { createMainThreadEndpoint, createWorkerEndpoint, type PoseEndpoint } from "@/lib/pose/endpoint";

export interface PoseDetectionState {
  /** Smoothed model inference time. */
  inferenceMs: number;
  /** Achieved detection rate over the last second. */
  detectFps: number;
  provider: BodyProviderId;
  /** What ran the model: webgl / cpu (MoveNet), wasm-gpu / wasm-cpu (MediaPipe). */
  backend: string;
  /** Model load time. */
  initMs: number;
  /** Captured frame size sent to the model, e.g. "640×360". */
  captureSize: string;
  ready: boolean;
  error: string | null;
  /** Where inference runs; "main-thread" means the worker was unavailable. */
  engine: "worker" | "main-thread";
}

export interface PoseFrameInfo {
  /** Video frame width / height. Pass to `toIsotropic` before running geometry. */
  aspect: number;
  timestamp: number;
}

export interface UsePoseDetectionOptions {
  bodyProvider?: BodyProviderId;
  /** Run hand landmarker for fingertip skeleton. Default true. */
  trackHands?: boolean;
  /** Fired per detection frame with confidence-filtered, hold-smoothed landmarks (frame space). */
  onFrame?: (
    body: Record<string, Landmark | null>,
    hands: HandLandmarks,
    frame: PoseFrameInfo
  ) => void;
  /** Fired each detection frame with athlete distance in frame. */
  onDistanceContext?: (ctx: DistanceContext) => void;
}

/** Max consecutive outlier rejections before force-accepting (legit fast movement). */
const MAX_CONSECUTIVE_REJECTS = 2;
/** Downscale captured frames — raised automatically when athlete is far from camera. */
const DEFAULT_CAPTURE_EDGE = 640;
/** Throttle inferenceMs state updates so React isn't re-rendered at detect rate. */
const STATS_UPDATE_INTERVAL_MS = 500;
/** Hard timeout per provider benchmark to avoid hanging UI forever. */
const BENCHMARK_TIMEOUT_MS = 45_000;
/** Predict skeleton slightly ahead of the last detection frame. */
const EXTRAPOLATE_MS = 30;
/** Console diagnostics cadence (readable from the native app's log). */
const DIAG_LOG_INTERVAL_MS = 5000;

/** If the worker has not reported ready by then, run the engine in-page instead. */
const WORKER_READY_TIMEOUT_MS = 25_000;

/** Prefer a worker; fall back to the page thread when workers are unavailable. */
function createEndpoint(): PoseEndpoint {
  return createWorkerEndpoint() ?? createMainThreadEndpoint();
}

async function createCaptureBitmap(
  video: HTMLVideoElement,
  maxEdge = DEFAULT_CAPTURE_EDGE
): Promise<ImageBitmap> {
  const scale = Math.min(1, maxEdge / Math.max(video.videoWidth, video.videoHeight));
  const resizeWidth = Math.max(1, Math.round(video.videoWidth * scale));
  const resizeHeight = Math.max(1, Math.round(video.videoHeight * scale));

  try {
    return await createImageBitmap(video, { resizeWidth, resizeHeight });
  } catch {
    return createImageBitmap(video);
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeout = window.setTimeout(() => reject(new Error(message)), ms);
    promise
      .then((value) => {
        clearTimeout(timeout);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timeout);
        reject(error);
      });
  });
}

export function usePoseDetection(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  options: UsePoseDetectionOptions = {}
) {
  const { bodyProvider = "movenet", trackHands = true, onFrame, onDistanceContext } =
    options;
  const workerRef = useRef<PoseEndpoint | null>(null);
  const readyRef = useRef(false);
  const overlaySmootherRef = useRef(new PoseSmoother());
  const holdSmootherRef = useRef(new PoseSmoother());
  const persistenceRef = useRef(new LandmarkPersistence());
  const handSmootherRef = useRef(new PoseSmoother());
  const overlayInterpolatorRef = useRef(new LandmarkInterpolator());
  const handInterpolatorRef = useRef(new HandInterpolator());
  const lastBodyRef = useRef<Record<string, Landmark | null> | null>(null);
  const rejectCountRef = useRef(0);
  const busyRef = useRef(false);
  const lastDetectRef = useRef(0);
  const captureEdgeRef = useRef(DEFAULT_CAPTURE_EDGE);
  const lastStatsUpdateRef = useRef(0);
  const inferenceEmaRef = useRef(0);
  const frameTimesRef = useRef<number[]>([]);
  const lastDiagLogRef = useRef(0);
  const captureSizeRef = useRef("");
  const isPageVisibleRef = useRef(true);
  const trackHandsRef = useRef(trackHands);

  const onFrameRef = useRef(onFrame);
  const onDistanceContextRef = useRef(onDistanceContext);
  useEffect(() => {
    onFrameRef.current = onFrame;
    onDistanceContextRef.current = onDistanceContext;
    trackHandsRef.current = trackHands;
  });

  // Default to medium so SSR and first client paint match; tier is resolved after mount.
  const [tier, setTier] = useState<PerformanceTier>("medium");
  const profile = PERFORMANCE_PROFILES[tier];

  useEffect(() => {
    // Modern iPhones handle 30–45 fps detection; only older ones need the low tier.
    setTier(detectPerformanceTier());
  }, []);

  // Re-tune smoothing when the tier resolves — without tearing down the worker.
  useEffect(() => {
    const overlayTuning = OVERLAY_SMOOTHING[tier];
    overlaySmootherRef.current = new PoseSmoother(overlayTuning);
    holdSmootherRef.current = new PoseSmoother(HOLD_SMOOTHING[tier]);
    handSmootherRef.current = new PoseSmoother({
      minCutoff: overlayTuning.minCutoff + 0.5,
      beta: overlayTuning.beta + 0.05,
    });
  }, [tier]);

  const [state, setState] = useState<PoseDetectionState>({
    inferenceMs: 0,
    detectFps: 0,
    provider: bodyProvider,
    backend: "unknown",
    initMs: 0,
    captureSize: "",
    ready: false,
    error: null,
    engine: "worker",
  });

  useEffect(() => {
    const onVisibility = () => {
      isPageVisibleRef.current = !document.hidden;
      if (document.hidden) busyRef.current = false;
    };
    document.addEventListener("visibilitychange", onVisibility);
    onVisibility();
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  useEffect(() => {
    let endpoint = createEndpoint();
    let readyTimer = 0;
    let disposed = false;
    workerRef.current = endpoint;
    readyRef.current = false;
    overlaySmootherRef.current.reset();
    holdSmootherRef.current.reset();
    handSmootherRef.current.reset();
    persistenceRef.current.reset();
    overlayInterpolatorRef.current.reset();
    handInterpolatorRef.current.reset();
    lastBodyRef.current = null;
    rejectCountRef.current = 0;
    busyRef.current = false;
    lastDetectRef.current = 0;
    inferenceEmaRef.current = 0;
    frameTimesRef.current = [];

    /** Swap to the in-page engine when the worker cannot come up. */
    const fallBack = (reason: string) => {
      if (disposed || endpoint.kind === "main-thread") return;
      console.warn(`Pose worker unavailable (${reason}); running inference on the main thread.`);
      window.clearTimeout(readyTimer);
      endpoint.terminate();
      endpoint = createMainThreadEndpoint();
      workerRef.current = endpoint;
      busyRef.current = false;
      attach(endpoint);
      setState((s) => ({ ...s, engine: "main-thread", ready: false, error: null }));
      endpoint.postMessage({ type: "init", bodyProvider, enableHands: trackHands });
    };

    const attach = (target: PoseEndpoint) => {
      target.onerror = (message) => {
        if (target.kind === "worker" && !readyRef.current) fallBack(message);
        else {
          readyRef.current = false;
          setState((s) => ({ ...s, ready: false, error: message }));
          busyRef.current = false;
        }
      };
      target.onmessage = (ev) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- discriminated in the branches below
      const data = ev.data as any;
      if (data.type === "ready") {
        window.clearTimeout(readyTimer);
        readyRef.current = true;
        setState((s) => ({
          ...s,
          ready: true,
          error: null,
          provider: data.bodyProvider,
          backend: data.backend ?? "unknown",
          initMs: data.initMs ?? 0,
        }));
      } else if (data.type === "skipped") {
        busyRef.current = false;
      } else if (data.type === "result") {
        busyRef.current = false;
        // Off-frame / occluded joints come back with near-zero confidence at
        // arbitrary positions; drop them before any geometry sees them.
        const body = dropLowConfidence(data.body as Record<string, Landmark | null>);
        const distanceCtx = getDistanceContext(body);
        captureEdgeRef.current = distanceCtx.captureMaxEdge;
        onDistanceContextRef.current?.(distanceCtx);

        if (rejectOutliers(lastBodyRef.current, body)) {
          rejectCountRef.current++;
          if (rejectCountRef.current < MAX_CONSECUTIVE_REJECTS) return;
          holdSmootherRef.current.reset();
          overlaySmootherRef.current.reset();
        }
        rejectCountRef.current = 0;

        const overlayBody = overlaySmootherRef.current.smoothLandmarks(body, data.timestamp);
        // Rules get a gap-bridged body so a one-frame dropout cannot end a hold.
        const persisted = persistenceRef.current.apply(body, data.timestamp);
        let bodyForHold = holdSmootherRef.current.smoothLandmarks(persisted, data.timestamp);
        if (distanceCtx.isFar) {
          bodyForHold = holdSmootherRef.current.smoothLandmarks(bodyForHold, data.timestamp);
        }
        lastBodyRef.current = body;

        const rawHands = data.hands as HandLandmarks;
        const wantHands = trackHandsRef.current;
        const smoothedHands = wantHands
          ? handSmootherRef.current.smoothHands(rawHands, data.timestamp)
          : rawHands;

        overlayInterpolatorRef.current.update(overlayBody, data.timestamp);
        if (wantHands) {
          handInterpolatorRef.current.update(smoothedHands, data.timestamp);
        }
        const frameWidth = Number(data.frameWidth) || 0;
        const frameHeight = Number(data.frameHeight) || 0;
        onFrameRef.current?.(bodyForHold, smoothedHands, {
          aspect: frameWidth > 0 && frameHeight > 0 ? frameWidth / frameHeight : 1,
          timestamp: data.timestamp,
        });

        const now = performance.now();
        inferenceEmaRef.current = inferenceEmaRef.current
          ? inferenceEmaRef.current * 0.85 + data.inferenceMs * 0.15
          : data.inferenceMs;
        const times = frameTimesRef.current;
        times.push(now);
        while (times.length && now - times[0] > 1000) times.shift();
        const captureSize = `${data.frameWidth}×${data.frameHeight}`;
        captureSizeRef.current = captureSize;
        if (now - lastStatsUpdateRef.current > STATS_UPDATE_INTERVAL_MS) {
          lastStatsUpdateRef.current = now;
          setState((s) => ({
            ...s,
            inferenceMs: Math.round(inferenceEmaRef.current),
            detectFps: times.length,
            provider: data.provider,
            captureSize,
          }));
        }
        if (now - lastDiagLogRef.current > DIAG_LOG_INTERVAL_MS) {
          lastDiagLogRef.current = now;
          const video = videoRef.current;
          console.log(
            `[pose] engine=${workerRef.current?.kind} provider=${data.provider} infer=${Math.round(inferenceEmaRef.current)}ms fps=${times.length} capture=${captureSize} video=${video?.videoWidth ?? 0}×${video?.videoHeight ?? 0} far=${distanceCtx.isFar}`
          );
        }
      } else if (data.type === "error") {
        if (target.kind === "worker" && !readyRef.current) {
          fallBack(data.message);
          return;
        }
        readyRef.current = false;
        setState((s) => ({ ...s, ready: false, error: data.message }));
        busyRef.current = false;
      }
      };
    };

    attach(endpoint);
    setState((s) => ({ ...s, ready: false, error: null, provider: bodyProvider, engine: endpoint.kind }));
    endpoint.postMessage({ type: "init", bodyProvider, enableHands: trackHands });
    if (endpoint.kind === "worker") {
      readyTimer = window.setTimeout(() => {
        if (!readyRef.current) fallBack("no ready signal within 25s");
      }, WORKER_READY_TIMEOUT_MS);
    }

    return () => {
      disposed = true;
      window.clearTimeout(readyTimer);
      readyRef.current = false;
      endpoint.postMessage({ type: "dispose" });
      endpoint.terminate();
      workerRef.current = null;
    };
  }, [bodyProvider, trackHands]);

  const detectLoop = useCallback(async () => {
    const video = videoRef.current;
    const worker = workerRef.current;
    if (!video || !worker || !readyRef.current || busyRef.current) return;
    if (video.readyState < 2 || !video.videoWidth || !video.videoHeight) return;
    if (!isPageVisibleRef.current) return;

    const now = performance.now();
    const minInterval = 1000 / profile.detectFps;
    if (now - lastDetectRef.current < minInterval) return;
    lastDetectRef.current = now;

    busyRef.current = true;
    try {
      const bitmap = await createCaptureBitmap(video, captureEdgeRef.current);
      worker.postMessage(
        {
          type: "detect",
          imageBitmap: bitmap,
          timestamp: now,
          enableHands: trackHandsRef.current,
        },
        [bitmap]
      );
    } catch {
      busyRef.current = false;
    }
  }, [videoRef, profile.detectFps]);

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      void detectLoop();
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [detectLoop]);

  const getRenderLandmarks = useCallback((): Record<
    string,
    Landmark | null
  > | null => {
    return (
      overlayInterpolatorRef.current.interpolate(performance.now(), {
        extrapolateMs: EXTRAPOLATE_MS,
      })?.landmarks ?? null
    );
  }, []);

  const getRenderHands = useCallback((): HandLandmarks | null => {
    if (!trackHands) return null;
    return handInterpolatorRef.current.interpolate(performance.now(), {
      extrapolateMs: EXTRAPOLATE_MS,
    });
  }, [trackHands]);

  return { ...state, getRenderLandmarks, getRenderHands, profile };
}

export interface BenchmarkProviderResult {
  avgInferenceMs: number;
  p95InferenceMs: number;
  avgFps: number;
  droppedFrames: number;
  framesProcessed: number;
}

export function usePoseBenchmark(
  videoRef: React.RefObject<HTMLVideoElement | null>
) {
  const [results, setResults] = useState<Record<
    BodyProviderId,
    BenchmarkProviderResult
  > | null>(null);
  const [running, setRunning] = useState(false);
  const [recommendation, setRecommendation] =
    useState<BodyProviderId>("movenet");

  const runProviderBenchmark = useCallback(
    async (provider: BodyProviderId): Promise<BenchmarkProviderResult> => {
      const video = videoRef.current;
      if (!video || video.readyState < 2) {
        throw new Error("Video not ready");
      }

      const worker = createEndpoint();

      try {
        return await withTimeout(
          new Promise<BenchmarkProviderResult>((resolve, reject) => {
            worker.onerror = (message) => reject(new Error(message));
            worker.onmessage = (ev) => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const data = ev.data as any;
              if (data.type === "ready") {
                createCaptureBitmap(video)
                  .then((bitmap) => {
                    worker.postMessage(
                      {
                        type: "benchmark",
                        bodyProvider: provider,
                        durationMs: 10_000,
                        imageBitmap: bitmap,
                      },
                      [bitmap]
                    );
                  })
                  .catch((err) => reject(err));
              } else if (data.type === "benchmarkResult") {
                resolve({
                  avgInferenceMs: data.avgInferenceMs,
                  p95InferenceMs: data.p95InferenceMs,
                  avgFps: data.avgFps,
                  droppedFrames: data.droppedFrames,
                  framesProcessed: data.framesProcessed,
                });
              } else if (data.type === "error") {
                reject(new Error(data.message));
              }
            };

            worker.postMessage({
              type: "init",
              bodyProvider: provider,
              enableHands: false,
            });
          }),
          BENCHMARK_TIMEOUT_MS,
          `${provider} benchmark timed out`
        );
      } finally {
        worker.postMessage({ type: "dispose" });
        worker.terminate();
      }
    },
    [videoRef]
  );

  const runBenchmark = useCallback(async () => {
    const video = videoRef.current;
    if (!video || video.readyState < 2) return;
    if (running) return;

    setRunning(true);
    setResults(null);

    const collected = {} as Record<BodyProviderId, BenchmarkProviderResult>;

    for (const provider of ["movenet", "movenet-thunder", "mediapipe"] as const) {
      try {
        collected[provider] = await runProviderBenchmark(provider);
      } catch {
        collected[provider] = {
          avgInferenceMs: Infinity,
          p95InferenceMs: Infinity,
          avgFps: 0,
          droppedFrames: 0,
          framesProcessed: 0,
        };
      }
    }

    setResults(collected);
    const score = (r: BenchmarkProviderResult) =>
      r.avgFps * 2 - r.avgInferenceMs - r.droppedFrames * 5;
    const winner = (Object.keys(collected) as BodyProviderId[]).reduce((best, p) =>
      score(collected[p]) > score(collected[best]) ? p : best
    );
    setRecommendation(winner);
    writeString(STORAGE_KEYS.bodyProvider, winner);
    setRunning(false);
  }, [runProviderBenchmark, running, videoRef]);

  return { results, running, runBenchmark, recommendation };
}

export function getStoredBodyProvider(): BodyProviderId {
  if (typeof window === "undefined") return "movenet";
  const stored = readString(STORAGE_KEYS.bodyProvider);
  if (stored === "mediapipe" || stored === "movenet" || stored === "movenet-thunder") return stored;
  // MoveNet on WebGL is the reliable fast path everywhere, including WKWebView
  // workers where MediaPipe's GPU delegate is not dependable.
  return "movenet";
}

export function setStoredBodyProvider(provider: BodyProviderId): void {
  writeString(STORAGE_KEYS.bodyProvider, provider);
}
