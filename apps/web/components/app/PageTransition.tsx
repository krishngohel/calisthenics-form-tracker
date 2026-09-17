"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

/**
 * Plays the push-in animation on every route change. The animating class is
 * removed once the animation ends: an ancestor with an active transform
 * becomes the containing block for `position: fixed` descendants (the
 * full-screen training stage), which must not outlive the transition.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [animating, setAnimating] = useState(true);

  useEffect(() => {
    setAnimating(true);
  }, [pathname]);

  return (
    <div key={pathname} className={animating ? "page-in" : undefined} onAnimationEnd={() => setAnimating(false)}>
      {children}
    </div>
  );
}
