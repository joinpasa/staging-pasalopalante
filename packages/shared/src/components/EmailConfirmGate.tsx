import { useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { supabase } from "@shared/integrations/supabase/client";

/**
 * Auth emails (signup, magic-link sign-in) point their button at this app's
 * own domain instead of Supabase's raw /auth/v1/verify endpoint — see
 * auth-email-hook/index.ts, which appends confirm_token_hash/confirm_type
 * to the redirect URL instead. That alone stops a plain-HTTP prefetching
 * scanner (a bare fetch/HEAD request, which most link-safety scanners are)
 * from silently consuming the one-time token before the recipient opens
 * the email — but some corporate/email security scanners go further and
 * fully render the destination in a headless browser specifically to catch
 * JS-based phishing redirects, which would run this page's JS too, so an
 * auto-verify-on-load effect (the first version of this fix) can still get
 * silently burned by those. This instead renders a real, visible "tap to
 * confirm" step and only calls verifyOtp on an explicit click — something
 * no scanner simulates, automated or not. A genuine visit costs one extra
 * tap; a scanner's visit costs nothing (and burns nothing).
 *
 * Full-screen rather than a small corner card, and with an explicit "done"
 * state instead of just vanishing on success — a beta tester reported the
 * magic link "doesn't sign you in" when what had actually happened (this
 * was pre a separate scanner-burn fix) was that the confirm step was too
 * easy to miss and gave no feedback that it had worked. Nothing here
 * subverts the security property: it's still a real tap on a real button,
 * just one that's now impossible to overlook.
 */
export default function EmailConfirmGate() {
  const [pending, setPending] = useState<{ tokenHash: string; type: string } | null>(null);
  const [state, setState] = useState<"idle" | "verifying" | "done" | "error">("idle");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenHash = params.get("confirm_token_hash");
    const type = params.get("confirm_type");
    if (!tokenHash || !type) return;
    setPending({ tokenHash, type });

    // Strip immediately so a reload or back-navigation can't retry an
    // already-consumed (or already-confirmed) token later.
    params.delete("confirm_token_hash");
    params.delete("confirm_type");
    const query = params.toString();
    window.history.replaceState(
      {},
      "",
      `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`,
    );
  }, []);

  // Auto-dismiss the success state after a beat — long enough to register
  // as real confirmation, short enough not to block the app underneath
  // (which has already updated to the signed-in view via AuthContext's own
  // onAuthStateChange listener by the time this fires).
  useEffect(() => {
    if (state !== "done") return;
    const id = setTimeout(() => setPending(null), 1600);
    return () => clearTimeout(id);
  }, [state]);

  if (!pending) return null;

  const confirm = async () => {
    setState("verifying");
    const { error } = await supabase.auth.verifyOtp({ token_hash: pending.tokenHash, type: pending.type });
    setState(error ? "error" : "done");
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex flex-col items-center justify-center gap-4 bg-warm-cream px-6 text-center"
      role="dialog"
      aria-label="Finish signing in"
    >
      {state === "error" ? (
        <>
          <p className="text-base font-semibold text-foreground">That link expired or was already used.</p>
          <p className="max-w-xs text-sm text-muted-foreground">
            Go back and request a new sign-in link (or code) to continue.
          </p>
          <button
            type="button"
            onClick={() => setPending(null)}
            className="mt-2 rounded-full border border-border px-5 py-2.5 text-sm font-semibold text-foreground"
          >
            Dismiss
          </button>
        </>
      ) : state === "done" ? (
        <>
          <CheckCircle2 className="h-12 w-12 text-app-coral" />
          <p className="text-base font-semibold text-foreground">You're signed in!</p>
        </>
      ) : (
        <>
          <p className="text-lg font-semibold text-foreground">Tap to finish signing in</p>
          <p className="max-w-xs text-sm text-muted-foreground">
            One more tap confirms it's really you opening this link.
          </p>
          <button
            type="button"
            onClick={confirm}
            disabled={state === "verifying"}
            className="mt-2 rounded-full bg-app-coral px-8 py-3 text-sm font-semibold text-app-surface disabled:opacity-60"
          >
            {state === "verifying" ? "…" : "Confirm"}
          </button>
        </>
      )}
    </div>
  );
}
