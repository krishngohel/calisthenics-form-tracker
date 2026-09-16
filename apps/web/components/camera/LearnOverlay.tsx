"use client";

import { useEffect, useRef } from "react";
import {
  SKELETON_CONNECTIONS,
  computeFormCorrections,
  getAlignedTargetPose,
  type FormMetric,
  type Landmark,
} from "@cft/core";
import { prepareOverlayFrame, visible, type VideoRef } from "@/lib/overlay/canvas";

interface LearnOverlayProps {
  skillId: string;
  getLandmarks: () => Record<string, Landmark | null> | null;
  getMetrics: () => FormMetric[] | null;
  videoRef?: VideoRef;
  mirror?: boolean;
}

/**
 * Learn mode overlay: ghost target pose fitted onto the athlete, plus
 * correction arrows from failing joints toward where they should be.
 */
export function LearnOverlay({
  skillId,
  getLandmarks,
  getMetrics,
  videoRef,
  mirror = true,
}: LearnOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const getLandmarksRef = useRef(getLandmarks);
  const getMetricsRef = useRef(getMetrics);
  const videoRefRef = useRef(videoRef);
  const mirrorRef = useRef(mirror);

  useEffect(() => {
    getLandmarksRef.current = getLandmarks;
    getMetricsRef.current = getMetrics;
    videoRefRef.current = videoRef;
    mirrorRef.current = mirror;
  });

  useEffect(() => {
    let raf = 0;

    const drawArrowHead = (
      ctx: CanvasRenderingContext2D,
      fromX: number,
      fromY: number,
      toX: number,
      toY: number,
      size: number
    ) => {
      const angle = Math.atan2(toY - fromY, toX - fromX);
      ctx.beginPath();
      ctx.moveTo(toX, toY);
      ctx.lineTo(
        toX - size * Math.cos(angle - Math.PI / 6),
        toY - size * Math.sin(angle - Math.PI / 6)
      );
      ctx.moveTo(toX, toY);
      ctx.lineTo(
        toX - size * Math.cos(angle + Math.PI / 6),
        toY - size * Math.sin(angle + Math.PI / 6)
      );
      ctx.stroke();
    };

    const draw = () => {
      raf = requestAnimationFrame(draw);
      const canvas = canvasRef.current;
      if (!canvas) return;
      const frame = prepareOverlayFrame(
        canvas,
        videoRefRef.current?.current,
        mirrorRef.current
      );
      if (!frame) return;
      const { ctx, dpr, toPx } = frame;

      const landmarks = getLandmarksRef.current();
      if (!landmarks) return;
      const targetPose = getAlignedTargetPose(skillId, landmarks);
      if (!targetPose) return;
      const metrics = getMetricsRef.current();

      // Ghost target skeleton
      ctx.setLineDash([8 * dpr, 6 * dpr]);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.45)";
      ctx.lineWidth = 2.5 * dpr;
      ctx.lineCap = "round";
      ctx.beginPath();
      for (const [a, b] of SKELETON_CONNECTIONS) {
        const ta = targetPose[a];
        const tb = targetPose[b];
        if (!ta || !tb) continue;
        const pa = toPx(ta);
        const pb = toPx(tb);
        ctx.moveTo(pa.x, pa.y);
        ctx.lineTo(pb.x, pb.y);
      }
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
      for (const lm of Object.values(targetPose)) {
        const p = toPx(lm);
        ctx.beginPath();
        ctx.arc(p.x, p.y, 5 * dpr, 0, Math.PI * 2);
        ctx.fill();
      }

      const noseTarget = targetPose.nose;
      if (noseTarget) {
        const p = toPx(noseTarget);
        ctx.font = `${11 * dpr}px system-ui, sans-serif`;
        ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
        ctx.fillText("TARGET", p.x + 10 * dpr, p.y - 8 * dpr);
      }

      if (!metrics) return;

      const corrections = computeFormCorrections(skillId, metrics, landmarks, targetPose);

      ctx.strokeStyle = "#fbbf24";
      ctx.fillStyle = "#fbbf24";
      ctx.lineWidth = 3 * dpr;

      for (const correction of corrections) {
        const cur = landmarks[correction.joint];
        if (!visible(cur)) continue;
        const from = toPx(cur);
        const to = toPx(correction.target);

        const dx = to.x - from.x;
        const dy = to.y - from.y;
        const len = Math.hypot(dx, dy);
        if (len < 6 * dpr) continue;

        const shorten = 10 * dpr;
        const endX = to.x - (dx / len) * shorten;
        const endY = to.y - (dy / len) * shorten;

        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(endX, endY);
        ctx.stroke();
        drawArrowHead(ctx, from.x, from.y, endX, endY, 10 * dpr);

        ctx.beginPath();
        ctx.arc(from.x, from.y, 7 * dpr, 0, Math.PI * 2);
        ctx.stroke();

        const midX = (from.x + endX) / 2;
        const midY = (from.y + endY) / 2;
        ctx.font = `bold ${10 * dpr}px system-ui, sans-serif`;
        const label = correction.label.length > 28
          ? `${correction.label.slice(0, 26)}…`
          : correction.label;
        const textW = ctx.measureText(label).width;
        ctx.fillStyle = "rgba(0, 0, 0, 0.65)";
        ctx.fillRect(
          midX - textW / 2 - 4 * dpr,
          midY - 14 * dpr,
          textW + 8 * dpr,
          16 * dpr
        );
        ctx.fillStyle = "#fbbf24";
        ctx.fillText(label, midX - textW / 2, midY);
      }
    };

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [skillId]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none absolute inset-0 h-full w-full"
    />
  );
}
