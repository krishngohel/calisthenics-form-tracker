"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  detectSkill,
  evaluateSkill,
  getSkill,
  toIsotropic,
  type HandLandmarks,
  type HoldMode,
  type Landmark,
  type SkillDetectionResult,
} from "@cft/core";
import { TrainCameraPanel } from "@/components/camera/TrainCameraPanel";
import { CameraStatusBanner } from "@/components/camera/CameraStatusBanner";
import { PoseOverlay, type SkeletonStatus } from "@/components/camera/PoseOverlay";
import { HoldHud } from "@/components/train/HoldHud";
import { HoldResultToast } from "@/components/train/HoldResultToast";
import { ReadyOverlay } from "@/components/train/ReadyOverlay";
import { TrainingScreen } from "@/components/train/TrainingScreen";
import { CoachingPanel } from "@/components/coaching/CoachingPanel";
import { PersistentCueOverlay } from "@/components/coaching/PersistentCueOverlay";
import { SessionProgressChart } from "@/components/coaching/SessionProgressChart";
import { HoldSummaryCard } from "@/components/coaching/HoldSummaryCard";
import { ModeToggle } from "@/components/ModeToggle";
import { useAutoBackCameraFraming } from "@/hooks/useAutoBackCameraFraming";
import { getStoredBodyProvider, usePoseDetection, type PoseFrameInfo } from "@/hooks/usePoseDetection";
import { useHoldSession } from "@/hooks/useHoldSession";
import { useTrainingFeedback } from "@/hooks/useTrainingFeedback";
import { useFrameHistory } from "@/hooks/useFrameHistory";
import { useLocalHistory } from "@/hooks/useLocalHistory";
import { readPreferences } from "@/lib/preferences";

const HOLD_MODES: readonly HoldMode[] = ["hold_only", "perfect"];
/** A guess must stay stable this long before it locks in. */
const STABLE_DETECT_MS = 900;
/** Switching away from a locked skill needs a longer, high-confidence run. */
const SWITCH_DETECT_MS = STABLE_DETECT_MS * 1.5;
const SWITCH_MIN_CONFIDENCE = 70;
/** Throttle detection-readout re-renders (confidence changes every frame). */
const DETECTION_UI_INTERVAL_MS = 250;

