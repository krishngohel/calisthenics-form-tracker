"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  HoldMetricsAccumulator,
  HoldStateMachine,
  generateCoachingPlan,
  type CoachingPlan,
  type FormMetric,
  type HoldMode,
  type HoldState,
  type SkillEvaluation,
} from "@cft/core";
import { useAuthUser } from "./useAuthUser";
import { usePersistentCues } from "./usePersistentCues";
import { useSessionProgress } from "./useSessionProgress";
import { useSmoothedFormScore } from "./useSmoothedFormScore";
import { saveCoachingPlan, saveHoldSession } from "@/lib/supabase/sessions";
import { appendHold } from "@/lib/localHistory";

export interface HoldView {
  state: HoldState;
  holdStartTime: number | null;
  lastHoldMs: number;
  formScore: number;
  liveCues: string[];
  visibilityOk: boolean;
  farCamera: boolean;
}

export const INITIAL_HOLD_VIEW: HoldView = {
  state: "idle",
  holdStartTime: null,
  lastHoldMs: 0,
  formScore: 0,
  liveCues: [],
  visibilityOk: true,
  farCamera: false,
};

export interface CompletedHold {
  skillId: string;
  mode: HoldMode;
  durationMs: number;
  /** Mean form score across the whole hold. */
  formScore: number;
  metrics: FormMetric[];
  endedAt: Date;
}

export type SaveState =
  | { status: "idle" }
  | { status: "saving" }
  | { status: "saved" }
  /** Completed but not persisted — signed out or Supabase not configured. */
  | { status: "local" }
  | { status: "error"; message: string };

/** Ignore accidental blips shorter than this when recording holds. */
const MIN_RECORDED_HOLD_MS = 500;
/** Learn-mode checklist re-renders at most this often unless a pass/fail flips. */
const LEARN_METRICS_INTERVAL_MS = 300;
/** Rule telemetry cadence: one line per second in the console (readable from the native log). */
const RULE_LOG_INTERVAL_MS = 1000;

function logRules(skillId: string, evaluation: SkillEvaluation, state: string) {
  const m = evaluation.measures;
  const metrics = evaluation.metrics.map((x) => `${x.id}=${x.score}${x.passed ? "✓" : "✗"}`).join(" ");
  console.log(
    `[rules] ${skillId} state=${state} hold=${evaluation.holdCriteriaMet} perfect=${evaluation.perfectCriteriaMet} form=${evaluation.formScore} vis=${evaluation.visibilityOk} | ${metrics} | ` +
      (m ? `T=${m.T} elbow=${m.elbow} knee=${m.knee} hip=${m.hip} line=${m.bodyLine} horiz=${m.horizontal} hang=${m.hangDepth} lean=${m.lean} inv=${m.inverted} support=${m.support} visAvg=${m.visibility}` : "")
  );
}

function sameView(a: HoldView, b: HoldView): boolean {
  return (
    a.state === b.state &&
    a.holdStartTime === b.holdStartTime &&
    a.lastHoldMs === b.lastHoldMs &&
    a.formScore === b.formScore &&
    a.visibilityOk === b.visibilityOk &&
    a.farCamera === b.farCamera &&
    a.liveCues.length === b.liveCues.length &&
    a.liveCues.every((cue, i) => cue === b.liveCues[i])
  );
}

/**
 * Everything downstream of a skill evaluation: the hold state machine,
 * whole-hold metric aggregation, smoothed form score, pinned cues, the live
 * progress chart, coaching plans, and persistence of completed holds.
 *
 * Pages call `processHold` (or `processLearn`) once per detection frame; all
 * per-frame work stays in refs so React only re-renders on visible changes.
 */
