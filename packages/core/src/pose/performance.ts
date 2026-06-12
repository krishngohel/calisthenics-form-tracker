export type PerformanceTier = "low" | "medium" | "high";

export interface PerformanceProfile {
  tier: PerformanceTier;
  detectFps: number;
  inputSize: number;
  minCutoff: number;
  beta: number;
  label: string;
}

export const PERFORMANCE_PROFILES: Record<PerformanceTier, PerformanceProfile> = {
  low: {
    tier: "low",
    detectFps: 20,
    inputSize: 192,
    minCutoff: 2.0,
    beta: 0.04,
    label: "Low-end device (20fps detect)",
  },
  medium: {
    tier: "medium",
    detectFps: 30,
    inputSize: 256,
    minCutoff: 2.5,
    beta: 0.06,
    label: "Standard (30fps detect)",
  },
  high: {
    tier: "high",
    detectFps: 45,
    inputSize: 320,
    minCutoff: 3.0,
    beta: 0.1,
    label: "High-end (45fps detect)",
  },
};

/** Overlay skeleton uses lighter smoothing so movement feels immediate. */
export const OVERLAY_SMOOTHING: Record<PerformanceTier, { minCutoff: number; beta: number }> = {
  low: { minCutoff: 3.5, beta: 0.12 },
  medium: { minCutoff: 4.0, beta: 0.15 },
  high: { minCutoff: 5.0, beta: 0.2 },
};

/** Hold timer / form scoring keeps a bit more stability than the overlay. */
export const HOLD_SMOOTHING: Record<PerformanceTier, { minCutoff: number; beta: number }> = {
  low: { minCutoff: 1.4, beta: 0.02 },
  medium: { minCutoff: 1.6, beta: 0.025 },
  high: { minCutoff: 1.8, beta: 0.03 },
};

export function detectPerformanceTier(): PerformanceTier {
  if (typeof navigator === "undefined") return "medium";
  const cores = navigator.hardwareConcurrency ?? 4;
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 4;
  if (cores >= 8 && memory >= 8) return "high";
  if (cores >= 4 && memory >= 4) return "medium";
  return "low";
}

export function computeJitterScore(
  history: { x: number; y: number }[][]
): number {
  if (history.length < 3) return 0;
  let total = 0;
  let count = 0;
  for (let i = 1; i < history.length; i++) {
    const prev = history[i - 1];
    const curr = history[i];
    const n = Math.min(prev.length, curr.length);
    for (let j = 0; j < n; j++) {
      total += Math.hypot(curr[j].x - prev[j].x, curr[j].y - prev[j].y);
      count++;
    }
  }
  return count > 0 ? total / count : 0;
}
