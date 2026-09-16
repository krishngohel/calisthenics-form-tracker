"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSkill } from "@cft/core";
import { setOnboarded } from "@/lib/appShell";
import { STARTER_SKILL, writePreferences, writeVoiceEnabled, type ExperienceLevel } from "@/lib/preferences";
import { hapticImpact, hapticNotify } from "@/lib/native";
import { openCameraStream } from "@/lib/camera/openCameraStream";
import { cameraUnavailableReason } from "@/lib/camera/platform";

type Step = "welcome" | "how" | "camera" | "level" | "voice" | "done";
const STEPS: Step[] = ["welcome", "how", "camera", "level", "voice", "done"];

const LEVELS: { id: ExperienceLevel; title: string; desc: string }[] = [
  { id: "beginner", title: "Getting started", desc: "Planks, hangs, push-ups. I'm building the basics." },
  { id: "intermediate", title: "Training skills", desc: "L-sit, pull-ups, dips. Working toward holds." },
  { id: "advanced", title: "Advanced holds", desc: "Planche, front lever, handstand push-ups." },
];

type CameraState = "idle" | "asking" | "granted" | "denied" | "unavailable";

export default function OnboardingPage() {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [level, setLevel] = useState<ExperienceLevel>("beginner");
  const [voice, setVoice] = useState(true);
  const [camera, setCamera] = useState<CameraState>("idle");
  const step = STEPS[index];

  useEffect(() => {
    // Allow re-running onboarding from Settings without an old flag short-circuiting.
    setOnboarded(false);
  }, []);

  const next = useCallback(() => {
    void hapticImpact("light");
    setIndex((i) => Math.min(i + 1, STEPS.length - 1));
  }, []);
  const back = useCallback(() => setIndex((i) => Math.max(i - 1, 0)), []);

  const requestCamera = useCallback(async () => {
    const blocked = cameraUnavailableReason();
    if (blocked) {
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

  const finish = useCallback(
    (destination: "home" | "train") => {
      const focusSkillId = STARTER_SKILL[level];
      writePreferences({ experience: level, focusSkillId });
      writeVoiceEnabled(voice);
      setOnboarded(true);
      void hapticNotify("success");
      router.replace(destination === "train" ? `/train/${focusSkillId}` : "/");
    },
    [level, voice, router]
  );

  return (
    <div className="onboarding">
      <div className="mx-auto flex min-h-[100dvh] max-w-md flex-col px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))]">
        <div className="flex min-h-11 items-center justify-between">
          {index > 0 && step !== "done" ? (
            <button type="button" onClick={back} className="btn-ghost -ml-3">
              Back
            </button>
          ) : (
            <span />
          )}
          <ol className="flex gap-1.5" aria-label={`Step ${index + 1} of ${STEPS.length}`}>
            {STEPS.map((s, i) => (
              <li key={s} className={`h-1.5 rounded-full transition-all ${i <= index ? "w-6 bg-accent" : "w-1.5 bg-border"}`} />
            ))}
          </ol>
        </div>

        <div className="flex flex-1 flex-col justify-center py-6">
          {step === "welcome" && (
            <Slide
              art={<AppMark />}
              eyebrow="Welcome"
              title="Your form coach, in your pocket"
              body="CFT watches your holds through the camera, times them automatically, and tells you what to fix. Everything runs on this device. No video is uploaded."
            />
          )}
          {step === "how" && (
            <Slide
              art={<HowArt />}
              eyebrow="How it works"
              title="Prop the phone up, get in position"
              body="Stand a couple of metres back with your whole body in frame. The skeleton turns green when you're in the hold and the timer runs on its own. Voice cues mean you never have to look at the screen."
            />
          )}
          {step === "camera" && (
            <Slide
              art={<CameraArt state={camera} />}
              eyebrow="Camera"
              title="CFT needs the camera to see you"
              body={
                camera === "granted"
                  ? "Camera access is on. You're all set."
                  : camera === "denied"
                    ? "Camera access was declined. You can enable it later in Settings → CFT → Camera."
                    : camera === "unavailable"
                      ? "The camera isn't available in this environment. You can still browse paths and drills."
                      : "Frames are analysed on-device and discarded. Nothing is recorded or sent anywhere."
              }
            />
          )}
          {step === "level" && (
            <div>
              <p className="eyebrow">About you</p>
              <h1 className="onboarding-title">Where are you right now?</h1>
              <p className="mb-6 text-base text-muted">This picks your first skill. You can train anything anytime.</p>
              <div className="space-y-3">
                {LEVELS.map((l) => (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => {
                      setLevel(l.id);
                      void hapticImpact("light");
                    }}
                    aria-pressed={level === l.id}
                    className={`w-full rounded-2xl border-2 p-4 text-left transition ${
                      level === l.id ? "border-accent bg-accent-soft/60" : "border-border bg-surface"
                    }`}
                  >
                    <div className="text-base font-bold text-foreground">{l.title}</div>
                    <div className="mt-0.5 text-sm text-muted">{l.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          )}
          {step === "voice" && (
            <div>
              <p className="eyebrow">Voice coach</p>
              <h1 className="onboarding-title">Hear your holds, not just see them</h1>
              <p className="mb-6 text-base text-muted">
                CFT can say &ldquo;hold&rdquo;, count every five seconds, read your time on drop, and speak form cues. You can change this anytime.
              </p>
              <div className="space-y-3">
                <ChoiceRow title="Voice coach on" desc="Recommended for handstands and levers" selected={voice} onSelect={() => setVoice(true)} />
                <ChoiceRow title="Silent" desc="On-screen cues only" selected={!voice} onSelect={() => setVoice(false)} />
              </div>
            </div>
          )}
          {step === "done" && (
            <Slide
              art={<DoneArt />}
              eyebrow="Ready"
              title={`Start with ${getSkill(STARTER_SKILL[level])?.name ?? "a hold"}`}
              body="Your first skill is queued up. Prop the phone against something stable, step back until your whole body is in frame, and get into position."
            />
          )}
        </div>

        <div className="space-y-3">
          {step === "camera" && camera !== "granted" && camera !== "unavailable" && (
            <button type="button" onClick={requestCamera} disabled={camera === "asking"} className="btn-primary w-full text-base disabled:opacity-60">
              {camera === "asking" ? "Asking…" : camera === "denied" ? "Try again" : "Allow camera access"}
            </button>
          )}
          {step === "camera" && (camera === "granted" || camera === "denied" || camera === "unavailable") && (
            <button type="button" onClick={next} className="btn-primary w-full text-base">
              Continue
            </button>
          )}
          {step === "camera" && (camera === "idle" || camera === "asking") && (
            <button type="button" onClick={next} className="btn-ghost w-full">
              Not now
            </button>
          )}
          {step !== "camera" && step !== "done" && (
            <button type="button" onClick={next} className="btn-primary w-full text-base">
              {step === "welcome" ? "Get started" : "Continue"}
            </button>
          )}
          {step === "done" && (
            <>
              <button type="button" onClick={() => finish("train")} className="btn-primary w-full text-base">
                Start training
              </button>
              <button type="button" onClick={() => finish("home")} className="btn-ghost w-full">
                Explore first
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Slide({ art, eyebrow, title, body }: { art: React.ReactNode; eyebrow: string; title: string; body: string }) {
  return (
    <div>
      <div className="mb-8 flex justify-center">{art}</div>
      <p className="eyebrow">{eyebrow}</p>
      <h1 className="onboarding-title">{title}</h1>
      <p className="text-base leading-relaxed text-muted">{body}</p>
    </div>
  );
}

function ChoiceRow({ title, desc, selected, onSelect }: { title: string; desc: string; selected: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`w-full rounded-2xl border-2 p-4 text-left transition ${selected ? "border-accent bg-accent-soft/60" : "border-border bg-surface"}`}
    >
      <div className="text-base font-bold text-foreground">{title}</div>
      <div className="mt-0.5 text-sm text-muted">{desc}</div>
    </button>
  );
}

function AppMark() {
  return (
    <svg viewBox="0 0 1024 1024" className="h-40 w-40" aria-hidden>
      <rect width="1024" height="1024" rx="224" fill="#0b1512" />
      <circle cx="512" cy="512" r="330" fill="none" stroke="#134e48" strokeWidth="56" />
      <circle cx="512" cy="512" r="330" fill="none" stroke="#2dd4bf" strokeWidth="56" strokeLinecap="round" strokeDasharray="1555 2074" transform="rotate(-90 512 512)" />
      <g stroke="#e8f4ee" strokeWidth="44" strokeLinecap="round" strokeLinejoin="round" fill="none">
        <circle cx="512" cy="300" r="52" fill="#e8f4ee" stroke="none" />
        <path d="M512 370v250M512 620l-120 170M512 620l120 170M512 430l-160-110M512 430l160-110" />
      </g>
    </svg>
  );
}

function HowArt() {
  return (
    <svg viewBox="0 0 240 160" className="h-40 w-60" aria-hidden>
      <rect x="8" y="8" width="224" height="144" rx="20" fill="#0b1512" />
      <rect x="20" y="20" width="60" height="30" rx="8" fill="rgba(6,14,11,0.9)" stroke="rgba(255,255,255,0.15)" />
      <text x="28" y="40" fill="#6ee7b7" fontSize="14" fontWeight="800" fontFamily="ui-monospace, monospace">12.40s</text>
      <circle cx="200" cy="36" r="14" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="4" />
      <circle cx="200" cy="36" r="14" fill="none" stroke="#34d399" strokeWidth="4" strokeDasharray="70 88" transform="rotate(-90 200 36)" strokeLinecap="round" />
      <g stroke="#34d399" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" fill="none">
        <circle cx="120" cy="120" r="7" fill="#34d399" stroke="none" />
        <path d="M120 112V72M120 72l-24 30M120 72l24 30M120 92l-26 20M120 92l26 20" />
      </g>
    </svg>
  );
}

function CameraArt({ state }: { state: CameraState }) {
  const ok = state === "granted";
  return (
    <div className={`flex h-32 w-32 items-center justify-center rounded-full ${ok ? "bg-accent-soft" : "bg-surface-muted"}`}>
      <svg viewBox="0 0 24 24" className={`h-16 w-16 ${ok ? "text-accent" : "text-muted"}`} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z" />
        <circle cx="12" cy="13" r="3.5" />
        {ok && <path d="m9.5 13 1.8 1.8L15 11" strokeWidth="2.2" />}
      </svg>
    </div>
  );
}

function DoneArt() {
  return (
    <div className="flex h-32 w-32 items-center justify-center rounded-full bg-accent-soft">
      <svg viewBox="0 0 24 24" className="h-16 w-16 text-accent" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="m5 12.5 4.5 4.5L19 7.5" />
      </svg>
    </div>
  );
}
