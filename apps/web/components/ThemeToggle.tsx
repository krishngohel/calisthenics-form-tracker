"use client";

import { useEffect, useState } from "react";
import { applyThemePreference, readThemePreference, resolvedTheme, type ThemePreference } from "@/lib/theme";

const NEXT: Record<ThemePreference, ThemePreference> = {
  system: "dark",
  dark: "light",
  light: "system",
};

export function ThemeToggle({ className = "" }: { className?: string }) {
  const [pref, setPref] = useState<ThemePreference>("system");
  useEffect(() => {
    setPref(readThemePreference());
  }, []);

  const cycle = () => {
    const next = NEXT[pref];
    applyThemePreference(next);
    setPref(next);
  };

  const effective = resolvedTheme(pref);
  const label =
    pref === "system" ? "Theme: follows system" : pref === "dark" ? "Theme: dark" : "Theme: light";

  return (
    <button
      type="button"
      onClick={cycle}
      className={`btn-ghost h-11 w-11 px-0 ${className}`}
      aria-label={`${label}. Tap to change.`}
      title={label}
    >
      {effective === "dark" ? <MoonIcon /> : <SunIcon />}
      {pref === "system" && <span className="sr-only">(system)</span>}
    </button>
  );
}

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-5 w-5" aria-hidden>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden>
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
    </svg>
  );
}
