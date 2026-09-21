"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  getSkill,
  getSkillPathStep,
  describeGoal,
  evaluateSkill,
  toIsotropic,
  orientToGravity,
  type HoldMode,
  type TrainMode,
  type BodyProviderId,
  type HandLandmarks,
  type Landmark,
} from "@cft/core";
import { TrainCameraPanel } from "@/components/camera/TrainCameraPanel";
import { CameraStatusBanner } from "@/components/camera/CameraStatusBanner";
import { PoseOverlay, type SkeletonStatus } from "@/components/camera/PoseOverlay";
import { LearnOverlay } from "@/components/camera/LearnOverlay";
import { HoldHud } from "@/components/train/HoldHud";
import { ReadyOverlay } from "@/components/train/ReadyOverlay";
import { PostHoldSheet } from "@/components/train/PostHoldSheet";
import { TrainingStage } from "@/components/train/TrainingStage";
import { CoachingPanel } from "@/components/coaching/CoachingPanel";
import { LearnMetricsPanel } from "@/components/coaching/LearnMetricsPanel";
import { PersistentCueOverlay } from "@/components/coaching/PersistentCueOverlay";
import { SessionProgressChart } from "@/components/coaching/SessionProgressChart";
import { ModeToggle } from "@/components/ModeToggle";
import { useAutoBackCameraFraming } from "@/hooks/useAutoBackCameraFraming";
import { getStoredBodyProvider, usePoseDetection, type PoseFrameInfo } from "@/hooks/usePoseDetection";
import { useHoldSession } from "@/hooks/useHoldSession";
import { useTrainingFeedback } from "@/hooks/useTrainingFeedback";
import { useFrameHistory } from "@/hooks/useFrameHistory";
import { useFrameOrientation } from "@/hooks/useFrameOrientation";
import { useHoldRecorder } from "@/hooks/useHoldRecorder";
import { useLocalHistory } from "@/hooks/useLocalHistory";
import { readPreferences } from "@/lib/preferences";

const TRAIN_MODES: readonly TrainMode[] = ["learn", "hold_only", "perfect"];

