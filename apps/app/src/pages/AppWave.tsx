import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle2, HeartHandshake } from "lucide-react";

import { useAuth } from "@shared/contexts/AuthContext";
import { supabase } from "@shared/integrations/supabase/client";

/**
 * Lands here after scanning someone's pass code (/wave?ref=CODE).
 *
 * A brand-new visitor gets routed to /join instead (the scan-to-signup path
 * already works via the referred_by attribution on account creation). This
 * page is specifically for two existing members meeting in person: it logs
 * the hand-off and offers to log an act of kindness with them right away.
 */
export default function AppWave() {
  const { user, loading } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const code = (searchParams.get("ref") ?? "").trim();
  const [status, setStatus] = useState<"checking" | "connected" | "self" | "invalid">("checking");
  const [name, setName] = useState("");
  const [ownerId, setOwnerId] = useState("");

  // Once any outcome is resolved, this effect must never run its logic
  // again for this mount — without it, clearing ?ref= from the URL below
  // (itself necessary, see that comment) changes `code`, which re-fires
  // this effect and would otherwise immediately overwrite a just-set
  // "connected"/"self" status back down to "invalid" (no code left in
  // the URL to look up) before the person ever saw it.
  const resolvedRef = useRef(false);

  useEffect(() => {
    if (resolvedRef.current) return;
    if (loading) return;
    if (!user) {
      navigate(code ? `/join?ref=${encodeURIComponent(code)}` : "/join", { replace: true });
      return;
    }
    if (!code) {
      setStatus("invalid");
      return;
    }

    // Once resolved (any outcome), strip ?ref= from the URL — otherwise a
    // plain refresh keeps replaying the exact same request against the
    // exact same code forever. That's especially bad for a code that's
    // genuinely invalid or the person's own: without this, there was no
    // way to "refresh past" that dead end short of manually navigating
    // away, and refreshing looked identical to trying again and failing
    // again.
    function resolve(next: "connected" | "self" | "invalid", data?: { name: string; ownerId: string }) {
      resolvedRef.current = true;
      if (data) {
        setName(data.name);
        setOwnerId(data.ownerId);
      }
      setStatus(next);
      navigate("/wave", { replace: true });
    }

    // log_pass_handoff has no idempotency of its own — every call inserts a
    // fresh row, with nothing to stop a page refresh or browser back/forward
    // on this same /wave?ref=CODE URL from logging the same real-world
    // hand-off again. The dedup in my_connections()/my_connections_count()
    // means this never shows up as a wrong count, but it's still needless
    // duplicate rows for what is, from the person's perspective, one scan —
    // this session-scoped guard catches that common case client-side.
    const cacheKey = `wave_logged_${code}`;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      try {
        const { name: cachedName, ownerId: cachedOwnerId } = JSON.parse(cached);
        resolve("connected", { name: cachedName || "a fellow member", ownerId: cachedOwnerId || "" });
        return;
      } catch { /* fall through to a fresh log */ }
    }
    (async () => {
      const { data, error } = await supabase.rpc("log_pass_handoff", { _code: code });
      const row = Array.isArray(data) ? data[0] : data;
      if (error || !row?.from_user_id) {
        resolve("invalid");
        return;
      }
      const resolvedName = row.from_name || "a fellow member";
      if (row.is_self) {
        resolve("self", { name: resolvedName, ownerId: row.from_user_id });
        return;
      }
      resolve("connected", { name: resolvedName, ownerId: row.from_user_id });
      sessionStorage.setItem(cacheKey, JSON.stringify({ name: resolvedName, ownerId: row.from_user_id }));
    })();
  }, [user, loading, code, navigate]);

  if (loading || status === "checking") {
    return (
      <div className="flex flex-1 items-center justify-center px-6 py-24 text-sm text-muted-foreground">
        Connecting…
      </div>
    );
  }

  if (status === "invalid") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-16 text-center">
        <p className="text-sm text-muted-foreground">That pass code isn't valid.</p>
        <Link to="/pass" className="text-sm font-semibold text-app-coral underline">
          Back to Pass
        </Link>
      </div>
    );
  }

  if (status === "self") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-16 text-center">
        <p className="text-sm text-muted-foreground">
          That's your own pass code! Share it with someone else to connect with them.
        </p>
        <Link to="/pass" className="text-sm font-semibold text-app-coral underline">
          Back to Pass
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      <CheckCircle2 className="h-12 w-12 text-app-coral" />
      <h1 className="font-sans text-2xl font-extrabold text-foreground">
        You connected with {name}!
      </h1>
      <p className="text-sm leading-relaxed text-muted-foreground">
        The hand-off is logged. Now pass it forward — log an act of kindness with them.
      </p>
      <button
        type="button"
        onClick={() =>
          navigate(`/log?with=${encodeURIComponent(name)}&toUserId=${encodeURIComponent(ownerId)}`)
        }
        className="flex h-14 w-full max-w-xs items-center justify-center gap-2 rounded-2xl bg-app-coral font-semibold text-app-surface"
      >
        <HeartHandshake className="h-4 w-4" />
        Log an act of kindness
      </button>
      <Link to="/" className="text-sm font-semibold text-app-coral underline">
        Maybe later
      </Link>
    </div>
  );
}
