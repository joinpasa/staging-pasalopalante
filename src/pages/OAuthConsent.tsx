import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

// Minimal typed shim for the beta supabase.auth.oauth namespace.
type OAuthClient = { name?: string; client_name?: string; logo_uri?: string; client_uri?: string };
type OAuthDetails = {
  client?: OAuthClient;
  scope?: string;
  scopes?: string[];
  redirect_uri?: string;
  redirect_url?: string;
  redirect_to?: string;
};
type OAuthResult = { redirect_url?: string; redirect_to?: string };
type OAuthNs = {
  getAuthorizationDetails: (id: string) => Promise<{ data: OAuthDetails | null; error: { message: string } | null }>;
  approveAuthorization: (id: string) => Promise<{ data: OAuthResult | null; error: { message: string } | null }>;
  denyAuthorization: (id: string) => Promise<{ data: OAuthResult | null; error: { message: string } | null }>;
};
const oauth = (supabase.auth as unknown as { oauth: OAuthNs }).oauth;

export default function OAuthConsent() {
  const [params] = useSearchParams();
  const authorizationId = params.get("authorization_id") ?? "";
  const { user, loading } = useAuth();
  const [details, setDetails] = useState<OAuthDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!authorizationId) {
      setError("Missing authorization_id");
      return;
    }
    if (!user) {
      const next = window.location.pathname + window.location.search;
      window.location.href = "/auth?next=" + encodeURIComponent(next);
      return;
    }
    let active = true;
    (async () => {
      try {
        const { data, error } = await oauth.getAuthorizationDetails(authorizationId);
        if (!active) return;
        if (error) {
          setError(error.message);
          return;
        }
        const immediate = data?.redirect_url ?? data?.redirect_to;
        if (immediate && !data?.client) {
          window.location.href = immediate;
          return;
        }
        setDetails(data);
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : "Failed to load authorization");
      }
    })();
    return () => {
      active = false;
    };
  }, [authorizationId, user, loading]);

  async function decide(approve: boolean) {
    setBusy(true);
    try {
      const { data, error } = approve
        ? await oauth.approveAuthorization(authorizationId)
        : await oauth.denyAuthorization(authorizationId);
      if (error) {
        setBusy(false);
        setError(error.message);
        return;
      }
      const target = data?.redirect_url ?? data?.redirect_to;
      if (!target) {
        setBusy(false);
        setError("No redirect returned by the authorization server.");
        return;
      }
      window.location.href = target;
    } catch (e) {
      setBusy(false);
      setError(e instanceof Error ? e.message : "Authorization failed");
    }
  }

  const clientName = details?.client?.name ?? details?.client?.client_name ?? "an app";
  const scopeList: string[] = details?.scopes ?? (details?.scope ? details.scope.split(/\s+/).filter(Boolean) : []);

  return (
    <main className="min-h-screen bg-warm-cream flex flex-col items-center justify-center px-6 py-20">
      <Link to="/" className="mb-8">
        <img src="/logo-PPL.png" alt="Pásalo Pa'lante" className="h-12" />
      </Link>
      <div className="w-full max-w-md bg-background rounded-2xl shadow-sm border border-border p-8">
        {error ? (
          <>
            <h1 className="font-serif text-2xl mb-3">Something went wrong</h1>
            <p className="text-sm text-foreground/70 mb-4">{error}</p>
            <Link to="/" className="text-sm text-primary underline underline-offset-4">
              Back to home
            </Link>
          </>
        ) : !details ? (
          <p className="text-sm text-foreground/70 text-center">Loading…</p>
        ) : (
          <>
            <h1 className="font-serif text-2xl mb-2">
              Connect {clientName} to Pásalo Pa'lante
            </h1>
            <p className="text-sm text-foreground/70 mb-6">
              {clientName} will be able to call this app's enabled tools while you are signed in as{" "}
              <strong>{user?.email}</strong>.
            </p>

            {scopeList.length > 0 && (
              <div className="mb-6">
                <div className="text-xs uppercase tracking-wider text-foreground/60 mb-2">
                  Requested access
                </div>
                <ul className="text-sm space-y-1 list-disc pl-5">
                  {scopeList.map((s) => (
                    <li key={s}>{humanScope(s)}</li>
                  ))}
                </ul>
              </div>
            )}

            <p className="text-xs text-foreground/60 mb-6">
              This does not bypass this app's permissions or backend policies. You can revoke access at any time.
            </p>

            <div className="flex gap-3">
              <Button className="flex-1" disabled={busy} onClick={() => decide(true)}>
                {busy ? "…" : "Approve"}
              </Button>
              <Button variant="outline" className="flex-1" disabled={busy} onClick={() => decide(false)}>
                Cancel
              </Button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}

function humanScope(s: string): string {
  switch (s) {
    case "openid":
      return "Confirm your identity";
    case "email":
      return "Share your email address";
    case "profile":
      return "Share your basic profile";
    default:
      return `Additional permission: ${s}`;
  }
}
