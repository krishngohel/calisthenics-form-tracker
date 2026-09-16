"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronLeft } from "@/components/app/Screen";

interface TrainingScreenProps {
  back: { href: string; label: string };
  title: string;
  subtitle: string;
  /** Segmented mode control, rendered in the header. */
  modeControl: ReactNode;
  /** The camera panel (with HUD and overlays as its children). */
  camera: ReactNode;
  /** Content directly under the camera: skill navigation, detection readout. */
  belowCamera?: ReactNode;
  /** Side column on desktop, stacked below on phones. */
  side: ReactNode;
}

/**
 * Shared chrome for the two training screens (fixed skill and auto-detect):
 * compact header, camera column, side column. Phones stack; desktop is a
 * two-thirds / one-third grid.
 */
export function TrainingScreen({ back, title, subtitle, modeControl, camera, belowCamera, side }: TrainingScreenProps) {
  return (
    <div className="screen max-w-6xl">
      <header className="mb-3">
        <Link href={back.href} className="screen-back">
          <ChevronLeft />
          {back.label}
        </Link>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-extrabold leading-tight tracking-tight text-foreground">{title}</h1>
            <p className="mt-0.5 text-sm text-muted">{subtitle}</p>
          </div>
          {modeControl}
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {camera}
          {belowCamera}
        </div>
        <div className="space-y-5">{side}</div>
      </div>
    </div>
  );
}
