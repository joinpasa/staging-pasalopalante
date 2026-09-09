import { useEffect, useState } from "react";
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

  if (!pending || state === "done") return null;

  const confirm = async () => {
    setState("verifying");
    const { error } = await supabase.auth.verifyOtp({ token_hash: pending.tokenHash, type: pending.type });
    setState(error ? "error" : "done");
  };

  return (
    <div
      className="fixed inset-x-4 top-4 z-[80] mx-auto max-w-sm rounded-2xl border border-neutral-200 bg-white p-4 shadow-xl"
      role="dialog"
      aria-label="Finish signing in"
    >
      {state === "error" ? (
        <p className="text-sm text-neutral-800">
          That link expired or was already used. Request a new one to continue.
        </p>
      ) : (
        <>
          <p className="text-sm font-semibold text-neutral-900">Tap to finish signing in</p>
          <button
            type="button"
            onClick={confirm}
            disabled={state === "verifying"}
            className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-neutral-900 px-4 py-2 text-xs font-semibold text-white disabled:opacity-60"
          >
            {state === "verifying" ? "…" : "Confirm"}
          </button>
        </>
      )}
    </div>
  );
}