export function useHoldSession(mode: HoldMode) {
  const { user, configured } = useAuthUser();
  const userRef = useRef(user);
  useEffect(() => {
    userRef.current = user;
  }, [user]);
  const modeRef = useRef(mode);
  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  const machineRef = useRef(new HoldStateMachine());
  const accumulatorRef = useRef(new HoldMetricsAccumulator());
  const viewRef = useRef<HoldView>(INITIAL_HOLD_VIEW);
  const [holdView, setHoldView] = useState<HoldView>(INITIAL_HOLD_VIEW);

  const learnMetricsRef = useRef<FormMetric[]>([]);
  const ruleLogAtRef = useRef(0);
  const [liveMetrics, setLiveMetrics] = useState<FormMetric[]>([]);
  const liveMetricsAtRef = useRef(0);
  const learnSignatureRef = useRef("");
  const learnUpdatedAtRef = useRef(0);
  const [learnMetrics, setLearnMetrics] = useState<FormMetric[]>([]);

  const [bestHoldMs, setBestHoldMs] = useState(0);
  const [lastHold, setLastHold] = useState<CompletedHold | null>(null);
  const [coachingPlan, setCoachingPlan] = useState<CoachingPlan | null>(null);
  const [saveState, setSaveState] = useState<SaveState>({ status: "idle" });

  const { process: processFormScore, reset: resetFormScore } = useSmoothedFormScore();
  // Destructure the stable callbacks: the hook return objects are new each render.
  const {
    cues: pinnedCues,
    ingest: ingestCues,
    dismiss: dismissCue,
    dismissAll: dismissAllCues,
    reset: resetCues,
  } = usePersistentCues();
  const {
    points: progressPoints,
    record: recordProgress,
    reset: resetProgress,
  } = useSessionProgress();

  const publish = useCallback((next: HoldView) => {
    if (sameView(viewRef.current, next)) return;
    viewRef.current = next;
    setHoldView(next);
  }, []);

  const completeHold = useCallback(
    async (skillId: string, durationMs: number) => {
      const summary = accumulatorRef.current.summarize();
      accumulatorRef.current.reset();
      const holdMode = modeRef.current;
      const completed: CompletedHold = {
        skillId,
        mode: holdMode,
        durationMs,
        formScore: summary.formScore,
        metrics: summary.metrics,
        endedAt: new Date(),
      };
      const plan = generateCoachingPlan(skillId, summary.metrics);
      appendHold({
        skillId,
        mode: holdMode,
        durationMs: Math.round(durationMs),
        formScore: summary.formScore,
        endedAt: completed.endedAt.toISOString(),
      });
      setLastHold(completed);
      setCoachingPlan(plan);
      setBestHoldMs((b) => Math.max(b, durationMs));

      const currentUser = userRef.current;
      if (!configured || !currentUser) {
        setSaveState({ status: "local" });
        return;
      }
      setSaveState({ status: "saving" });
      try {
        await saveHoldSession({
          userId: currentUser.id,
          skillId,
          mode: holdMode,
          durationMs,
          formScore: summary.formScore,
          metrics: summary.metrics,
          endedAt: completed.endedAt,
        });
        await saveCoachingPlan(currentUser.id, plan);
        setSaveState({ status: "saved" });
      } catch (err) {
        setSaveState({
          status: "error",
          message: err instanceof Error ? err.message : "Could not save session",
        });
      }
    },
    [configured]
  );

  /** Feed one evaluation frame in hold-only / perfect mode. */
  const processHold = useCallback(
    (skillId: string, evaluation: SkillEvaluation, now: number) => {
      const holdMode = modeRef.current;
      const criteriaMet =
        holdMode === "perfect" ? evaluation.perfectCriteriaMet : evaluation.holdCriteriaMet;

      const machine = machineRef.current;
      machine.setMode(holdMode);
      const result = machine.tick(criteriaMet, now);

      if (now - ruleLogAtRef.current >= RULE_LOG_INTERVAL_MS) {
        ruleLogAtRef.current = now;
        logRules(skillId, evaluation, result.state);
      }
      if (now - liveMetricsAtRef.current >= LEARN_METRICS_INTERVAL_MS) {
        liveMetricsAtRef.current = now;
        setLiveMetrics(evaluation.metrics);
      }

      if (result.state === "holding" || result.state === "qualifying") {
        accumulatorRef.current.push(evaluation.formScore, evaluation.metrics);
      } else if (result.state === "idle" && accumulatorRef.current.frameCount > 0) {
        // Qualifying fell through — discard those frames.
        accumulatorRef.current.reset();
      }

      const next: HoldView = {
        state: result.state,
        holdStartTime: result.holdStartTime,
        lastHoldMs: result.lastHoldMs,
        formScore: processFormScore(evaluation.formScore, result.state, viewRef.current.formScore),
        liveCues: evaluation.liveCues,
        visibilityOk: evaluation.visibilityOk,
        farCamera: evaluation.farCamera ?? false,
      };

      const justDropped = result.state === "dropped" && viewRef.current.state !== "dropped";
      ingestCues(evaluation.liveCues);
      recordProgress(next.formScore, result.state);
      publish(next);

      if (justDropped) {
        if (result.lastHoldMs >= MIN_RECORDED_HOLD_MS) {
          void completeHold(skillId, result.lastHoldMs);
        } else {
          accumulatorRef.current.reset();
        }
      }
      return result;
    },
    [completeHold, ingestCues, recordProgress, processFormScore, publish]
  );

  /** Feed one evaluation frame in learn mode (no timer; checklist + arrows). */
  const processLearn = useCallback(
    (evaluation: SkillEvaluation, now: number) => {
      learnMetricsRef.current = evaluation.metrics;
      const signature = evaluation.metrics.map((m) => (m.passed ? "1" : "0")).join("");
      if (
        signature !== learnSignatureRef.current ||
        now - learnUpdatedAtRef.current >= LEARN_METRICS_INTERVAL_MS
      ) {
        learnSignatureRef.current = signature;
        learnUpdatedAtRef.current = now;
        setLearnMetrics(evaluation.metrics);
      }

      const next: HoldView = {
        ...INITIAL_HOLD_VIEW,
        formScore: processFormScore(evaluation.formScore, "idle", viewRef.current.formScore),
        liveCues: evaluation.liveCues,
        visibilityOk: evaluation.visibilityOk,
        farCamera: evaluation.farCamera ?? false,
      };
      ingestCues(evaluation.liveCues);
      publish(next);
    },
    [ingestCues, processFormScore, publish]
  );

  /** Latest learn-mode metrics without a render dependency (for canvas overlays). */
  const getLearnMetrics = useCallback(() => learnMetricsRef.current, []);

  /** Clear the in-progress hold and live state; keeps best / last hold. */
  const resetLive = useCallback(() => {
    machineRef.current.reset();
    accumulatorRef.current.reset();
    resetFormScore();
    resetCues();
    resetProgress();
    learnMetricsRef.current = [];
    learnSignatureRef.current = "";
    learnUpdatedAtRef.current = 0;
    setLearnMetrics([]);
    setLiveMetrics([]);
    viewRef.current = INITIAL_HOLD_VIEW;
    setHoldView(INITIAL_HOLD_VIEW);
  }, [resetCues, resetProgress, resetFormScore]);

  /** Full reset — new skill or new session. */
  const resetAll = useCallback(() => {
    resetLive();
    setBestHoldMs(0);
    setLastHold(null);
    setCoachingPlan(null);
    setSaveState({ status: "idle" });
  }, [resetLive]);

  return {
    holdView,
    learnMetrics,
    /** Latest metrics in hold modes (~3 Hz), for the details sheet. */
    liveMetrics,
    getLearnMetrics,
    bestHoldMs,
    lastHold,
    coachingPlan,
    saveState,
    signedIn: !!user,
    cloudConfigured: configured,
    pinnedCues,
    dismissCue,
    dismissAllCues,
    progressPoints,
    processHold,
    processLearn,
    resetLive,
    resetAll,
  };
}
