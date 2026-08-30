import { useEffect } from "react";

import { PENDING_PROFILE_KEY, type PendingProfile } from "@/lib/pendingSignup";
import { useAuth } from "@shared/contexts/AuthContext";
import { supabase } from "@shared/integrations/supabase/client";

/**
 * Applies the name/country collected in the quick account-setup form
 * (AppJoin) once a real session exists.
 *
 * The commitment submitted right after signup happens before the person has
 * clicked their verification link (by design — the onboarding walkthrough
 * doesn't wait on that), so there's no authenticated session yet at that
 * point. submit-commitment's own profile sync requires one, so it silently
 * never runs — this fills the gap the moment a session actually shows up.
 */
export default function ProfileBackfill() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    const raw = localStorage.getItem(PENDING_PROFILE_KEY);
    if (!raw) return;
    localStorage.removeItem(PENDING_PROFILE_KEY);

    let pending: PendingProfile | null = null;
    try {
      pending = JSON.parse(raw);
    } catch {
      return;
    }
    if (!pending) return;

    const update: Record<string, string> = {};
    if (pending.firstName) update.first_name = pending.firstName;
    if (pending.lastName) update.last_name = pending.lastName;
    if (pending.country) update.country = pending.country;
    if (Object.keys(update).length === 0) return;

    void supabase.from("profiles").update(update).eq("user_id", user.id);
  }, [user]);

  return null;
}
