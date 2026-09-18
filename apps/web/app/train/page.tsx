"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  detectSkill,
  evaluateSkill,
  getSkill,
  toIsotropic,
  type BodyProviderId,
  type HandLandmarks,
  type HoldMode,
  type Landmark,
  type SkillDetectionResult,
} from "@cft/core";
import { TrainCameraPanel } from "@/components/camera/TrainCameraPanel";
import { CameraStatusBanner } from "@/components/camera/CameraStatusBanner";
import { PoseOverlay, type SkeletonStatus } from "@/components/camera/PoseOverlay";
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
import { useLocalHistory } from "@/hooks/useLocalHistory";
import { readPreferences } from "@/lib/preferences";

const HOLD_MODES: readonly HoldMode[] = ["hold_only", "perfect"];
const STABLE_DETECT_MS = 900;
const SWITCH_DETECT_MS = STABLE_DETECT_MS * 1.5;
const SWITCH_MIN_CONFIDENCE = 70;
const DETECTION_UI_INTERVAL_MS = 250;

export default function AutoTrainPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoReady, setVideoReady] = useState(false);
  const [mode, setMode] = useState<HoldMode>("hold_only");
  const [bodyProvider, setBodyProvider] = useState<BodyProviderId>("movenet");
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
  const feedback = useTrainingFeedback({ holdView, cues: session.pinnedCues, lastHold: session.lastHold, allTimeBestMs });
  const history = useFrameHistory();

  const [armed, setArmed] = useState(false);
  const armedRef = useRef(false);
  const { armAudio } = feedback;
  const start = useCallback(() => {
    armAudio();
    armedRef.current = true;
    setArmed(true);
  }, [armAudio]);

  const [dismissedHoldAt, setDismissedHoldAt] = useState(0);
  const lastHoldAt = session.lastHold?.endedAt.getTime() ?? 0;
  const showResult = !!session.lastHold && lastHoldAt !== dismissedHoldAt;

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
          (active === null || (guess.skillId !== active && guess.holdMatch && guess.confidence >= SWITCH_MIN_CONFIDENCE));
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

  const { getRenderLandmarks, getRenderHands, ready, error } = usePoseDetection(videoRef, {
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
    setDismissedHoldAt(0);
  }, [resetAll]);

  useEffect(() => {
    resetLive();
  }, [mode, resetLive]);

  const skillLabel = activeSkill?.name ?? detection?.skillName ?? null;

  return (
    <TrainingStage
      back={{ href: "/skills", label: "Paths" }}
      title="Auto-detect"
      modeControl={<ModeToggle value={mode} options={HOLD_MODES} onChange={setMode} label="Hold mode" compact />}
      status={
        armed && (
          <div className="hud-panel flex items-center gap-2 py-1.5 text-sm">
            <span className="font-semibold">{skillLabel ?? "Scanning…"}</span>
            {detection && <span className="text-white/70">{detection.confidence}%</span>}
            {activeSkillId && (
              <>
                <button type="button" onClick={() => setManualLock((v) => !v)} aria-pressed={manualLock} className="rounded-full bg-white/15 px-2 py-0.5 text-xs font-semibold">
                  {manualLock ? "Locked" : "Lock"}
                </button>
                <button type="button" onClick={clearSkill} className="rounded-full bg-white/15 px-2 py-0.5 text-xs font-semibold">
                  Re-detect
                </button>
              </>
            )}
          </div>
        )
      }
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
            <PoseOverlay getLandmarks={getRenderLandmarks} getHands={getRenderHands} getStatus={getStatus} videoRef={videoRef} mirror={mirrored} />
          )}
          {armed && (
            <HoldHud
              stage
              state={activeSkill ? holdView.state : "idle"}
              holdStartTime={holdView.holdStartTime}
              lastHoldMs={holdView.lastHoldMs}
              bestHoldMs={feedback.bestMs}
              formScore={holdView.formScore}
              mode={mode}
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
          <CameraStatusBanner
            stage
            ready={ready}
            error={error}
            videoReady={videoReady}
            visibilityWarning={armed && !!activeSkill && !holdView.visibilityOk}
            hint={armed && !activeSkill && session.pinnedCues.length === 0 ? "Get into position — detection locks in after about a second" : null}
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
            next={session.lastHold ? { href: `/train/${session.lastHold.skillId}`, label: "Train this skill" } : null}
            skillName={getSkill(session.lastHold.skillId)?.name}
            onAgain={() => setDismissedHoldAt(lastHoldAt)}
          />
        ) : null
      }
      details={
        <>
          <LearnMetricsPanel metrics={session.liveMetrics} title="Live rule checks" footer="Score next to each rule; ✓ means it currently passes." />
          <SessionProgressChart points={session.progressPoints} />
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