export default function AutoTrainPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoReady, setVideoReady] = useState(false);
  const [mode, setMode] = useState<HoldMode>("hold_only");
  const [bodyProvider, setBodyProvider] = useState<"movenet" | "mediapipe">("movenet");
  useEffect(() => {
    setBodyProvider(getStoredBodyProvider());
    setMode(readPreferences().defaultMode);
  }, []);

  const [activeSkillId, setActiveSkillId] = useState<string | null>(null);
  const [detection, setDetection] = useState<SkillDetectionResult | null>(null);
  const [manualLock, setManualLock] = useState(false);

  const framing = useAutoBackCameraFraming();
  const mirrored = framing.facingMode === "user";
  const session = useHoldSession(mode);
  const { processHold, resetLive, resetAll, holdView } = session;
  const { stats } = useLocalHistory();
  const allTimeBestMs = activeSkillId ? (stats.bestBySkill[activeSkillId]?.durationMs ?? 0) : 0;
  const feedback = useTrainingFeedback({
    holdView,
    cues: session.pinnedCues,
    lastHold: session.lastHold,
    allTimeBestMs,
  });
  const history = useFrameHistory();

  const [armed, setArmed] = useState(false);
  const armedRef = useRef(false);
  const start = useCallback(() => {
    feedback.armAudio();
    armedRef.current = true;
    setArmed(true);
  }, [feedback]);

  const modeRef = useRef(mode);
  const activeSkillIdRef = useRef<string | null>(null);
  const manualLockRef = useRef(false);
  const stableDetectRef = useRef<{ skillId: string; since: number } | null>(null);
  const detectionUiAtRef = useRef(0);

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);
  useEffect(() => {
    manualLockRef.current = manualLock;
  }, [manualLock]);

  const activeSkill = activeSkillId ? getSkill(activeSkillId) : undefined;
  const statusRef = useRef<SkeletonStatus>("idle");
  statusRef.current = !activeSkill ? "idle" : !holdView.visibilityOk ? "lowvis" : holdView.state;
  const getStatus = useCallback(() => statusRef.current, []);

  const lockSkill = useCallback(
    (skillId: string) => {
      activeSkillIdRef.current = skillId;
      stableDetectRef.current = null;
      setActiveSkillId(skillId);
      resetLive();
    },
    [resetLive]
  );

  const onFrame = useCallback(
    (raw: Record<string, Landmark | null>, hands: HandLandmarks, frame: PoseFrameInfo) => {
      // Rules measure angles and distances, so they need x and y in the same units.
      const body = toIsotropic(raw, frame.aspect);
      const frames = history.push(body);
      const now = performance.now();
      const currentMode = modeRef.current;
      if (!armedRef.current) return;

      const guess = detectSkill(body, hands, frames, currentMode);
      if (guess) {
        if (now - detectionUiAtRef.current >= DETECTION_UI_INTERVAL_MS) {
          detectionUiAtRef.current = now;
          setDetection(guess);
        }

        const active = activeSkillIdRef.current;
        const canSwitch =
          !manualLockRef.current &&
          (active === null ||
            (guess.skillId !== active && guess.holdMatch && guess.confidence >= SWITCH_MIN_CONFIDENCE));

        if (canSwitch) {
          const stable = stableDetectRef.current;
          const needMs = active === null ? STABLE_DETECT_MS : SWITCH_DETECT_MS;
          if (stable?.skillId === guess.skillId) {
            if (now - stable.since >= needMs) lockSkill(guess.skillId);
          } else {
            stableDetectRef.current = { skillId: guess.skillId, since: now };
          }
        }
      }

      const skillId = activeSkillIdRef.current;
      if (!skillId) return;
      const evaluation = evaluateSkill(skillId, body, hands, frames, currentMode);
      if (evaluation) processHold(skillId, evaluation, now);
    },
    [history, lockSkill, processHold]
  );

  const { getRenderLandmarks, getRenderHands, ready, error, profile } = usePoseDetection(videoRef, {
    bodyProvider,
    trackHands: true,
    onFrame,
    onDistanceContext: framing.onDistanceContext,
  });

  const clearSkill = useCallback(() => {
    activeSkillIdRef.current = null;
    stableDetectRef.current = null;
    setActiveSkillId(null);
    setManualLock(false);
    setDetection(null);
    resetAll();
  }, [resetAll]);

  useEffect(() => {
    resetLive();
  }, [mode, resetLive]);

  const skillLabel = activeSkill?.name ?? detection?.skillName ?? null;

  return (
    <TrainingScreen
      back={{ href: "/skills", label: "Paths" }}
      title="Auto-detect"
      subtitle="Strike a hold — the app picks the skill."
      modeControl={<ModeToggle value={mode} options={HOLD_MODES} onChange={setMode} label="Hold mode" />}
      camera={
        <TrainCameraPanel
          videoRef={videoRef}
          onVideoReady={() => setVideoReady(true)}
          onStreamReady={framing.onStreamReady}
          facingMode={framing.facingMode}
          deviceId={framing.deviceId}
          onFacingModeChange={framing.onFacingModeChange}
          framingLabel={framing.framingLabel}
          framingGuidance={framing.framingGuidance}
          isManualFraming={framing.isManualFraming}
          onEnableAutoFraming={framing.enableAutoFraming}
          focus={feedback.focus}
          onToggleFocus={feedback.toggleFocus}
          voiceEnabled={feedback.voice.enabled}
          voiceSupported={feedback.voice.supported}
          onToggleVoice={feedback.voice.toggle}
          footer={
            <>
              Detecting at {profile.detectFps} fps
              {holdView.farCamera && " · far-camera mode"}
            </>
          }
        >
          {videoReady && ready && (
            <PoseOverlay
              getLandmarks={getRenderLandmarks}
              getHands={getRenderHands}
              getStatus={getStatus}
              videoRef={videoRef}
              mirror={mirrored}
            />
          )}
          {armed && (
            <HoldHud
              state={activeSkill ? holdView.state : "idle"}
              holdStartTime={holdView.holdStartTime}
              lastHoldMs={holdView.lastHoldMs}
              bestHoldMs={feedback.bestMs}
              formScore={holdView.formScore}
              mode={mode}
              skillLabel={skillLabel}
              large={feedback.focus}
            />
          )}
          {!armed && (
            <ReadyOverlay
              title="Auto-detect"
              guide="Strike any hold. After about a second in a stable position the app locks onto the skill and starts timing."
              ready={videoReady && ready}
              onStart={start}
            />
          )}
          <HoldResultToast hold={session.lastHold} newBest={feedback.lastWasBest} />
          <CameraStatusBanner
            ready={ready}
            error={error}
            videoReady={videoReady}
            visibilityWarning={armed && !!activeSkill && !holdView.visibilityOk}
            hint={armed && !activeSkill && session.pinnedCues.length === 0 ? "Get into position — detection locks in after about a second" : null}
          />
          <PersistentCueOverlay cues={session.pinnedCues} onDismiss={session.dismissCue} onDismissAll={session.dismissAllCues} />
        </TrainCameraPanel>
      }
      belowCamera={
        <div className="card mt-3 p-3 sm:p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">Detected skill</p>
              <p className="truncate text-lg font-semibold" aria-live="polite">
                {skillLabel ?? "Scanning…"}
              </p>
              {detection && (
                <p className="text-sm text-muted">
                  Confidence {detection.confidence}%{detection.holdMatch ? " · hold matched" : " · searching pose"}
                </p>
              )}
            </div>
            {activeSkillId && (
              <div className="flex flex-wrap gap-2">
                <Link href={`/train/${activeSkillId}`} className="btn-secondary min-h-11 px-3 py-2 text-sm">
                  Open manual view
                </Link>
                <button type="button" onClick={clearSkill} className="btn-secondary min-h-11 px-3 py-2 text-sm">
                  Re-detect
                </button>
                <button
                  type="button"
                  onClick={() => setManualLock((v) => !v)}
                  aria-pressed={manualLock}
                  className={`min-h-11 rounded-xl px-3 py-2 text-sm font-medium transition ${
                    manualLock ? "bg-accent text-accent-foreground shadow-sm" : "border border-border bg-surface hover:border-accent/40 hover:bg-surface-muted"
                  }`}
                >
                  {manualLock ? "Locked" : "Lock skill"}
                </button>
              </div>
            )}
          </div>
        </div>
      }
      side={
        <>
          {session.lastHold && (
            <HoldSummaryCard
              hold={session.lastHold}
              skillName={getSkill(session.lastHold.skillId)?.name}
              saveState={session.saveState}
              cloudConfigured={session.cloudConfigured}
              signedIn={session.signedIn}
              onClear={clearSkill}
            />
          )}
          <SessionProgressChart points={session.progressPoints} />
          <CoachingPanel
            pinnedCues={session.pinnedCues}
            onDismissCue={session.dismissCue}
            drills={session.coachingPlan?.recommendedDrills}
            weakPoints={session.coachingPlan?.weakPoints}
          />
          {!activeSkill && session.pinnedCues.length === 0 && <p className="text-sm text-muted">Hold a skill pose to begin training.</p>}
        </>
      }
    />
  );
}
