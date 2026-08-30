import type { ReactNode } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@shared/contexts/AuthContext";

/**
 * Gates a route behind a real Supabase session. Supabase's magic-link flow
 * only ever creates a session once the link is clicked, so "no session" here
 * always means "hasn't verified their email yet" — sends them to the Wall,
 * the one screen unverified visitors are allowed to use freely.
 *
 * Exception: someone scanning a Pass QR code (pasalopalante.com/app?ref=...)
 * lands here with a `ref` param — send them to join (carrying the code)
 * instead of the Wall, so the referral isn't dropped.
 */
export default function RequireVerified({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const [searchParams] = useSearchParams();
  if (loading) return null;
  if (!user) {
    const ref = searchParams.get("ref");
    if (ref) return <Navigate to={`/join?ref=${encodeURIComponent(ref)}`} replace />;
    return <Navigate to="/wall" replace />;
  }
  return <>{children}</>;
}
