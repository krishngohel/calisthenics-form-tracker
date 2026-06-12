export * from "./pose/provider";
export * from "./pose/geometry";
export * from "./pose/distance";
export * from "./pose/hands";
export * from "./pose/smoothing";
export * from "./pose/interpolation";
export * from "./hold/stateMachine";
export * from "./skills/registry";
export * from "./skills/autoDetect";
export * from "./scoring/formScore";
export * from "./coaching/progressions";
export * from "./coaching/planGenerator";

export {
  PERFORMANCE_PROFILES,
  OVERLAY_SMOOTHING,
  HOLD_SMOOTHING,
  detectPerformanceTier,
  computeJitterScore,
  type PerformanceTier,
  type PerformanceProfile,
} from "./pose/performance";
