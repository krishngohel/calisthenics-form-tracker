"use client";

import Link from "next/link";
import type { ReactNode } from "react";

interface ScreenProps {
  title: string;
  subtitle?: string;
  /** Small link rendered above the title, e.g. back navigation. */
  back?: { href: string; label: string };
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

/** App screen with a large title header; also fine on desktop web. */
export function Screen({ title, subtitle, back, action, children, className = "" }: ScreenProps) {
  return (
    <div className={`screen ${className}`}>
      <header className="screen-header">
        {back && (
          <Link href={back.href} className="screen-back">
            <ChevronLeft />
            {back.label}
          </Link>
        )}
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <h1 className="screen-title">{title}</h1>
            {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
          </div>
          {action}
        </div>
      </header>
      {children}
    </div>
  );
}

export function ChevronLeft() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m15 5-7 7 7 7" />
    </svg>
  );
}

export function ChevronRight() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 text-muted" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m9 5 7 7-7 7" />
    </svg>
  );
}

/** iOS-style grouped list. */
export function ListGroup({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <section className="mb-6">
      {title && <h2 className="list-group-title">{title}</h2>}
      <div className="list-group">{children}</div>
    </section>
  );
}

interface RowProps {
  label: string;
  detail?: ReactNode;
  href?: string;
  onClick?: () => void;
  trailing?: ReactNode;
  destructive?: boolean;
}

export function ListRow({ label, detail, href, onClick, trailing, destructive }: RowProps) {
  const inner = (
    <>
      <div className="min-w-0 flex-1">
        <div className={`text-base ${destructive ? "text-danger" : "text-foreground"}`}>{label}</div>
        {detail && <div className="mt-0.5 text-sm text-muted">{detail}</div>}
      </div>
      {trailing ?? (href ? <ChevronRight /> : null)}
    </>
  );
  if (href) {
    return (
      <Link href={href} className="list-row">
        {inner}
      </Link>
    );
  }
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className="list-row w-full text-left">
        {inner}
      </button>
    );
  }
  return <div className="list-row">{inner}</div>;
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`toggle ${checked ? "toggle-on" : ""}`}
    >
      <span className="toggle-knob" />
    </button>
  );
}
