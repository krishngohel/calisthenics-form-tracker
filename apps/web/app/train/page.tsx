"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  detectSkill,
  evaluateSkill,
  getSkill,
  HoldStateMachine,
  generateCoachingPlan,
  type CoachingPlan,
  type FormMetric,
  type HandLandmarks,
  type HoldMode,
  type HoldState,
  type Landmark,
  type SkillDetectionResult,
} from "@cft/core";
import { TrainCameraPanel } from "@/components/camera/TrainCameraPanel";
import { useAutoBackCameraFraming } from "@/hooks/useAutoBackCameraFraming";
import { PoseOverlay } from "@/components/camera/PoseOverlay";
import { HoldTimer } from "@/components/timer/HoldTimer";
import { CoachingPanel } from "@/components/coaching/CoachingPanel";
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

const MIN_SAVED_HOLD_MS = 500;
const STABLE_DETECT_MS = 900;

export default function AutoTrainPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoReady, setVideoReady] = useState(false);
  const [mode, setMode] = useState<HoldMode>("hold_only");
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
  const [activeSkillId, setActiveSkillId] = useState<string | null>(null);
  const [detection, setDetection] = useState<SkillDetectionResult | null>(null);
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
  const [manualLock, setManualLock] = useState(false);

  const sessionEndedRef = useRef(false);
  const historyRef = useRef<Record<string, Landmark | null>[]>([]);
  const holdMachineRef = useRef(new HoldStateMachine());
  const prevViewRef = useRef<HoldView>(INITIAL_VIEW);
  const activeSkillIdRef = useRef<string | null>(null);
  const manualLockRef = useRef(false);
  const stableDetectRef = useRef<{ skillId: string; since: number } | null>(null);
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

  useEffect(() => {
    activeSkillIdRef.current = activeSkillId;
  }, [activeSkillId]);

  useEffect(() => {
    manualLockRef.current = manualLock;
  }, [manualLock]);

  const activeSkill = activeSkillId ? getSkill(activeSkillId) : undefined;

  const handleSessionEnd = useCallback(
    async (skillId: string, durationMs: number, formScore: number, metrics: FormMetric[]) => {
      if (sessionEndedRef.current) return;
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
          mode,
          durationMs,
          formScore,
          metrics,
        });
        await saveCoachingPlan(user.id, plan);
      }
    },
    [mode]
  );

  const onFrame = useCallback(
    (body: Record<string, Landmark | null>, hands: HandLandmarks) => {
      historyRef.current.push(body);
      if (historyRef.current.length > 30) historyRef.current.shift();

      const guess = detectSkill(body, hands, historyRef.current, mode);
      if (guess) {
        setDetection(guess);

        if (!manualLockRef.current && !activeSkillIdRef.current) {
          const stable = stableDetectRef.current;
          if (stable?.skillId === guess.skillId) {
            if (performance.now() - stable.since >= STABLE_DETECT_MS) {
              activeSkillIdRef.current = guess.skillId;
              setActiveSkillId(guess.skillId);
            }
          } else {
            stableDetectRef.current = {
              skillId: guess.skillId,
              since: performance.now(),
            };
          }
        } else if (
          !manualLockRef.current &&
          activeSkillIdRef.current &&
          guess.skillId !== activeSkillIdRef.current &&
          guess.holdMatch &&
          guess.confidence >= 70
        ) {
          const stable = stableDetectRef.current;
          if (stable?.skillId === guess.skillId) {
            if (performance.now() - stable.since >= STABLE_DETECT_MS * 1.5) {
              activeSkillIdRef.current = guess.skillId;
              setActiveSkillId(guess.skillId);
              holdMachineRef.current.reset();
              prevViewRef.current = INITIAL_VIEW;
              setHoldView(INITIAL_VIEW);
            }
          } else {
            stableDetectRef.current = {
              skillId: guess.skillId,
              since: performance.now(),
            };
          }
        }
      }

      const skillId = activeSkillIdRef.current;
      if (!skillId) return;

      const evaluation = evaluateSkill(
        skillId,
        body,
        hands,
        historyRef.current,
        mode
      );
      if (!evaluation) return;

      const criteriaMet =
        mode === "perfect"
          ? evaluation.perfectCriteriaMet
          : evaluation.holdCriteriaMet;

      holdMachineRef.current.setMode(mode);
      const result = holdMachineRef.current.tick(criteriaMet, performance.now());

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
          skillId,
          result.lastHoldMs,
          sessionFormScoreRef.current,
          evaluation.metrics
        );
      }
    },
    [mode, handleSessionEnd, processFormScore, ingestCues, recordProgress]
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
    prevViewRef.current = INITIAL_VIEW;
    setHoldView(INITIAL_VIEW);
    stableDetectRef.current = null;
  }, [resetFormScore, resetCues, resetProgress]);

  const clearSkill = useCallback(() => {
    activeSkillIdRef.current = null;
    setActiveSkillId(null);
    setManualLock(false);
    stableDetectRef.current = null;
    resetSession();
    setCoachingPlan(null);
    setBestHoldMs(0);
  }, [resetSession]);

  useEffect(() => {
    resetSession();
  }, [mode, resetSession]);

  useEffect(() => {
    resetFormScore();
    sessionFormScoreRef.current = 0;
  }, [activeSkillId, resetFormScore]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-4 sm:py-6">
      <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div>
          <Link href="/skills" className="text-sm font-medium text-muted hover:text-accent">
            ← Skills
          </Link>
          <h1 className="text-xl font-bold sm:text-2xl">Auto-detect training</h1>
          <p className="text-sm text-muted">
            Strike a hold — the app picks the skill automatically.
          </p>
        </div>
        <div className="mode-toggle">
          {(["hold_only", "perfect"] as HoldMode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`mode-toggle-btn sm:px-4 ${mode === m ? "mode-toggle-btn-active" : ""}`}
            >
              {m.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      <div className="card mb-4 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted">Detected skill</p>
            <p className="text-lg font-semibold">
              {activeSkill?.name ?? detection?.skillName ?? "Scanning…"}
            </p>
            {detection && (
              <p className="text-sm text-muted">
                Confidence {detection.confidence}%
                {detection.holdMatch ? " · hold matched" : " · searching pose"}
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {activeSkillId && (
              <Link
                href={`/train/${activeSkillId}`}
                className="min-h-11 rounded-xl border border-border bg-surface px-3 py-2 text-sm leading-7 transition hover:border-accent/40 hover:bg-surface-muted"
              >
                Open manual view
              </Link>
            )}
            {activeSkillId && (
              <button
                onClick={clearSkill}
                className="min-h-11 rounded-xl border border-border bg-surface px-3 py-2 text-sm transition hover:border-accent/40 hover:bg-surface-muted"
              >
                Re-detect
              </button>
            )}
            {activeSkillId && (
              <button
                onClick={() => setManualLock((v) => !v)}
                className={`min-h-11 rounded-xl px-3 py-2 text-sm transition ${
                  manualLock
                    ? "bg-accent font-medium text-accent-foreground shadow-sm"
                    : "border border-border bg-surface hover:border-accent/40 hover:bg-surface-muted"
                }`}
              >
                {manualLock ? "Locked" : "Lock skill"}
              </button>
            )}
          </div>
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
              <PoseOverlay
                getLandmarks={getRenderLandmarks}
                getHands={getRenderHands}
                mirror={mirrored}
                opacity={holdView.state === "holding" ? 0.5 : 0.85}
              />
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
            {ready && activeSkill && !holdView.visibilityOk && (
              <div className="absolute inset-x-0 top-14 z-10 mx-auto w-fit max-w-[calc(100%-2rem)] rounded-lg bg-danger/90 px-4 py-2 text-center text-sm">
                Move back — keep full body in frame
              </div>
            )}
            {ready && !activeSkill && pinnedCues.length === 0 && (
              <div className="absolute inset-x-0 top-14 z-10 mx-auto w-fit max-w-[calc(100%-2rem)] rounded-xl border border-border bg-surface/95 px-4 py-2 text-center text-sm text-muted shadow-card">
                Get into position — detection starts in ~1s
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
            state={activeSkill ? holdView.state : "idle"}
            holdStartTime={holdView.holdStartTime}
            lastHoldMs={holdView.lastHoldMs}
            bestHoldMs={bestHoldMs}
            formScore={holdView.formScore}
            mode={mode}
          />
          <SessionProgressChart points={progressPoints} />
          <CoachingPanel
            pinnedCues={pinnedCues}
            onDismissCue={dismissCue}
            drills={coachingPlan?.recommendedDrills}
            weakPoints={coachingPlan?.weakPoints}
          />
          {!activeSkill && pinnedCues.length === 0 && (
            <p className="text-sm text-muted">Hold a skill pose to begin training.</p>
          )}
          {sessionEnded && coachingPlan && activeSkill && (
            <div className="card border-accent/25 bg-accent-soft/30 p-4">
              <h3 className="mb-2 font-semibold text-accent">Session saved</h3>
              <p className="text-sm text-muted">
                {activeSkill.name} · Hold: {(holdView.lastHoldMs / 1000).toFixed(2)}s · Form{" "}
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
