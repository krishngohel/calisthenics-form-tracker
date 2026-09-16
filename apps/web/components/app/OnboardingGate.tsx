"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { isAppShellActive, isOnboarded } from "@/lib/appShell";

/**
 * First launch in the app shell goes to onboarding. Desktop web is never
 * redirected; the flow is still reachable at /onboarding.
 */
export function OnboardingGate() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!pathname || pathname.startsWith("/onboarding")) return;
    if (!isAppShellActive() || isOnboarded()) return;
    router.replace("/onboarding");
  }, [pathname, router]);

  return null;
}
