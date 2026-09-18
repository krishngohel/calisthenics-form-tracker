"use client";

import { hapticImpact } from "@/lib/native";

interface ModeToggleProps<T extends string> {
  value: T;
  options: readonly T[];
  onChange: (value: T) => void;
  label: string;
  /** Translucent pill for use over the camera. */
  compact?: boolean;
}

const LABELS: Record<string, string> = {
  learn: "Learn",
  hold_only: "Hold",
  perfect: "Perfect",
};

export function ModeToggle<T extends string>({ value, options, onChange, label, compact = false }: ModeToggleProps<T>) {
  return (
    <div className={compact ? "segmented segmented-dark" : "segmented w-full sm:w-auto"} role="group" aria-label={label}>
      {options.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => {
            if (value !== option) void hapticImpact("light");
            onChange(option);
          }}
          aria-pressed={value === option}
          className={`segmented-btn whitespace-nowrap ${value === option ? "segmented-btn-active" : ""} ${compact ? "min-w-[4.5rem]" : ""}`}
        >
          {LABELS[option] ?? option.replace("_", " ")}
        </button>
      ))}
    </div>
  );
}
