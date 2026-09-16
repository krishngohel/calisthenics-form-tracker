"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { useAuthUser } from "@/hooks/useAuthUser";
import { ThemeToggle } from "@/components/ThemeToggle";
import { createClient } from "@/lib/supabase/client";

const NAV_LINKS = [
  { href: "/skills", label: "Paths" },
  { href: "/train", label: "Auto-detect" },
  { href: "/progress", label: "Progress" },
  { href: "/dashboard", label: "Dashboard", requiresCloud: true },
  { href: "/settings", label: "Settings" },
] as const;

export function NavBar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, configured } = useAuthUser();

  const signOut = async () => {
    setMenuOpen(false);
    await createClient().auth.signOut();
    router.push("/");
    router.refresh();
  };

  const isActive = (href: string) =>
    href === "/train" ? pathname === "/train" : pathname === href || pathname.startsWith(`${href}/`);
  const links = NAV_LINKS.filter((link) => !("requiresCloud" in link) || configured);

  const accountControl = !configured ? null : loading ? (
    <span className="text-sm text-muted" aria-hidden>
      …
    </span>
  ) : user ? (
    <button
      type="button"
      onClick={signOut}
      className="rounded-xl bg-accent-soft px-4 py-2 text-sm font-semibold text-accent-hover transition hover:bg-accent-muted/60"
    >
      Sign out
    </button>
  ) : (
    <Link
      href="/login"
      className="rounded-xl bg-accent-soft px-4 py-2 font-semibold text-accent-hover transition hover:bg-accent-muted/60"
    >
      Sign in
    </Link>
  );

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-surface/90 shadow-nav backdrop-blur-md safe-top">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:py-4">
        <Link
          href="/"
          className="text-lg font-bold tracking-tight text-accent hover:text-accent-hover"
        >
          CFT
        </Link>

        <nav className="hidden items-center gap-6 text-sm sm:flex" aria-label="Primary">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={isActive(link.href) ? "page" : undefined}
              className={`font-medium transition hover:text-accent ${
                isActive(link.href) ? "text-accent" : "text-muted"
              }`}
            >
              {link.label}
            </Link>
          ))}
          <ThemeToggle />
          {accountControl}
        </nav>

        <div className="flex items-center gap-1 sm:hidden">
          <ThemeToggle />
        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          className="flex h-11 w-11 items-center justify-center rounded-xl text-muted transition hover:bg-surface-muted hover:text-accent sm:hidden"
          aria-expanded={menuOpen}
          aria-controls="mobile-nav"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
        >
          {menuOpen ? <CloseIcon /> : <MenuIcon />}
        </button>
        </div>
      </div>

      {menuOpen && (
        <nav
          id="mobile-nav"
          className="border-t border-border-subtle bg-surface px-4 py-3 sm:hidden"
          aria-label="Primary"
        >
          <ul className="flex flex-col gap-1">
            {links.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  aria-current={isActive(link.href) ? "page" : undefined}
                  className={`flex min-h-11 items-center rounded-xl px-3 font-medium transition hover:bg-surface-muted hover:text-accent ${
                    isActive(link.href) ? "text-accent" : "text-muted"
                  }`}
                >
                  {link.label}
                </Link>
              </li>
            ))}
            {configured && !loading && (
              <li>
                {user ? (
                  <button
                    type="button"
                    onClick={signOut}
                    className="flex min-h-11 w-full items-center rounded-xl bg-accent-soft px-3 font-semibold text-accent-hover"
                  >
                    Sign out
                  </button>
                ) : (
                  <Link
                    href="/login"
                    onClick={() => setMenuOpen(false)}
                    className="flex min-h-11 items-center rounded-xl bg-accent-soft px-3 font-semibold text-accent-hover"
                  >
                    Sign in
                  </Link>
                )}
              </li>
            )}
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
