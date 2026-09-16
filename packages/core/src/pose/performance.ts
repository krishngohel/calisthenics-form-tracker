export type PerformanceTier = "low" | "medium" | "high";

export interface PerformanceProfile {
  tier: PerformanceTier;
  /** Target pose inference rate; the overlay always renders at display rate. */
  detectFps: number;
  label: string;
}

export const PERFORMANCE_PROFILES: Record<PerformanceTier, PerformanceProfile> = {
  low: { tier: "low", detectFps: 20, label: "Low-end device (20fps detect)" },
  medium: { tier: "medium", detectFps: 30, label: "Standard (30fps detect)" },
  high: { tier: "high", detectFps: 45, label: "High-end (45fps detect)" },
};

export interface SmoothingTuning {
  minCutoff: number;
  beta: number;
}

/** Overlay skeleton uses lighter smoothing so movement feels immediate. */
export const OVERLAY_SMOOTHING: Record<PerformanceTier, SmoothingTuning> = {
  low: { minCutoff: 3.5, beta: 0.12 },
  medium: { minCutoff: 4.0, beta: 0.15 },
  high: { minCutoff: 5.0, beta: 0.2 },
};

/** Hold timer / form scoring keeps a bit more stability than the overlay. */
export const HOLD_SMOOTHING: Record<PerformanceTier, SmoothingTuning> = {
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
