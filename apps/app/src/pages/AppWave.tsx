import { useEffect, useState } from "react";
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
  const [status, setStatus] = useState<"checking" | "connected" | "invalid">("checking");
  const [name, setName] = useState("");
  const [ownerId, setOwnerId] = useState("");

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate(code ? `/join?ref=${encodeURIComponent(code)}` : "/join", { replace: true });
      return;
    }
    if (!code) {
      setStatus("invalid");
      return;
    }
    (async () => {
      const { data, error } = await supabase.rpc("log_pass_handoff", { _code: code });
      const row = Array.isArray(data) ? data[0] : data;
      if (error || !row?.from_user_id) {
        setStatus("invalid");
        return;
      }
      setName(row.from_name || "a fellow member");
      setOwnerId(row.from_user_id);
      setStatus("connected");
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
