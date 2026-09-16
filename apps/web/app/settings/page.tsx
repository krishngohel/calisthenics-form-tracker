"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Screen, ListGroup, ListRow, Toggle } from "@/components/app/Screen";
import { usePreferences } from "@/hooks/usePreferences";
import { useAuthUser } from "@/hooks/useAuthUser";
import { useLocalHistory } from "@/hooks/useLocalHistory";
import { clearHistory } from "@/lib/localHistory";
import { applyThemePreference, readThemePreference, type ThemePreference } from "@/lib/theme";
import { createClient } from "@/lib/supabase/client";
import { isNativePlatform } from "@/lib/native";
import type { ExperienceLevel } from "@/lib/preferences";

const LEVEL_LABEL: Record<ExperienceLevel, string> = {
  beginner: "Getting started",
  intermediate: "Training skills",
  advanced: "Advanced holds",
};

export default function SettingsPage() {
  const router = useRouter();
  const { prefs, update } = usePreferences();
  const { user, configured } = useAuthUser();
  const { history } = useLocalHistory();
  const [voice, setVoice] = useState(false);
  const [theme, setTheme] = useState<ThemePreference>("system");
  const [provider, setProvider] = useState("movenet");
  const [confirmClear, setConfirmClear] = useState(false);

  useEffect(() => {
    try {
      setVoice(localStorage.getItem("cft-voice") === "1");
      setProvider(localStorage.getItem("cft-body-provider") ?? "movenet");
    } catch {
      // ignore
    }
    setTheme(readThemePreference());
  }, []);

  const setVoicePref = (v: boolean) => {
    setVoice(v);
    try {
      localStorage.setItem("cft-voice", v ? "1" : "0");
    } catch {
      // ignore
    }
  };

  const cycleTheme = () => {
    const next: ThemePreference = theme === "system" ? "dark" : theme === "dark" ? "light" : "system";
    applyThemePreference(next);
    setTheme(next);
  };

  const cycleLevel = () => {
    const order: ExperienceLevel[] = ["beginner", "intermediate", "advanced"];
    const next = order[(order.indexOf(prefs.experience) + 1) % order.length];
    update({ experience: next });
  };

  const signOut = async () => {
    await createClient().auth.signOut();
    router.refresh();
  };

  return (
    <Screen title="Settings">
      <ListGroup title="Training">
        <ListRow label="Voice coach" detail="Spoken hold, count-outs, and cues" trailing={<Toggle checked={voice} onChange={setVoicePref} label="Voice coach" />} />
        <ListRow
          label="Default mode"
          detail={prefs.defaultMode === "perfect" ? "Perfect form — stricter criteria" : "Hold only — count any valid hold"}
          onClick={() => update({ defaultMode: prefs.defaultMode === "perfect" ? "hold_only" : "perfect" })}
          trailing={<span className="text-sm font-medium text-accent">{prefs.defaultMode === "perfect" ? "Perfect" : "Hold only"}</span>}
        />
        <ListRow label="Experience level" detail="Sets the suggested skill on Home" onClick={cycleLevel} trailing={<span className="text-sm font-medium text-accent">{LEVEL_LABEL[prefs.experience]}</span>} />
      </ListGroup>

      <ListGroup title="Appearance">
        <ListRow label="Theme" onClick={cycleTheme} trailing={<span className="text-sm font-medium text-accent capitalize">{theme}</span>} />
      </ListGroup>

      <ListGroup title="Detection">
        <ListRow label="Pose model" detail={provider === "mediapipe" ? "MediaPipe Pose Lite" : "MoveNet Lightning"} href="/dev/pose-benchmark" />
        <ListRow label="Replay onboarding" detail="Camera permission, level, and voice setup" href="/onboarding" />
      </ListGroup>

      <ListGroup title={configured ? "Account" : "Cloud sync"}>
        {!configured && <ListRow label="Not configured" detail="Holds are stored on this device only" />}
        {configured && !user && <ListRow label="Sign in" detail="Back up history and coaching plans" href="/login" />}
        {configured && user && (
          <>
            <ListRow label={user.email ?? "Signed in"} detail="Holds sync to your dashboard" />
            <ListRow label="Sign out" onClick={signOut} />
          </>
        )}
      </ListGroup>

      <ListGroup title="Data">
        <ListRow label={`${history.length} hold${history.length === 1 ? "" : "s"} on this device`} detail="History powers Home and Progress" />
        {!confirmClear ? (
          <ListRow label="Clear local history" onClick={() => setConfirmClear(true)} destructive />
        ) : (
          <ListRow
            label="Tap again to confirm"
            detail="This cannot be undone"
            onClick={() => {
              clearHistory();
              setConfirmClear(false);
            }}
            destructive
          />
        )}
      </ListGroup>

      <p className="px-1 text-center text-xs text-muted">
        CFT {isNativePlatform() ? "for iOS" : "web"} · Pose detection runs on this device. No video is uploaded.
      </p>
    </Screen>
  );
}
