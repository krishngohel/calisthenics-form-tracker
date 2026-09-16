"use client";

import { useEffect, useRef } from "react";
import type { HandLandmarks, Landmark } from "@cft/core";
import { HAND_CONNECTIONS, HAND_TIP_INDICES, SKELETON_CONNECTIONS } from "@cft/core";
import { prepareOverlayFrame, visible, type VideoRef } from "@/lib/overlay/canvas";

export type SkeletonStatus = "idle" | "qualifying" | "holding" | "dropped" | "lowvis";

interface PoseOverlayProps {
  /** Returns the latest interpolated landmarks; called once per animation frame. */
  getLandmarks: () => Record<string, Landmark | null> | null;
  getHands?: () => HandLandmarks | null;
  /** Colours the skeleton by hold state; called once per animation frame. */
  getStatus?: () => SkeletonStatus;
  /** The video the overlay sits on — needed to match its object-fit cropping. */
  videoRef?: VideoRef;
  mirror?: boolean;
  opacity?: number;
}

const STATUS_COLORS: Record<SkeletonStatus, { line: string; joint: string }> = {
  idle: { line: "#5eead4", joint: "#14b8a6" },
  qualifying: { line: "#fcd34d", joint: "#f59e0b" },
  holding: { line: "#34d399", joint: "#10b981" },
  dropped: { line: "#fb7185", joint: "#e11d48" },
  lowvis: { line: "#fda4af", joint: "#f43f5e" },
};

/**
 * Self-driving canvas overlay: runs its own rAF loop and draws imperatively,
 * so the 60fps skeleton never triggers React re-renders. Lines carry a dark
 * halo so they read on bright walls and dark floors alike.
 */
export function PoseOverlay({
  getLandmarks,
  getHands,
  getStatus,
  videoRef,
  mirror = true,
  opacity = 0.95,
}: PoseOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const getLandmarksRef = useRef(getLandmarks);
  const getHandsRef = useRef(getHands);
  const getStatusRef = useRef(getStatus);
  const videoRefRef = useRef(videoRef);
  const opacityRef = useRef(opacity);
  const mirrorRef = useRef(mirror);
  useEffect(() => {
    getLandmarksRef.current = getLandmarks;
    getHandsRef.current = getHands;
    getStatusRef.current = getStatus;
    videoRefRef.current = videoRef;
    opacityRef.current = opacity;
    mirrorRef.current = mirror;
  });

  useEffect(() => {
    let raf = 0;

    const strokeSkeleton = (
      ctx: CanvasRenderingContext2D,
      landmarks: Record<string, Landmark | null>,
      toPx: (lm: Landmark) => { x: number; y: number }
    ) => {
      ctx.beginPath();
      for (const [a, b] of SKELETON_CONNECTIONS) {
        const la = landmarks[a];
        const lb = landmarks[b];
        if (!visible(la) || !visible(lb)) continue;
        const pa = toPx(la);
        const pb = toPx(lb);
        ctx.moveTo(pa.x, pa.y);
        ctx.lineTo(pb.x, pb.y);
      }
      ctx.stroke();
    };

    const drawHand = (
      ctx: CanvasRenderingContext2D,
      points: Landmark[],
      bodyWrist: Landmark | null,
      toPx: (lm: Landmark) => { x: number; y: number },
      dpr: number,
      colors: { line: string; joint: string }
    ) => {
      if (points.length < 21) return;
      ctx.strokeStyle = colors.line;
      ctx.lineWidth = 2.5 * dpr;
      ctx.beginPath();
      if (visible(bodyWrist) && visible(points[0])) {
        const wrist = toPx(bodyWrist);
        const handWrist = toPx(points[0]);
        ctx.moveTo(wrist.x, wrist.y);
        ctx.lineTo(handWrist.x, handWrist.y);
      }
      for (const [a, b] of HAND_CONNECTIONS) {
        const la = points[a];
        const lb = points[b];
        if (!visible(la) || !visible(lb)) continue;
        const pa = toPx(la);
        const pb = toPx(lb);
        ctx.moveTo(pa.x, pa.y);
        ctx.lineTo(pb.x, pb.y);
      }
      ctx.stroke();

      ctx.fillStyle = colors.joint;
      for (const index of HAND_TIP_INDICES) {
        const tip = points[index];
        if (!visible(tip)) continue;
        const p = toPx(tip);
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4.5 * dpr, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const draw = () => {
      raf = requestAnimationFrame(draw);
      const canvas = canvasRef.current;
      if (!canvas) return;
      const frame = prepareOverlayFrame(canvas, videoRefRef.current?.current, mirrorRef.current);
      if (!frame) return;
      const { ctx, dpr, toPx } = frame;

      const landmarks = getLandmarksRef.current();
      if (!landmarks) return;
      const status = getStatusRef.current?.() ?? "idle";
      const colors = STATUS_COLORS[status];

      ctx.globalAlpha = opacityRef.current;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      // Dark halo under the lines for contrast on any background.
      ctx.strokeStyle = "rgba(0,0,0,0.55)";
      ctx.lineWidth = 7 * dpr;
      strokeSkeleton(ctx, landmarks, toPx);

      ctx.strokeStyle = colors.line;
      ctx.lineWidth = 3.5 * dpr;
      if (status === "lowvis") ctx.setLineDash([6 * dpr, 6 * dpr]);
      strokeSkeleton(ctx, landmarks, toPx);
      ctx.setLineDash([]);

      for (const lm of Object.values(landmarks)) {
        if (!visible(lm)) continue;
        const p = toPx(lm);
        ctx.beginPath();
        ctx.arc(p.x, p.y, 5 * dpr, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(0,0,0,0.6)";
        ctx.fill();
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3.5 * dpr, 0, Math.PI * 2);
        ctx.fillStyle = colors.joint;
        ctx.fill();
      }

      const hands = getHandsRef.current?.();
      if (hands) {
        if (hands.left) drawHand(ctx, hands.left, landmarks.leftWrist ?? null, toPx, dpr, colors);
        if (hands.right) drawHand(ctx, hands.right, landmarks.rightWrist ?? null, toPx, dpr, colors);
      }

      ctx.globalAlpha = 1;
    };

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none absolute inset-0 h-full w-full"
    />
  );
}
