"use client";

interface ModeToggleProps<T extends string> {
  value: T;
  options: readonly T[];
  onChange: (value: T) => void;
  label: string;
}

const LABELS: Record<string, string> = {
  learn: "Learn",
  hold_only: "Hold only",
  perfect: "Perfect form",
};

export function ModeToggle<T extends string>({ value, options, onChange, label }: ModeToggleProps<T>) {
  return (
    <div className="segmented w-full sm:w-auto" role="group" aria-label={label}>
      {options.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onChange(option)}
          aria-pressed={value === option}
          className={`segmented-btn whitespace-nowrap ${value === option ? "segmented-btn-active" : ""}`}
        >
          {LABELS[option] ?? option.replace("_", " ")}
        </button>
      ))}
    </div>
  );
}
