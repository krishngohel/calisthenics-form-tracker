/**
 * Maps normalized landmark coordinates (0–1 in the *video frame*) onto a
 * canvas that displays the video with CSS `object-fit: cover`. When the video
 * and container aspect ratios differ, the video is scaled to fill and cropped
 * on one axis — an overlay that ignores this draws the skeleton off the body.
 */
export interface CoverMapping {
  /** Rendered video width/height in canvas pixels (may exceed the canvas). */
  drawWidth: number;
  drawHeight: number;
  /** Offset of the rendered video's top-left corner (≤ 0 on the cropped axis). */
  offsetX: number;
  offsetY: number;
}

export function coverMapping(
  videoWidth: number,
  videoHeight: number,
  boxWidth: number,
  boxHeight: number
): CoverMapping {
  if (videoWidth <= 0 || videoHeight <= 0 || boxWidth <= 0 || boxHeight <= 0) {
    return { drawWidth: boxWidth, drawHeight: boxHeight, offsetX: 0, offsetY: 0 };
  }
  const scale = Math.max(boxWidth / videoWidth, boxHeight / videoHeight);
  const drawWidth = videoWidth * scale;
  const drawHeight = videoHeight * scale;
  return {
    drawWidth,
    drawHeight,
    offsetX: (boxWidth - drawWidth) / 2,
    offsetY: (boxHeight - drawHeight) / 2,
  };
}

/** Project a normalized point through a cover mapping, optionally mirrored. */
export function projectPoint(
  x: number,
  y: number,
  mapping: CoverMapping,
  mirror: boolean
): { x: number; y: number } {
  const nx = mirror ? 1 - x : x;
  return {
    x: mapping.offsetX + nx * mapping.drawWidth,
    y: mapping.offsetY + y * mapping.drawHeight,
  };
}
