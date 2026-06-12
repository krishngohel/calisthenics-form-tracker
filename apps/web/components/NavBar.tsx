"use client";

import Link from "next/link";
import { useState } from "react";

const NAV_LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/skills", label: "Skills" },
  { href: "/dev/pose-benchmark", label: "Benchmark" },
] as const;

export function NavBar() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-surface/80 backdrop-blur safe-top">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:py-4">
        <Link href="/" className="text-lg font-bold text-accent">
          CFT
        </Link>

        <nav className="hidden items-center gap-6 text-sm sm:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-muted hover:text-white"
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/login"
            className="rounded-lg bg-accent/20 px-3 py-1.5 text-accent hover:bg-accent/30"
          >
            Account
          </Link>
        </nav>

        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          className="flex h-11 w-11 items-center justify-center rounded-lg text-muted hover:bg-white/5 hover:text-white sm:hidden"
          aria-expanded={menuOpen}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
        >
          {menuOpen ? <CloseIcon /> : <MenuIcon />}
        </button>
      </div>

      {menuOpen && (
        <nav className="border-t border-white/10 px-4 py-3 sm:hidden">
          <ul className="flex flex-col gap-1">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className="flex min-h-11 items-center rounded-lg px-3 text-muted hover:bg-white/5 hover:text-white"
                >
                  {link.label}
                </Link>
              </li>
            ))}
            <li>
              <Link
                href="/login"
                onClick={() => setMenuOpen(false)}
                className="flex min-h-11 items-center rounded-lg bg-accent/20 px-3 font-medium text-accent hover:bg-accent/30"
              >
                Account
              </Link>
            </li>
          </ul>
        </nav>
      )}
    </header>
  );
}

function MenuIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      className="h-6 w-6"
      aria-hidden
    >
      <path d="M4 7h16" />
      <path d="M4 12h16" />
      <path d="M4 17h16" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      className="h-6 w-6"
      aria-hidden
    >
      <path d="M6 6l12 12" />
      <path d="M18 6L6 18" />
    </svg>
  );
}
