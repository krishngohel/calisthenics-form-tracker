"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  getSkill,
  getSkillPathStep,
  evaluateSkill,
  HoldStateMachine,
  generateCoachingPlan,
  type HoldMode,
  type TrainMode,
  type HoldState,
  type CoachingPlan,
  type FormMetric,
  type HandLandmarks,
  type Landmark,
} from "@cft/core";
import { TrainCameraPanel } from "@/components/camera/TrainCameraPanel";
import { useAutoBackCameraFraming } from "@/hooks/useAutoBackCameraFraming";
import { PoseOverlay } from "@/components/camera/PoseOverlay";
import { LearnOverlay } from "@/components/camera/LearnOverlay";
import { HoldTimer } from "@/components/timer/HoldTimer";
import { CoachingPanel } from "@/components/coaching/CoachingPanel";
import { LearnMetricsPanel } from "@/components/coaching/LearnMetricsPanel";
import { PersistentCueOverlay } from "@/components/coaching/PersistentCueOverlay";
import { SessionProgressChart } from "@/components/coaching/SessionProgressChart";
import {
  getStoredBodyProvider,
  usePoseDetection,
} from "@/hooks/usePoseDetection";
import { usePersistentCues } from "@/hooks/usePersistentCues";
import { useSessionProgress } from "@/hooks/useSessionProgress";
import { useSmoothedFormScore } from "@/hooks/useSmoothedFormScore";
import { saveHoldSession, saveCoachingPlan } from "@/lib/supabase/sessions";
import { createClient } from "@/lib/supabase/client";

interface HoldView {
  state: HoldState;
  holdStartTime: number | null;
  lastHoldMs: number;
  formScore: number;
  liveCues: string[];
  visibilityOk: boolean;
  farCamera: boolean;
}

const INITIAL_VIEW: HoldView = {
  state: "idle",
  holdStartTime: null,
  lastHoldMs: 0,
  formScore: 0,
  liveCues: [],
  visibilityOk: true,
  farCamera: false,
};

/** Ignore accidental blips shorter than this when saving sessions. */
const MIN_SAVED_HOLD_MS = 500;

