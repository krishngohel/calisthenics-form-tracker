export type HoldMode = "hold_only" | "perfect";

/** UI training mode — learn shows target pose + correction arrows. */
export type TrainMode = "learn" | HoldMode;

export type HoldState = "idle" | "qualifying" | "holding" | "dropped";

export interface HoldMachineConfig {
  /** Ms criteria must hold before timer starts (0 = instant). */
  qualifyingMs: number;
  /** Ms grace after criteria lost before stop (0 = instant). */
  dropGraceMs: number;
  resetDelayMs: number;
  mode: HoldMode;
}

export interface HoldMachineResult {
  state: HoldState;
  elapsedMs: number;
  holdStartTime: number | null;
  lastHoldMs: number;
  criteriaMet: boolean;
}

/**
 * Short qualify / grace windows absorb single-frame pose glitches without
 * costing any measured time: the hold start is backdated to the first
 * qualifying frame and the hold end is the frame criteria were first lost.
 */
export const DEFAULT_HOLD_CONFIG: HoldMachineConfig = {
  qualifyingMs: 120,
  dropGraceMs: 200,
  resetDelayMs: 800,
  mode: "hold_only",
};

export class HoldStateMachine {
  private state: HoldState = "idle";
  private qualifyingStart: number | null = null;
  private holdStart: number | null = null;
  private dropStart: number | null = null;
  private lastHoldMs = 0;
  private criteriaLostAt: number | null = null;

  constructor(private config: HoldMachineConfig = DEFAULT_HOLD_CONFIG) {}

  setMode(mode: HoldMode): void {
    this.config = { ...this.config, mode };
  }

  setConfig(config: Partial<HoldMachineConfig>): void {
    this.config = { ...this.config, ...config };
  }

  tick(criteriaMet: boolean, now: number): HoldMachineResult {
    const { qualifyingMs, dropGraceMs } = this.config;

    if (this.state === "idle") {
      if (criteriaMet) {
        if (qualifyingMs <= 0) {
          this.state = "holding";
          this.holdStart = now;
          this.criteriaLostAt = null;
        } else {
          this.state = "qualifying";
          this.qualifyingStart = now;
        }
      }
    } else if (this.state === "qualifying") {
      if (!criteriaMet) {
        this.state = "idle";
        this.qualifyingStart = null;
      } else if (
        this.qualifyingStart !== null &&
        now - this.qualifyingStart >= qualifyingMs
      ) {
        this.state = "holding";
        this.holdStart = this.qualifyingStart;
        this.criteriaLostAt = null;
      }
    } else if (this.state === "holding") {
      if (!criteriaMet) {
        if (dropGraceMs <= 0) {
          this.state = "dropped";
          this.lastHoldMs =
            this.holdStart !== null
              ? Math.max(0, now - this.holdStart)
              : 0;
          this.dropStart = now;
          this.holdStart = null;
          this.criteriaLostAt = null;
        } else if (this.criteriaLostAt === null) {
          this.criteriaLostAt = now;
        } else if (now - this.criteriaLostAt >= dropGraceMs) {
          this.state = "dropped";
          this.lastHoldMs =
            this.holdStart !== null
              ? Math.max(0, this.criteriaLostAt - this.holdStart)
              : 0;
          this.dropStart = now;
          this.holdStart = null;
          this.criteriaLostAt = null;
        }
      } else {
        this.criteriaLostAt = null;
      }
    } else if (this.state === "dropped") {
      if (this.dropStart !== null && now - this.dropStart >= this.config.resetDelayMs) {
        this.state = "idle";
        this.dropStart = null;
        this.qualifyingStart = null;
      }
    }

    const elapsedMs =
      this.state === "holding" && this.holdStart !== null
        ? now - this.holdStart
        : 0;

    return {
      state: this.state,
      elapsedMs,
      holdStartTime: this.holdStart,
      lastHoldMs: this.lastHoldMs,
      criteriaMet,
    };
  }

  reset(): void {
    this.state = "idle";
    this.qualifyingStart = null;
    this.holdStart = null;
    this.dropStart = null;
    this.lastHoldMs = 0;
    this.criteriaLostAt = null;
  }
}
