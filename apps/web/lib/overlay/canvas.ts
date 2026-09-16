import type { RefObject } from "react";
import { coverMapping, projectPoint, type CoverMapping, type Landmark } from "@cft/core";

export const MIN_DRAW_VISIBILITY = 0.3;

export function visible(lm: Landmark | null | undefined): lm is Landmark {
  return !!lm && (lm.visibility ?? 1) >= MIN_DRAW_VISIBILITY;
}

export interface OverlayFrame {
  ctx: CanvasRenderingContext2D;
  w: number;
  h: number;
  dpr: number;
  toPx: (lm: Landmark) => { x: number; y: number };
}

/**
 * Size the canvas to its CSS box (device-pixel aware), clear it, and build the
 * normalized→pixel projection that matches the video's `object-fit: cover`
 * rendering so the skeleton lands on the body even when the video is cropped.
 */
export function prepareOverlayFrame(
  canvas: HTMLCanvasElement,
  video: HTMLVideoElement | null | undefined,
  mirror: boolean
): OverlayFrame | null {
  const rect = canvas.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return null;
  const dpr = window.devicePixelRatio || 1;
  const w = Math.round(rect.width * dpr);
  const h = Math.round(rect.height * dpr);
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.clearRect(0, 0, w, h);

  const mapping: CoverMapping = coverMapping(
    video?.videoWidth ?? 0,
    video?.videoHeight ?? 0,
    w,
    h
  );
  const toPx = (lm: Landmark) => projectPoint(lm.x, lm.y, mapping, mirror);
  return { ctx, w, h, dpr, toPx };
}

export type VideoRef = RefObject<HTMLVideoElement | null>;