export default function TrainPage() {
  const params = useParams();
  const skillId = params.skillId as string;
  const skill = getSkill(skillId);
  const pathStep = getSkillPathStep(skillId);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoReady, setVideoReady] = useState(false);
  const [mode, setMode] = useState<TrainMode>("learn");
  const [bodyProvider, setBodyProvider] = useState<"movenet" | "mediapipe">(
    "movenet"
  );

  useEffect(() => {
    setBodyProvider(getStoredBodyProvider());
  }, []);
  const [sessionEnded, setSessionEnded] = useState(false);
  const [coachingPlan, setCoachingPlan] = useState<CoachingPlan | null>(null);
  const [bestHoldMs, setBestHoldMs] = useState(0);
  const [holdView, setHoldView] = useState<HoldView>(INITIAL_VIEW);
  const {
    facingMode,
    deviceId,
    onFacingModeChange,
    onStreamReady,
    onDistanceContext,
    framingLabel,
    framingGuidance,
    isManualFraming,
    enableAutoFraming,
  } = useAutoBackCameraFraming();
  const mirrored = facingMode === "user";

  const sessionEndedRef = useRef(false);
  const historyRef = useRef<Record<string, Landmark | null>[]>([]);
  const holdMachineRef = useRef(new HoldStateMachine());
  const prevViewRef = useRef<HoldView>(INITIAL_VIEW);
  const metricsRef = useRef<FormMetric[]>([]);
  const [learnMetrics, setLearnMetrics] = useState<FormMetric[]>([]);
  const { process: processFormScore, reset: resetFormScore } =
    useSmoothedFormScore();
  const sessionFormScoreRef = useRef(0);
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

  const holdMode: HoldMode = mode === "learn" ? "hold_only" : mode;

  const handleSessionEnd = useCallback(
    async (durationMs: number, formScore: number, metrics: FormMetric[]) => {
      if (sessionEndedRef.current || mode === "learn") return;
      sessionEndedRef.current = true;
      const plan = generateCoachingPlan(skillId, metrics);
      setCoachingPlan(plan);
      setSessionEnded(true);
      setBestHoldMs((b) => Math.max(b, durationMs));

      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        await saveHoldSession({
          userId: user.id,
          skillId,
          mode: holdMode,
          durationMs,
          formScore,
          metrics,
        });
        await saveCoachingPlan(user.id, plan);
      }
    },
    [skillId, mode, holdMode]
  );

  const onFrame = useCallback(
    (body: Record<string, Landmark | null>, hands: HandLandmarks) => {
      if (!skill) return;
      historyRef.current.push(body);
      if (historyRef.current.length > 30) historyRef.current.shift();

      const evalMode: HoldMode = mode === "learn" ? "perfect" : mode;
      const evaluation = evaluateSkill(
        skillId,
        body,
        hands,
        historyRef.current,
        evalMode
      );
      if (!evaluation) return;

      metricsRef.current = evaluation.metrics;
      if (mode === "learn") {
        setLearnMetrics(evaluation.metrics);
      }

      if (mode === "learn") {
        const next: HoldView = {
          state: "idle",
          holdStartTime: null,
          lastHoldMs: 0,
          formScore: processFormScore(
            evaluation.formScore,
            "idle",
            prevViewRef.current.formScore
          ),
          liveCues: evaluation.liveCues,
          visibilityOk: evaluation.visibilityOk,
          farCamera: evaluation.farCamera ?? false,
        };

        ingestCues(evaluation.liveCues);
        recordProgress(next.formScore, "idle");

        const prev = prevViewRef.current;
        const changed =
          prev.formScore !== next.formScore ||
          prev.visibilityOk !== next.visibilityOk ||
          prev.farCamera !== next.farCamera ||
          prev.liveCues.join("|") !== next.liveCues.join("|");
        if (changed) {
          prevViewRef.current = next;
          setHoldView(next);
        }
        return;
      }

      const criteriaMet =
        holdMode === "perfect"
          ? evaluation.perfectCriteriaMet
          : evaluation.holdCriteriaMet;

      holdMachineRef.current.setMode(holdMode);
      const result = holdMachineRef.current.tick(
        criteriaMet,
        performance.now()
      );

      const next: HoldView = {
        state: result.state,
        holdStartTime: result.holdStartTime,
        lastHoldMs: result.lastHoldMs,
        formScore: processFormScore(
          evaluation.formScore,
          result.state,
          prevViewRef.current.formScore
        ),
        liveCues: evaluation.liveCues,
        visibilityOk: evaluation.visibilityOk,
        farCamera: evaluation.farCamera ?? false,
      };

      if (result.state === "holding") {
        sessionFormScoreRef.current = evaluation.formScore;
      }

      ingestCues(evaluation.liveCues);
      recordProgress(next.formScore, result.state);

      // Only re-render when something visible actually changed — the timer
      // animates itself from holdStartTime.
      const prev = prevViewRef.current;
      const changed =
        prev.state !== next.state ||
        prev.holdStartTime !== next.holdStartTime ||
        prev.lastHoldMs !== next.lastHoldMs ||
        prev.formScore !== next.formScore ||
        prev.visibilityOk !== next.visibilityOk ||
        prev.farCamera !== next.farCamera ||
        prev.liveCues.join("|") !== next.liveCues.join("|");
      if (changed) {
        prevViewRef.current = next;
        setHoldView(next);
      }

      if (result.state === "dropped" && result.lastHoldMs > MIN_SAVED_HOLD_MS) {
        void handleSessionEnd(
          result.lastHoldMs,
          sessionFormScoreRef.current,
          evaluation.metrics
        );
      }
    },
    [skill, skillId, mode, holdMode, handleSessionEnd, processFormScore, ingestCues, recordProgress]
  );

  const { getRenderLandmarks, getRenderHands, ready, error, profile } =
    usePoseDetection(videoRef, {
      bodyProvider,
      trackHands: true,
      onFrame,
      onDistanceContext,
    });

  const resetSession = useCallback(() => {
    sessionEndedRef.current = false;
    setSessionEnded(false);
    holdMachineRef.current.reset();
    historyRef.current = [];
    resetFormScore();
    resetCues();
    resetProgress();
    sessionFormScoreRef.current = 0;
    metricsRef.current = [];
    setLearnMetrics([]);
    prevViewRef.current = INITIAL_VIEW;
    setHoldView(INITIAL_VIEW);
  }, [resetFormScore, resetCues, resetProgress]);

  useEffect(() => {
    resetSession();
    setCoachingPlan(null);
    setBestHoldMs(0);
  }, [skillId, resetSession]);

  useEffect(() => {
    resetSession();
  }, [mode, resetSession]);

  if (!skill) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <p>Skill not found.</p>
        <Link href="/skills" className="mt-4 inline-block text-accent">
          Back to skills
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-4 sm:py-6">
      <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div>
          <Link href="/skills" className="text-sm font-medium text-muted hover:text-accent">
            ← Learning paths
          </Link>
          {pathStep && (
            <p className="mt-1 text-xs text-accent">
              {pathStep.path.name} · Step {pathStep.step} of {pathStep.total}
            </p>
          )}
          <h1 className="text-xl font-bold sm:text-2xl">{skill.name}</h1>
          <p className="text-sm text-muted">{skill.cameraGuide}</p>
          {pathStep && pathStep.step > 1 && (
            <Link
              href={`/train/${pathStep.path.skillIds[pathStep.step - 2]}`}
              className="mt-2 inline-block text-xs text-muted hover:text-accent"
            >
              ← Previous:{" "}
              {getSkill(pathStep.path.skillIds[pathStep.step - 2])?.name}
            </Link>
          )}
          {pathStep && pathStep.step < pathStep.total && (
            <Link
              href={`/train/${pathStep.path.skillIds[pathStep.step]}`}
              className="mt-1 inline-block text-xs text-accent hover:underline"
            >
              Next: {getSkill(pathStep.path.skillIds[pathStep.step])?.name} →
            </Link>
          )}
        </div>
        <div className="mode-toggle">
          {(["learn", "hold_only", "perfect"] as TrainMode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`mode-toggle-btn ${mode === m ? "mode-toggle-btn-active" : ""}`}
            >
              {m.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <TrainCameraPanel
            videoRef={videoRef}
            onVideoReady={() => setVideoReady(true)}
            onStreamReady={onStreamReady}
            facingMode={facingMode}
            deviceId={deviceId}
            onFacingModeChange={onFacingModeChange}
            framingLabel={framingLabel}
            framingGuidance={framingGuidance}
            isManualFraming={isManualFraming}
            onEnableAutoFraming={enableAutoFraming}
            footer={
              <>
                {profile.label}
                {holdView.farCamera && " · Full-body mode (distance compensated)"}
              </>
            }
          >
            {videoReady && ready && (
              <>
                <PoseOverlay
                  getLandmarks={getRenderLandmarks}
                  getHands={getRenderHands}
                  mirror={mirrored}
                  opacity={mode === "learn" ? 0.7 : holdView.state === "holding" ? 0.5 : 0.85}
                />
                {mode === "learn" && (
                  <LearnOverlay
                    skillId={skillId}
                    getLandmarks={getRenderLandmarks}
                    getMetrics={() => metricsRef.current}
                    mirror={mirrored}
                  />
                )}
              </>
            )}
            {videoReady && !ready && !error && (
              <div className="absolute inset-x-0 top-14 z-10 mx-auto w-fit max-w-[calc(100%-2rem)] rounded-xl border border-border bg-surface/95 px-4 py-2 text-center text-sm text-muted shadow-card">
                Loading pose model…
              </div>
            )}
            {error && (
              <div className="absolute inset-x-0 top-14 z-10 mx-auto w-fit max-w-[calc(100%-2rem)] rounded-lg bg-danger/90 px-4 py-2 text-center text-sm">
                Detection error: {error}
              </div>
            )}
            {ready && !holdView.visibilityOk && (
              <div className="absolute inset-x-0 top-14 z-10 mx-auto w-fit max-w-[calc(100%-2rem)] rounded-lg bg-danger/90 px-4 py-2 text-center text-sm">
                Move back — keep full body in frame
              </div>
            )}
            <PersistentCueOverlay
              cues={pinnedCues}
              onDismiss={dismissCue}
              onDismissAll={dismissAllCues}
            />
          </TrainCameraPanel>
        </div>

        <div className="space-y-6">
          <HoldTimer
            state={holdView.state}
            holdStartTime={holdView.holdStartTime}
            lastHoldMs={holdView.lastHoldMs}
            bestHoldMs={bestHoldMs}
            formScore={holdView.formScore}
            mode={mode}
          />
          {mode === "learn" && <LearnMetricsPanel metrics={learnMetrics} />}
          {mode !== "learn" && <SessionProgressChart points={progressPoints} />}
          <CoachingPanel
            pinnedCues={pinnedCues}
            onDismissCue={dismissCue}
            drills={coachingPlan?.recommendedDrills}
            weakPoints={coachingPlan?.weakPoints}
          />
          {sessionEnded && coachingPlan && (
            <div className="card border-accent/25 bg-accent-soft/30 p-4">
              <h3 className="mb-2 font-semibold text-accent">Session saved</h3>
              <p className="text-sm text-muted">
                Hold: {(holdView.lastHoldMs / 1000).toFixed(2)}s · Form{" "}
                {holdView.formScore}%
              </p>
              <button
                onClick={resetSession}
                className="mt-3 text-sm text-accent hover:underline"
              >
                Train again
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
