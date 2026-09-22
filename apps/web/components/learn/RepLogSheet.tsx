"use client";

import { useState } from "react";
import { Sheet } from "@/components/app/Sheet";
import { appendReps } from "@/lib/localHistory";
import { hapticImpact } from "@/lib/native";

interface Props {
  open: boolean;
  onClose: () => void;
  skillId: string;
  skillName: string;
  defaultSets: number;
  defaultReps: number;
}

function Stepper({ label, value, onChange, min = 1, max = 50 }: { label: string; value: number; onChange: (v: number) => void; min?: number; max?: number }) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-base text-foreground">{label}</span>
      <div className="flex items-center gap-3">
        <button type="button" className="btn-secondary min-h-11 min-w-11 px-0" aria-label={`Fewer ${label.toLowerCase()}`} onClick={() => onChange(Math.max(min, value - 1))}>
          −
        </button>
        <span className="w-8 text-center font-mono text-lg tabular-nums" aria-live="polite">
          {value}
        </span>
        <button type="button" className="btn-secondary min-h-11 min-w-11 px-0" aria-label={`More ${label.toLowerCase()}`} onClick={() => onChange(Math.min(max, value + 1))}>
          +
        </button>
      </div>
    </div>
  );
}

/** Log a rep-based session for a skill the camera does not time. */
export function RepLogSheet({ open, onClose, skillId, skillName, defaultSets, defaultReps }: Props) {
  const [sets, setSets] = useState(defaultSets);
  const [reps, setReps] = useState(defaultReps);
  return (
    <Sheet open={open} onClose={onClose} title={`Log ${skillName}`}>
      <p className="mb-2 text-sm text-muted">Count only clean reps. The standard for this step is {defaultSets}×{defaultReps}.</p>
      <Stepper label="Sets" value={sets} onChange={setSets} max={10} />
      <Stepper label="Reps per set" value={reps} onChange={setReps} />
      <button
        type="button"
        className="btn-primary mt-3 w-full"
        onClick={() => {
          appendReps(skillId, sets, reps);
          hapticImpact();
          onClose();
        }}
      >
        Save {sets}×{reps}
      </button>
    </Sheet>
  );
}
