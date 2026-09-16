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
import { useAutoBackCameraFraming } from "@/hooks/useAutoBackCameraFraming";
import { PoseOverlay, type SkeletonStatus } from "@/components/camera/PoseOverlay";
import { LearnOverlay } from "@/components/camera/LearnOverlay";
import { HoldHud } from "@/components/train/HoldHud";
import { CoachingPanel } from "@/components/coaching/CoachingPanel";
import { LearnMetricsPanel } from "@/components/coaching/LearnMetricsPanel";
import { PersistentCueOverlay } from "@/components/coaching/PersistentCueOverlay";
import { SessionProgressChart } from "@/components/coaching/SessionProgressChart";
import { HoldSummaryCard } from "@/components/coaching/HoldSummaryCard";
import { ModeToggle } from "@/components/ModeToggle";
import { getStoredBodyProvider, usePoseDetection, type PoseFrameInfo } from "@/hooks/usePoseDetection";
import { useHoldSession } from "@/hooks/useHoldSession";
import { useTrainingFeedback } from "@/hooks/useTrainingFeedback";

const TRAIN_MODES: readonly TrainMode[] = ["learn", "hold_only", "perfect"];
const HISTORY_FRAMES = 30;

export function SkillTrainer({ skillId }: { skillId: string }) {
  const skill = getSkill(skillId);
  const pathStep = getSkillPathStep(skillId);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoReady, setVideoReady] = useState(false);
  const [mode, setMode] = useState<TrainMode>("learn");
  const [bodyProvider, setBodyProvider] = useState<"movenet" | "mediapipe">("movenet");

  useEffect(() => {
    setBodyProvider(getStoredBodyProvider());
  }, []);

  const framing = useAutoBackCameraFraming();
  const mirrored = framing.facingMode === "user";

  const holdMode: HoldMode = mode === "learn" ? "hold_only" : mode;
  const session = useHoldSession(holdMode);
  const { processHold, processLearn, resetLive, resetAll, holdView } = session;
  const feedback = useTrainingFeedback(holdView, session.pinnedCues, session.bestHoldMs);

  const modeRef = useRef(mode);
  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);
  const historyRef = useRef<Record<string, Landmark | null>[]>([]);
  const statusRef = useRef<SkeletonStatus>("idle");
  statusRef.current = !holdView.visibilityOk ? "lowvis" : mode === "learn" ? "idle" : holdView.state;
  const getStatus = useCallback(() => statusRef.current, []);

  const onFrame = useCallback(
    (raw: Record<string, Landmark | null>, hands: HandLandmarks, frame: PoseFrameInfo) => {
      if (!skill) return;
      // Rules measure angles and distances, so they need x and y in the same units.
      const body = toIsotropic(raw, frame.aspect);
      const history = historyRef.current;
      history.push(body);
      if (history.length > HISTORY_FRAMES) history.shift();

      const currentMode = modeRef.current;
      const evalMode: HoldMode = currentMode === "learn" ? "perfect" : currentMode;
      const evaluation = evaluateSkill(skillId, body, hands, history, evalMode);
      if (!evaluation) return;

      const now = performance.now();
      if (currentMode === "learn") processLearn(evaluation, now);
      else processHold(skillId, evaluation, now);
    },
    [skill, skillId, processHold, processLearn]
  );

  const { getRenderLandmarks, getRenderHands, ready, error, profile } = usePoseDetection(videoRef, {
    bodyProvider,
    trackHands: skill?.needsHands ?? true,
    onFrame,
    onDistanceContext: framing.onDistanceContext,
  });

  useEffect(() => {
    historyRef.current = [];
    resetAll();
  }, [skillId, resetAll]);

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
    <div className="page pt-4 sm:pt-6">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div className="min-w-0">
          <Link href="/skills" className="text-sm font-medium text-muted hover:text-accent">
            ← Learning paths
          </Link>
          {pathStep && (
            <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-accent">
              {pathStep.path.name} · Step {pathStep.step} of {pathStep.total}
            </p>
          )}
          <h1 className="page-title">{skill.name}</h1>
          <p className="text-sm text-muted">{skill.cameraGuide}</p>
        </div>
        <ModeToggle value={mode} options={TRAIN_MODES} onChange={setMode} label="Training mode" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
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
            <HoldHud
              state={holdView.state}
              holdStartTime={holdView.holdStartTime}
              lastHoldMs={holdView.lastHoldMs}
              bestHoldMs={session.bestHoldMs}
              formScore={holdView.formScore}
              mode={mode}
              large={feedback.focus}
            />
            <CameraStatusBanner
              ready={ready}
              error={error}
              videoReady={videoReady}
              visibilityWarning={!holdView.visibilityOk}
            />
            <PersistentCueOverlay
              cues={session.pinnedCues}
              onDismiss={session.dismissCue}
              onDismissAll={session.dismissAllCues}
            />
          </TrainCameraPanel>

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
        </div>

        <div className="space-y-5">
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
        </div>
      </div>
    </div>
  );
}
