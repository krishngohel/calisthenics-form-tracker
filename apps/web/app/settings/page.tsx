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
import { APP_VERSION } from "@/lib/version";
import { EXPERIENCE_LABELS, readVoiceEnabled, writeVoiceEnabled, type ExperienceLevel } from "@/lib/preferences";
import { readString, STORAGE_KEYS } from "@/lib/storage";

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
    setVoice(readVoiceEnabled());
    setProvider(readString(STORAGE_KEYS.bodyProvider) ?? "movenet");
    setTheme(readThemePreference());
  }, []);

  const setVoicePref = (v: boolean) => {
    setVoice(v);
    writeVoiceEnabled(v);
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
        <ListRow label="Sounds" detail="Chimes on hold start, drop, and new best" trailing={<Toggle checked={prefs.sounds} onChange={(v) => update({ sounds: v })} label="Sounds" />} />
        <ListRow
          label="Default mode"
          detail={prefs.defaultMode === "perfect" ? "Perfect form — stricter criteria" : "Hold only — count any valid hold"}
          onClick={() => update({ defaultMode: prefs.defaultMode === "perfect" ? "hold_only" : "perfect" })}
          trailing={<span className="text-sm font-medium text-accent">{prefs.defaultMode === "perfect" ? "Perfect" : "Hold only"}</span>}
        />
        <ListRow label="Experience level" detail="Sets the suggested skill on Home" onClick={cycleLevel} trailing={<span className="text-sm font-medium text-accent">{EXPERIENCE_LABELS[prefs.experience]}</span>} />
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

      <ListGroup title="About">
        <ListRow label="Version" trailing={<span className="text-sm text-muted">{APP_VERSION}{isNativePlatform() ? " · iOS" : " · web"}</span>} />
        <ListRow label="Privacy" detail="Pose detection runs on this device. No video is recorded or uploaded." />
      </ListGroup>
    </Screen>
  );
}
