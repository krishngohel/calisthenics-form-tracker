"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/** Re-keys the page on every route so it plays the push-in animation. */
export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <div key={pathname} className="page-in">
      {children}
    </div>
  );
}
