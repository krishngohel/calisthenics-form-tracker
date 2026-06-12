import type { HandLandmarks, Landmark } from "./provider";

/** MediaPipe hand landmark indices */
export const HAND_WRIST = 0;
export const HAND_THUMB_TIP = 4;
export const HAND_INDEX_TIP = 8;
export const HAND_MIDDLE_TIP = 12;
export const HAND_RING_TIP = 16;
export const HAND_PINKY_TIP = 20;

/** Skeleton connections for one hand (index pairs). */
export const HAND_CONNECTIONS: [number, number][] = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 4],
  [0, 5],
  [5, 6],
  [6, 7],
  [7, 8],
  [0, 9],
  [9, 10],
  [10, 11],
  [11, 12],
  [0, 13],
  [13, 14],
  [14, 15],
  [15, 16],
  [0, 17],
  [17, 18],
  [18, 19],
  [19, 20],
  [5, 9],
  [9, 13],
  [13, 17],
];

export const HAND_TIP_INDICES = [4, 8, 12, 16, 20];

export interface RenderHands {
  left: Landmark[] | null;
  right: Landmark[] | null;
}

export function normalizeHands(hands: HandLandmarks): RenderHands {
  return {
    left: hands.left,
    right: hands.right,
  };
}
