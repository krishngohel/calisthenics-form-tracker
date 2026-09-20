"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSkill } from "@cft/core";
import { setOnboarded } from "@/lib/appShell";
import { EXPERIENCE_LABELS, STARTER_SKILL, writePreferences, type ExperienceLevel } from "@/lib/preferences";
import { hapticImpact, hapticNotify } from "@/lib/native";
import { openCameraStream } from "@/lib/camera/openCameraStream";
import { cameraUnavailableReason } from "@/lib/camera/platform";
import { AppMark } from "@/components/app/AppMark";
import { ListGroup, ListRow } from "@/components/app/Screen";

type Step = "welcome" | "camera" | "level";
const STEPS: Step[] = ["welcome", "camera", "level"];

const LEVEL_DESC: Record<ExperienceLevel, string> = {
  beginner: "Planks, hangs, push-ups",
  intermediate: "L-sit, pull-ups, dips",
  advanced: "Planche, front lever, handstand push-ups",
};

type CameraState = "idle" | "asking" | "granted" | "denied" | "unavailable";

export default function OnboardingPage() {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [level, setLevel] = useState<ExperienceLevel>("beginner");
  const [camera, setCamera] = useState<CameraState>("idle");
  const step = STEPS[index];

  useEffect(() => {
    setOnboarded(false);
  }, []);

  const next = useCallback(() => {
    void hapticImpact("light");
    setIndex((i) => Math.min(i + 1, STEPS.length - 1));
  }, []);
  const back = useCallback(() => setIndex((i) => Math.max(i - 1, 0)), []);

  const requestCamera = useCallback(async () => {
    if (cameraUnavailableReason()) {
      setCamera("unavailable");
      return;
    }
    setCamera("asking");
    try {
      const stream = await openCameraStream({ facingMode: "environment" });
      stream.getTracks().forEach((t) => t.stop());
      setCamera("granted");
      void hapticNotify("success");
    } catch {
      setCamera("denied");
    }
  }, []);

  const finish = useCallback(() => {
    const focusSkillId = STARTER_SKILL[level];
    writePreferences({ experience: level, focusSkillId });
    setOnboarded(true);
    router.replace(`/train/${focusSkillId}`);
  }, [level, router]);

  const cameraDone = camera === "granted" || camera === "denied" || camera === "unavailable";

  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-md flex-col px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))]">
      <div className="flex min-h-11 items-center">
        {index > 0 ? (
          <button type="button" onClick={back} className="btn-ghost -ml-3">
            Back
          </button>
        ) : (
          <span />
        )}
      </div>

      <div className="flex flex-1 flex-col justify-center py-6">
        {step === "welcome" && (
          <div>
            <AppMark size={72} className="mb-6" />
            <h1 className="mb-3 text-3xl font-bold tracking-tight">Calisthenics Form Tracker</h1>
            <p className="text-base text-muted">
              Point the camera at yourself, get into a hold, and the timer runs on its own. You get a form score and what to fix. Video is analysed on this device and never uploaded.
            </p>
          </div>
        )}

        {step === "camera" && (
          <div>
            <h1 className="mb-3 text-3xl font-bold tracking-tight">Camera</h1>
            <p className="mb-6 text-base text-muted">
              {camera === "granted"
                ? "Camera access is on."
                : camera === "denied"
                  ? "Camera access was declined. You can turn it on later in Settings › CFT › Camera."
                  : camera === "unavailable"
                    ? "No camera is available here. You can still browse paths and drills."
                    : "The app needs the camera to see your body. Frames are processed on the device and discarded."}
            </p>
            {!cameraDone && (
              <button type="button" onClick={requestCamera} disabled={camera === "asking"} className="btn-primary w-full disabled:opacity-60">
                {camera === "asking" ? "Asking…" : "Allow camera access"}
              </button>
            )}
          </div>
        )}

        {step === "level" && (
          <div>
            <h1 className="mb-3 text-3xl font-bold tracking-tight">Where are you now?</h1>
            <p className="mb-6 text-base text-muted">This picks the first skill. You can train anything.</p>
            <ListGroup>
              {(Object.keys(EXPERIENCE_LABELS) as ExperienceLevel[]).map((id) => (
                <ListRow
                  key={id}
                  label={EXPERIENCE_LABELS[id]}
                  detail={LEVEL_DESC[id]}
                  onClick={() => {
                    setLevel(id);
                    void hapticImpact("light");
                  }}
                  trailing={<Check selected={level === id} />}
                />
              ))}
            </ListGroup>
          </div>
        )}
      </div>

      <div className="space-y-2">
        {step === "welcome" && (
          <button type="button" onClick={next} className="btn-primary w-full">
            Get started
          </button>
        )}
        {step === "camera" && (
          <button type="button" onClick={next} className={cameraDone ? "btn-primary w-full" : "btn-ghost w-full"}>
            {cameraDone ? "Continue" : "Not now"}
          </button>
        )}
        {step === "level" && (
          <button type="button" onClick={finish} className="btn-primary w-full">
            Start with {getSkill(STARTER_SKILL[level])?.name}
          </button>
        )}
        <div className="flex justify-center gap-1.5 pt-2" aria-label={`Step ${index + 1} of ${STEPS.length}`}>
          {STEPS.map((s, i) => (
            <span key={s} className={`h-1.5 w-1.5 rounded-full ${i === index ? "bg-foreground" : "bg-fill"}`} />
          ))}
        </div>
      </div>
    </div>
  );
}

function Check({ selected }: { selected: boolean }) {
  return selected ? (
    <svg viewBox="0 0 24 24" className="h-5 w-5 text-accent" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m5 12.5 4.5 4.5L19 7.5" />
    </svg>
  ) : (
    <span className="h-5 w-5" aria-hidden />
  );
}
