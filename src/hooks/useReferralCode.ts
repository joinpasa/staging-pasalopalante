import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/** Fetches the signed-in user's opaque referral code (null when signed out). */
export function useReferralCode(userId?: string | null) {
  const [code, setCode] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setCode(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("referral_code")
        .eq("user_id", userId)
        .maybeSingle();
      if (!cancelled) setCode((data as { referral_code?: string } | null)?.referral_code ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  return code;
}
