"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import type { HoldView } from "./useHoldSession";
import { isNativePlatform } from "@/lib/native";
import { formatMs } from "@/lib/format";

export interface HoldClip {
  blob: Blob;
  mimeType: string;
  durationMs: number;
  skillName: string;
  endedAt: Date;
}

export type ClipSaveState = "idle" | "saving" | "saved" | "error";

interface RecorderOptions {
  videoRef: RefObject<HTMLVideoElement | null>;
  holdView: HoldView;
  skillName: string;
  /** Recording only happens while the session is armed. */
  enabled: boolean;
}

/** Longest edge of the recorded frame. */
const MAX_EDGE = 1280;
/** Keep rolling this long after the drop so the end of the hold is in the clip. */
const TAIL_MS = 800;
const FPS = 30;

function pickMimeType(): string | null {
  if (typeof MediaRecorder === "undefined") return null;
  for (const t of ["video/mp4;codecs=avc1", "video/mp4", "video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"]) {
    if (MediaRecorder.isTypeSupported(t)) return t;
  }
  return null;
}

/**
 * Records each hold as a video with a small timer overlay. Frames are drawn
 * to an offscreen canvas (camera frame + timer) and captured with
 * MediaRecorder; recording starts when the hold qualifies and stops just
 * after the drop. The latest clip is kept until the next hold starts.
 */
export function useHoldRecorder({ videoRef, holdView, skillName, enabled }: RecorderOptions) {
  const [clip, setClip] = useState<HoldClip | null>(null);
  const [saveState, setSaveState] = useState<ClipSaveState>("idle");
  const [supported] = useState(() => pickMimeType() !== null);

  const viewRef = useRef(holdView);
  viewRef.current = holdView;
  const skillNameRef = useRef(skillName);
  skillNameRef.current = skillName;

  const recorderRef = useRef<MediaRecorder | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef(0);
  const chunksRef = useRef<Blob[]>([]);
  const stopTimerRef = useRef<number | null>(null);
  const activeRef = useRef(false);

  const drawFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const view = viewRef.current;
    const elapsed =
      view.state === "holding" && view.holdStartTime !== null
        ? performance.now() - view.holdStartTime
        : view.state === "dropped"
          ? view.lastHoldMs
          : 0;
    const scale = canvas.height / 720;
    const pad = 16 * scale;
    const label = skillNameRef.current;
    const timer = formatMs(elapsed);
    ctx.font = `bold ${34 * scale}px -apple-system, system-ui, sans-serif`;
    const timerW = ctx.measureText(timer).width;
    ctx.font = `${16 * scale}px -apple-system, system-ui, sans-serif`;
    const labelW = ctx.measureText(label).width;
    const boxW = Math.max(timerW, labelW) + pad * 2;
    const boxH = 68 * scale;
    const x = pad;
    const y = canvas.height - boxH - pad;
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.beginPath();
    ctx.roundRect(x, y, boxW, boxH, 12 * scale);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.8)";
    ctx.fillText(label, x + pad, y + 22 * scale);
    ctx.fillStyle = view.state === "holding" ? "#6ee7b7" : "#ffffff";
    ctx.font = `bold ${34 * scale}px -apple-system, system-ui, sans-serif`;
    ctx.fillText(timer, x + pad, y + 56 * scale);
  }, [videoRef]);

  const stop = useCallback(() => {
    if (!activeRef.current) return;
    activeRef.current = false;
    cancelAnimationFrame(rafRef.current);
    recorderRef.current?.state !== "inactive" && recorderRef.current?.stop();
  }, []);

  const start = useCallback(() => {
    const video = videoRef.current;
    const mimeType = pickMimeType();
    if (!video || !mimeType || activeRef.current || !video.videoWidth) return;
    const scale = Math.min(1, MAX_EDGE / Math.max(video.videoWidth, video.videoHeight));
    const canvas = canvasRef.current ?? document.createElement("canvas");
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    canvasRef.current = canvas;

    let recorder: MediaRecorder;
    try {
      recorder = new MediaRecorder(canvas.captureStream(FPS), { mimeType, videoBitsPerSecond: 4_000_000 });
    } catch {
      return;
    }
    chunksRef.current = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mimeType });
      if (blob.size > 0) {
        setClip({ blob, mimeType, durationMs: viewRef.current.lastHoldMs, skillName: skillNameRef.current, endedAt: new Date() });
        setSaveState("idle");
      }
    };
    recorderRef.current = recorder;
    activeRef.current = true;
    setClip(null);
    recorder.start(250);
    const loop = () => {
      if (!activeRef.current) return;
      drawFrame();
      rafRef.current = requestAnimationFrame(loop);
    };
    loop();
  }, [videoRef, drawFrame]);

  // Start on qualifying/holding, stop shortly after the drop.
  useEffect(() => {
    if (!enabled || !supported) return;
    const state = holdView.state;
    if ((state === "qualifying" || state === "holding") && !activeRef.current) {
      if (stopTimerRef.current !== null) {
        window.clearTimeout(stopTimerRef.current);
        stopTimerRef.current = null;
      }
      start();
    } else if (state === "dropped" && activeRef.current && stopTimerRef.current === null) {
      stopTimerRef.current = window.setTimeout(() => {
        stopTimerRef.current = null;
        stop();
      }, TAIL_MS);
    } else if (state === "idle" && activeRef.current && stopTimerRef.current === null) {
      // Qualifying fell through: discard.
      chunksRef.current = [];
      stop();
    }
  }, [holdView.state, enabled, supported, start, stop]);

  useEffect(() => {
    return () => {
      if (stopTimerRef.current !== null) window.clearTimeout(stopTimerRef.current);
      stop();
    };
  }, [stop]);

  const save = useCallback(async () => {
    if (!clip) return;
    setSaveState("saving");
    const ext = clip.mimeType.includes("mp4") ? "mp4" : "webm";
    const stamp = clip.endedAt.toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const name = `CFT-${clip.skillName.replace(/[^a-z0-9]+/gi, "-")}-${stamp}.${ext}`;
    try {
      if (isNativePlatform()) {
        const [{ Filesystem, Directory }, { Share }] = await Promise.all([import("@capacitor/filesystem"), import("@capacitor/share")]);
        const base64 = await blobToBase64(clip.blob);
        const written = await Filesystem.writeFile({ path: name, data: base64, directory: Directory.Cache });
        await Share.share({ title: `${clip.skillName} ${formatMs(clip.durationMs)}`, files: [written.uri] });
      } else {
        const url = URL.createObjectURL(clip.blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = name;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
      }
      setSaveState("saved");
    } catch (err) {
      // A dismissed share sheet rejects too; treat as not saved, not an error to shout about.
      setSaveState(err instanceof Error && /cancel/i.test(err.message) ? "idle" : "error");
    }
  }, [clip]);

  const discard = useCallback(() => setClip(null), []);

  return { clip, save, saveState, discard, supported };
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}
