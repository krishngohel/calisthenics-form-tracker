"use client";

import { useEffect, type ReactNode } from "react";

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  /** Keep the sheet compact; it grows with content up to 85% of the viewport. */
  className?: string;
}

/** Bottom sheet with a backdrop, like a UIKit page sheet at medium detent. */
export function Sheet({ open, onClose, title, children, className = "" }: SheetProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[70]" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" aria-label="Dismiss" tabIndex={-1} onClick={onClose} className="sheet-backdrop" />
      <div className={`sheet ${className}`}>
        <div className="mx-auto mb-2 h-1 w-9 rounded-full bg-fill" aria-hidden />
        <div className="mb-3 flex items-center justify-between">
          {title ? <h2 className="text-lg font-bold text-foreground">{title}</h2> : <span />}
          <button type="button" onClick={onClose} className="btn-ghost -mr-3">
            Done
          </button>
        </div>
        <div className="overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
