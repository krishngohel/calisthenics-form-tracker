"use client";

import { useRef, useState } from "react";
import { CameraFeed, type CameraFacingMode } from "@/components/camera/CameraFeed";
import { PoseOverlay } from "@/components/camera/PoseOverlay";
import { usePoseBenchmark, usePoseDetection } from "@/hooks/usePoseDetection";
import { Screen } from "@/components/app/Screen";

export default function PoseBenchmarkPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoReady, setVideoReady] = useState(false);
  const [facingMode, setFacingMode] = useState<CameraFacingMode>("user");
  const mirrored = facingMode === "user";
  const { getRenderLandmarks, ready, inferenceMs, provider } =
    usePoseDetection(videoRef, { bodyProvider: "movenet" });
  const { results, running, runBenchmark, recommendation } =
    usePoseBenchmark(videoRef);

  return (
    <Screen
      title="Pose model"
      subtitle="Compare MoveNet Lightning and MediaPipe Pose Lite on this device. Each runs for 10 seconds; the faster one becomes your default."
      back={{ href: "/settings", label: "Settings" }}
      className="max-w-4xl"
    >

      <div className="relative mb-6 aspect-[3/4] max-h-[70vh] overflow-hidden rounded-2xl border border-border bg-black shadow-card sm:aspect-video sm:max-h-none">
        <CameraFeed
          ref={videoRef}
          facingMode={facingMode}
          onFacingModeChange={setFacingMode}
          showFlipButton
          onVideoReady={() => setVideoReady(true)}
        />
        {videoReady && ready && (
          <PoseOverlay getLandmarks={getRenderLandmarks} videoRef={videoRef} mirror={mirrored} />
        )}
      </div>

      <div className="mb-4 flex flex-wrap gap-4 text-sm text-muted">
        <span>Worker: {ready ? "ready" : "loading…"}</span>
        <span>Provider: {provider}</span>
        <span>Inference: {inferenceMs.toFixed(1)}ms</span>
      </div>

      <button
        onClick={runBenchmark}
        disabled={!videoReady || running}
        className="btn-primary disabled:opacity-50"
      >
        {running ? "Running benchmark…" : "Run 10s benchmark (both providers)"}
      </button>

      {results && (
        <div className="mt-8 space-y-4">
          <p className="font-semibold text-accent">
            Recommended default: {recommendation} (saved for training sessions)
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {(["movenet", "mediapipe"] as const).map((p) => (
              <div
                key={p}
                className={`card p-4 ${
                  recommendation === p ? "ring-2 ring-accent/30" : ""
                }`}
              >
                <h3 className="mb-2 font-semibold capitalize">{p}</h3>
                <ul className="space-y-1 text-sm text-muted">
                  <li>Avg inference: {results[p].avgInferenceMs.toFixed(1)}ms</li>
                  <li>P95 inference: {results[p].p95InferenceMs.toFixed(1)}ms</li>
                  <li>Avg FPS: {results[p].avgFps.toFixed(1)}</li>
                  <li>Frames: {results[p].framesProcessed}</li>
                  <li>Dropped: {results[p].droppedFrames}</li>
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}
    </Screen>
  );
}
