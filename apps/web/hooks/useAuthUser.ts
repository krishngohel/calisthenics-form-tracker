"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export interface AuthUserState {
  user: User | null;
  /** True until the first auth check resolves (always false when not configured). */
  loading: boolean;
  /** False when Supabase env vars are missing — the app then runs offline-only. */
  configured: boolean;
}

/** Current Supabase user, kept in sync with sign-in / sign-out events. */
export function useAuthUser(): AuthUserState {
  const [configured] = useState(() => isSupabaseConfigured());
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(configured);

  useEffect(() => {
    if (!configured) return;
    const supabase = createClient();
    let cancelled = false;

    supabase.auth
      .getUser()
      .then(({ data }) => {
        if (!cancelled) setUser(data.user ?? null);
      })
      .catch(() => {
        if (!cancelled) setUser(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!cancelled) setUser(session?.user ?? null);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [configured]);

  return { user, loading, configured };
}
