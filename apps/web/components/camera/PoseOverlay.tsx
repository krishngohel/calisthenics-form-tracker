"use client";

import { useEffect, useRef } from "react";
import type { HandLandmarks, Landmark } from "@cft/core";
import { HAND_CONNECTIONS, HAND_TIP_INDICES, SKELETON_CONNECTIONS } from "@cft/core";

interface PoseOverlayProps {
  /** Returns the latest interpolated landmarks; called once per animation frame. */
  getLandmarks: () => Record<string, Landmark | null> | null;
  getHands?: () => HandLandmarks | null;
  mirror?: boolean;
  opacity?: number;
}

const MIN_DRAW_VISIBILITY = 0.3;

function visible(lm: Landmark | null | undefined): lm is Landmark {
  return !!lm && (lm.visibility ?? 1) >= MIN_DRAW_VISIBILITY;
}

/**
 * Self-driving canvas overlay: runs its own rAF loop and draws imperatively,
 * so the 60fps skeleton never triggers React re-renders.
 */
export function PoseOverlay({
  getLandmarks,
  getHands,
  mirror = true,
  opacity = 0.85,
}: PoseOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const getLandmarksRef = useRef(getLandmarks);
  const getHandsRef = useRef(getHands);
  const opacityRef = useRef(opacity);
  const mirrorRef = useRef(mirror);
  useEffect(() => {
    getLandmarksRef.current = getLandmarks;
    getHandsRef.current = getHands;
    opacityRef.current = opacity;
    mirrorRef.current = mirror;
  });

  useEffect(() => {
    let raf = 0;

    const drawHand = (
      ctx: CanvasRenderingContext2D,
      points: Landmark[],
      bodyWrist: Landmark | null,
      toPx: (lm: Landmark) => { x: number; y: number },
      dpr: number
    ) => {
      if (points.length < 21) return;

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

      ctx.fillStyle = "#0ea57a";
      for (const index of HAND_TIP_INDICES) {
        const tip = points[index];
        if (!visible(tip)) continue;
        const p = toPx(tip);
        ctx.beginPath();
        ctx.arc(p.x, p.y, 5 * dpr, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle = "#14866a";
      for (const point of points) {
        if (!visible(point)) continue;
        const p = toPx(point);
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3 * dpr, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const draw = () => {
      raf = requestAnimationFrame(draw);
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      const dpr = window.devicePixelRatio || 1;
      const w = Math.round(rect.width * dpr);
      const h = Math.round(rect.height * dpr);
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }

      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.clearRect(0, 0, w, h);

      const landmarks = getLandmarksRef.current();
      if (!landmarks) return;

      const useMirror = mirrorRef.current;
      const toPx = (lm: Landmark) => ({
        x: (useMirror ? 1 - lm.x : lm.x) * w,
        y: lm.y * h,
      });

      ctx.globalAlpha = opacityRef.current;
      ctx.strokeStyle = "#22d3a7";
      ctx.lineWidth = 3 * dpr;
      ctx.lineCap = "round";

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

      ctx.fillStyle = "#14866a";
      for (const lm of Object.values(landmarks)) {
        if (!visible(lm)) continue;
        const p = toPx(lm);
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4 * dpr, 0, Math.PI * 2);
        ctx.fill();
      }

      const hands = getHandsRef.current?.();
      if (hands) {
        ctx.strokeStyle = "#34d399";
        ctx.lineWidth = 2.5 * dpr;
        if (hands.left) {
          drawHand(ctx, hands.left, landmarks.leftWrist ?? null, toPx, dpr);
        }
        if (hands.right) {
          drawHand(ctx, hands.right, landmarks.rightWrist ?? null, toPx, dpr);
        }
      }

      ctx.globalAlpha = 1;
    };

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 h-full w-full"
    />
  );
}
