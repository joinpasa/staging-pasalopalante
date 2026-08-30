import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import { KeyRound, Mail, X } from "lucide-react";

import { useAuth } from "@shared/contexts/AuthContext";
import { supabase } from "@shared/integrations/supabase/client";

export const PENDING_EMAIL_KEY = "ppl-pending-email";

/** Extra, harder-to-miss nudge for a fully anonymous visitor: shows after a
 *  short delay or on first scroll, whichever comes first — the thin top
 *  banner alone was easy to skim past. */
function JoinPopup() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setOpen(true), 3000);
    const onScroll = () => setOpen(true);
    window.addEventListener("scroll", onScroll, { once: true, passive: true });
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom))] left-4 right-4 z-[65] mx-auto max-w-md"
          role="dialog"
          aria-label="Join Pásalo Pa'lante"
        >
          <div className="flex items-center gap-3 rounded-2xl border border-app-coral bg-app-surface p-4 shadow-xl">
            <div className="flex-1">
              <p className="font-sans text-sm font-bold text-foreground">Join the chain</p>
              <p className="text-xs text-muted-foreground">
                Create an account to log acts, get your Pass, and see your badges.
              </p>
            </div>
            <Link
              to="/join"
              className="shrink-0 rounded-full bg-app-coral px-4 py-2 text-xs font-semibold text-app-surface"
            >
              Join
            </Link>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Dismiss"
              className="shrink-0 text-foreground/40 hover:text-foreground/70"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Persistent nudge shown across the app (except the join screen itself,
 * which already has its own verification messaging):
 *  - not verified yet (no session): offer to resend the magic link
 *  - verified but never set a password: offer a quick "set password" form
 *  - both done: renders nothing
 */
export default function VerificationBanner() {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [hasPassword, setHasPassword] = useState(true);
  const [resending, setResending] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [pw, setPw] = useState("");
  const [pwConfirm, setPwConfirm] = useState("");
  const [savingPw, setSavingPw] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!user) return;
    localStorage.removeItem(PENDING_EMAIL_KEY);
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("has_password")
        .eq("user_id", user.id)
        .maybeSingle();
      setHasPassword(!!(data as { has_password?: boolean } | null)?.has_password);
    })();
  }, [user]);

  if (loading || location.pathname.startsWith("/join") || dismissed) return null;

  const pendingEmail = typeof window !== "undefined" ? localStorage.getItem(PENDING_EMAIL_KEY) : null;

  if (!user) {
    if (!pendingEmail) {
      // Never started signing up on this device — Wall is the only screen
      // they can reach, so make sure there's always a visible way to /join.
      return (
        <>
          <div className="flex items-center gap-2 bg-app-coral-tint px-4 py-2.5 text-xs text-foreground">
            <Mail className="h-4 w-4 shrink-0 text-app-coral" />
            <span className="flex-1">Join to unlock the full app.</span>
            <Link to="/join" className="shrink-0 font-semibold text-app-coral underline">
              Join or log in →
            </Link>
          </div>
          <JoinPopup />
        </>
      );
    }
    const resend = async () => {
      setResending(true);
      const { error } = await supabase.auth.signInWithOtp({
        email: pendingEmail,
        options: { shouldCreateUser: false },
      });
      setResending(false);
      if (error) toast.error("Couldn't resend the link. Please try again shortly.");
      else toast.success("Sign-in link resent — check your email.");
    };
    return (
      <div className="flex items-center gap-2 bg-app-coral-tint px-4 py-2.5 text-xs text-foreground">
        <Mail className="h-4 w-4 shrink-0 text-app-coral" />
        <span className="flex-1">Verify your email to unlock the full app.</span>
        <button
          type="button"
          onClick={resend}
          disabled={resending}
          className="shrink-0 font-semibold text-app-coral underline disabled:opacity-60"
        >
          {resending ? "Sending…" : "Resend link"}
        </button>
      </div>
    );
  }

  if (hasPassword) return null;

  const savePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pw.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }
    if (pw !== pwConfirm) {
      toast.error("Passwords don't match. Watch out for a password manager auto-filling a different one.");
      return;
    }
    setSavingPw(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    if (!error) await supabase.from("profiles").update({ has_password: true }).eq("user_id", user.id);
    setSavingPw(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Password set. You can now sign in with email + password.");
    setPw("");
    setPwConfirm("");
    setShowPasswordForm(false);
    setHasPassword(true);
  };

  return (
    <div className="bg-app-coral-tint px-4 py-2.5 text-xs text-foreground">
      <div className="flex items-center gap-2">
        <KeyRound className="h-4 w-4 shrink-0 text-app-coral" />
        <span className="flex-1">Set up a password for faster sign-in.</span>
        {!showPasswordForm && (
          <>
            <button
              type="button"
              onClick={() => setShowPasswordForm(true)}
              className="shrink-0 font-semibold text-app-coral underline"
            >
              Set password
            </button>
            <button
              type="button"
              onClick={() => setDismissed(true)}
              aria-label="Dismiss"
              className="shrink-0 text-muted-foreground"
            >
              ×
            </button>
          </>
        )}
      </div>
      {showPasswordForm && (
        <form onSubmit={savePassword} className="mt-2 space-y-2">
          <input
            type="password"
            autoComplete="new-password"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            minLength={8}
            required
            autoFocus
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            placeholder="New password"
            className="h-9 w-full rounded-lg border border-border bg-app-surface px-2.5 text-sm text-foreground outline-none focus:border-app-coral"
          />
          <input
            type="password"
            autoComplete="new-password"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            minLength={8}
            required
            value={pwConfirm}
            onChange={(e) => setPwConfirm(e.target.value)}
            placeholder="Confirm password"
            className="h-9 w-full rounded-lg border border-border bg-app-surface px-2.5 text-sm text-foreground outline-none focus:border-app-coral"
          />
          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={savingPw}
              className="h-9 shrink-0 rounded-lg bg-app-coral px-3 text-xs font-semibold text-app-surface disabled:opacity-60"
            >
              {savingPw ? "…" : "Save"}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowPasswordForm(false);
                setPw("");
                setPwConfirm("");
              }}
              className="h-9 shrink-0 rounded-lg border border-border bg-app-surface px-3 text-xs font-semibold text-foreground"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
