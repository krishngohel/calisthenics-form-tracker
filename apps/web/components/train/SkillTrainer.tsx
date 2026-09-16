"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  getSkill,
  getSkillPathStep,
  evaluateSkill,
  toIsotropic,
  type HoldMode,
  type TrainMode,
  type HandLandmarks,
  type Landmark,
} from "@cft/core";
import { TrainCameraPanel } from "@/components/camera/TrainCameraPanel";
import { CameraStatusBanner } from "@/components/camera/CameraStatusBanner";
import { PoseOverlay, type SkeletonStatus } from "@/components/camera/PoseOverlay";
import { LearnOverlay } from "@/components/camera/LearnOverlay";
import { HoldHud } from "@/components/train/HoldHud";
import { HoldResultToast } from "@/components/train/HoldResultToast";
import { ReadyOverlay } from "@/components/train/ReadyOverlay";
import { TrainingScreen } from "@/components/train/TrainingScreen";
import { CoachingPanel } from "@/components/coaching/CoachingPanel";
import { LearnMetricsPanel } from "@/components/coaching/LearnMetricsPanel";
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

const TRAIN_MODES: readonly TrainMode[] = ["learn", "hold_only", "perfect"];

export function SkillTrainer({ skillId }: { skillId: string }) {
  const skill = getSkill(skillId);
  const pathStep = getSkillPathStep(skillId);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoReady, setVideoReady] = useState(false);
  const [mode, setMode] = useState<TrainMode>("hold_only");
  const [bodyProvider, setBodyProvider] = useState<"movenet" | "mediapipe">("movenet");

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
  const start = useCallback(() => {
    feedback.armAudio();
    armedRef.current = true;
    setArmed(true);
  }, [feedback]);

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
      // Rules measure angles and distances, so they need x and y in the same units.
      const body = toIsotropic(raw, frame.aspect);
      const frames = history.push(body);
      const currentMode = modeRef.current;
      const evalMode: HoldMode = currentMode === "learn" ? "perfect" : currentMode;
      const evaluation = evaluateSkill(skillId, body, hands, frames, evalMode);
      if (!evaluation) return;

      const now = performance.now();
      if (currentMode === "learn") processLearn(evaluation, now);
      else if (armedRef.current) processHold(skillId, evaluation, now);
    },
    [skill, skillId, history, processHold, processLearn]
  );

  const { getRenderLandmarks, getRenderHands, ready, error, profile } = usePoseDetection(videoRef, {
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

  const prevSkillId = pathStep && pathStep.step > 1 ? pathStep.path.skillIds[pathStep.step - 2] : null;
  const nextSkillId = pathStep && pathStep.step < pathStep.total ? pathStep.path.skillIds[pathStep.step] : null;

  return (
    <TrainingScreen
      back={{ href: "/skills", label: pathStep ? pathStep.path.name : "Paths" }}
      title={skill.name}
      subtitle={`${pathStep ? `Step ${pathStep.step} of ${pathStep.total} · ` : ""}${skill.cameraGuide}`}
      modeControl={<ModeToggle value={mode} options={TRAIN_MODES} onChange={setMode} label="Training mode" />}
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
              state={holdView.state}
              holdStartTime={holdView.holdStartTime}
              lastHoldMs={holdView.lastHoldMs}
              bestHoldMs={feedback.bestMs}
              formScore={holdView.formScore}
              mode={mode}
              large={feedback.focus}
            />
          )}
          {mode !== "learn" && !armed && (
            <ReadyOverlay
              title={skill.name}
              guide={skill.cameraGuide}
              cameraAngle={skill.cameraAngle}
              bestMs={allTimeBestMs}
              ready={videoReady && ready}
              onStart={start}
            />
          )}
          <HoldResultToast hold={session.lastHold} newBest={feedback.lastWasBest} />
          <CameraStatusBanner ready={ready} error={error} videoReady={videoReady} visibilityWarning={armed && !holdView.visibilityOk} />
          <PersistentCueOverlay cues={session.pinnedCues} onDismiss={session.dismissCue} onDismissAll={session.dismissAllCues} />
        </TrainCameraPanel>
      }
      belowCamera={
        (prevSkillId || nextSkillId) && (
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
            {prevSkillId && (
              <Link href={`/train/${prevSkillId}`} className="btn-ghost">
                ← {getSkill(prevSkillId)?.name}
              </Link>
            )}
            {nextSkillId && (
              <Link href={`/train/${nextSkillId}`} className="btn-ghost ml-auto text-accent">
                {getSkill(nextSkillId)?.name} →
              </Link>
            )}
          </div>
        )
      }
      side={
        <>
          {mode !== "learn" && session.lastHold && (
            <HoldSummaryCard
              hold={session.lastHold}
              saveState={session.saveState}
              cloudConfigured={session.cloudConfigured}
              signedIn={session.signedIn}
              onClear={resetAll}
            />
          )}
          {mode === "learn" && <LearnMetricsPanel metrics={session.learnMetrics} />}
          {mode !== "learn" && <SessionProgressChart points={session.progressPoints} />}
          <CoachingPanel
            pinnedCues={session.pinnedCues}
            onDismissCue={session.dismissCue}
            drills={session.coachingPlan?.recommendedDrills}
            weakPoints={session.coachingPlan?.weakPoints}
          />
        </>
      }
    />
  );
}