export function SkillTrainer({ skillId }: { skillId: string }) {
  const skill = getSkill(skillId);
  const pathStep = getSkillPathStep(skillId);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoReady, setVideoReady] = useState(false);
  const [mode, setMode] = useState<TrainMode>("hold_only");
  const [bodyProvider, setBodyProvider] = useState<BodyProviderId>("movenet");

  useEffect(() => {
    setBodyProvider(getStoredBodyProvider());
    setMode(readPreferences().defaultMode);
  }, []);

  const framing = useAutoBackCameraFraming();
  const mirrored = framing.facingMode === "user";

  const holdMode: HoldMode = mode === "learn" ? "hold_only" : mode;
  const session = useHoldSession(holdMode);
  const { processHold, processLearn, resetLive, resetAll, holdView } = session;
  const { stats } = useLocalHistory();
  const allTimeBestMs = stats.bestBySkill[skillId]?.durationMs ?? 0;
  const feedback = useTrainingFeedback({
    holdView,
    cues: session.pinnedCues,
    lastHold: session.lastHold,
    allTimeBestMs,
  });
  const history = useFrameHistory();

  // Nothing is timed until the athlete taps Start on the setup card.
  const [armed, setArmed] = useState(false);
  const armedRef = useRef(false);
  const { armAudio } = feedback;
  const orientation = useFrameOrientation();
  const recorder = useHoldRecorder({ videoRef, holdView, skillName: skill?.name ?? "", enabled: armed });
  const { enable: enableOrientation, getRotation } = orientation;
  const start = useCallback(() => {
    armAudio();
    void enableOrientation();
    armedRef.current = true;
    setArmed(true);
  }, [armAudio, enableOrientation]);

  // The result sheet stays until dismissed; a new hold replaces it.
  const [dismissedHoldAt, setDismissedHoldAt] = useState(0);
  const lastHoldAt = session.lastHold?.endedAt.getTime() ?? 0;
  const showResult = !!session.lastHold && lastHoldAt !== dismissedHoldAt;

  const modeRef = useRef(mode);
  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);
  const statusRef = useRef<SkeletonStatus>("idle");
  statusRef.current = !holdView.visibilityOk ? "lowvis" : mode === "learn" ? "idle" : holdView.state;
  const getStatus = useCallback(() => statusRef.current, []);

  const onFrame = useCallback(
    (raw: Record<string, Landmark | null>, hands: HandLandmarks, frame: PoseFrameInfo) => {
      if (!skill) return;
      // Rules need x and y in the same units and gravity pointing down the y axis.
      const body = orientToGravity(toIsotropic(raw, frame.aspect), getRotation(), frame.aspect);
      const frames = history.push(body);
      const currentMode = modeRef.current;
      const evalMode: HoldMode = currentMode === "learn" ? "perfect" : currentMode;
      const evaluation = evaluateSkill(skillId, body, hands, frames, evalMode);
      if (!evaluation) return;

      const now = performance.now();
      if (currentMode === "learn") processLearn(evaluation, now);
      else if (armedRef.current) processHold(skillId, evaluation, now);
    },
    [skill, skillId, history, processHold, processLearn, getRotation]
  );

  const { getRenderLandmarks, getRenderHands, ready, error } = usePoseDetection(videoRef, {
    bodyProvider,
    trackHands: skill?.needsHands ?? true,
    onFrame,
    onDistanceContext: framing.onDistanceContext,
  });

  useEffect(() => {
    history.clear();
    resetAll();
    armedRef.current = false;
    setArmed(false);
    setDismissedHoldAt(0);
  }, [skillId, history, resetAll]);

  useEffect(() => {
    resetLive();
  }, [mode, resetLive]);

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

  const nextSkillId = pathStep && pathStep.step < pathStep.total ? pathStep.path.skillIds[pathStep.step] : null;
  const nextSkill = nextSkillId ? getSkill(nextSkillId) : null;

  return (
    <TrainingStage
      back={{ href: "/skills", label: "Paths" }}
      title={skill.name}
      modeControl={<ModeToggle value={mode} options={TRAIN_MODES} onChange={setMode} label="Training mode" compact />}
      camera={
        <TrainCameraPanel
          stage
          videoRef={videoRef}
          onVideoReady={() => setVideoReady(true)}
          onStreamReady={framing.onStreamReady}
          facingMode={framing.facingMode}
          deviceId={framing.deviceId}
          onFacingModeChange={framing.onFacingModeChange}
          framingGuidance={framing.framingGuidance}
          isManualFraming={framing.isManualFraming}
          voiceEnabled={feedback.voice.enabled}
          voiceSupported={feedback.voice.supported}
          onToggleVoice={feedback.voice.toggle}
        >
          {videoReady && ready && (
            <>
              <PoseOverlay
                getLandmarks={getRenderLandmarks}
                getHands={getRenderHands}
                getStatus={getStatus}
                videoRef={videoRef}
                mirror={mirrored}
                opacity={mode === "learn" ? 0.8 : 0.95}
              />
              {mode === "learn" && (
                <LearnOverlay
                  skillId={skillId}
                  getLandmarks={getRenderLandmarks}
                  getMetrics={session.getLearnMetrics}
                  videoRef={videoRef}
                  mirror={mirrored}
                />
              )}
            </>
          )}
          {(armed || mode === "learn") && (
            <HoldHud
              stage
              state={holdView.state}
              holdStartTime={holdView.holdStartTime}
              lastHoldMs={holdView.lastHoldMs}
              bestHoldMs={feedback.bestMs}
              formScore={holdView.formScore}
              mode={mode}
            />
          )}
          {mode !== "learn" && !armed && (
            <ReadyOverlay
              title={skill.name}
              guide={skill.cameraGuide}
              cameraAngle={skill.cameraAngle}
              bestMs={allTimeBestMs}
              goal={pathStep ? describeGoal(pathStep.goal) : undefined}
              ready={videoReady && ready}
              onStart={start}
            />
          )}
          <CameraStatusBanner
            stage
            ready={ready}
            error={error}
            videoReady={videoReady}
            visibilityWarning={armed && !holdView.visibilityOk}
            hint={orientation.rotation !== 0 ? "Phone is turned; tracking corrected for gravity" : null}
          />
          {!showResult && (
            <PersistentCueOverlay stage cues={session.pinnedCues} onDismiss={session.dismissCue} onDismissAll={session.dismissAllCues} />
          )}
        </TrainCameraPanel>
      }
      sheet={
        showResult && session.lastHold ? (
          <PostHoldSheet
            hold={session.lastHold}
            newBest={feedback.lastWasBest}
            plan={session.coachingPlan}
            saveState={session.saveState}
            next={nextSkill ? { href: `/train/${nextSkill.id}`, label: `Next: ${nextSkill.name}` } : null}
            skillName={skill.name}
            onAgain={() => setDismissedHoldAt(lastHoldAt)}
            video={recorder.clip ? { onSave: () => void recorder.save(), state: recorder.saveState } : null}
          />
        ) : null
      }
      details={
        <>
          {mode === "learn" ? (
            <LearnMetricsPanel metrics={session.learnMetrics} />
          ) : (
            <>
              <LearnMetricsPanel metrics={session.liveMetrics} title="Live rule checks" footer="Score next to each rule; ✓ means it currently passes." />
              <SessionProgressChart points={session.progressPoints} />
            </>
          )}
          <CoachingPanel
            pinnedCues={session.pinnedCues}
            onDismissCue={session.dismissCue}
            drills={session.coachingPlan?.recommendedDrills}
            weakPoints={session.coachingPlan?.weakPoints}
          />
          {pathStep && (
            <p className="text-xs text-muted">
              {pathStep.path.name} · step {pathStep.step} of {pathStep.total} · level {pathStep.level} · {describeGoal(pathStep.goal)}
              {pathStep.focus ? ` · ${pathStep.focus}` : ""}
            </p>
          )}
        </>
      }
    />
  );
}
