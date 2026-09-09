import { useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ScrollToTop from "@/components/ScrollToTop";
import SEO from "@/components/SEO";
import { Button } from "@shared/components/ui/button";
import { Input } from "@shared/components/ui/input";
import { Label } from "@shared/components/ui/label";
import { Skeleton } from "@shared/components/ui/skeleton";
import { toast } from "sonner";
import { Eye, EyeOff, KeyRound, CheckCircle2 } from "lucide-react";
import { useAuth } from "@shared/contexts/AuthContext";
import { supabase } from "@shared/integrations/supabase/client";
import { PASSWORD_HINT, validatePassword } from "@shared/lib/passwordStrength";

/**
 * Where every "reset your password" email link lands (AuthContext.tsx's
 * resetPassword() points here, from both the website and the app — same
 * origin now, so one page covers both). Supabase's own verify link, which
 * the email actually points to, establishes a recovery session via the URL
 * fragment before this page ever mounts (its JS client parses it
 * automatically), so by the time `loading` clears here, `user` is already
 * set if the link was valid.
 */
export default function ResetPasswordPage() {
  const { user, loading } = useAuth();
  const [pw, setPw] = useState("");
  const [pwConfirm, setPwConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validatePassword(pw);
    if (validationError) {
      toast.error(validationError);
      return;
    }
    if (pw !== pwConfirm) {
      toast.error("Passwords don't match. Watch out for a password manager auto-filling a different one.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    if (!error && user) {
      await supabase.from("profiles").update({ has_password: true }).eq("user_id", user.id);
    }
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Password updated.");
    setDone(true);
  };

  return (
    <div className="min-h-screen bg-warm-cream">
      <SEO
        title="Reset your password | Pásalo Pa'lante"
        description="Set a new password for your Pásalo Pa'lante account."
        path="/reset-password"
      />
      <Navbar />
      <main className="pt-32 pb-20 section-padding">
        <div className="max-w-md mx-auto bg-card border border-border rounded-2xl p-6 md:p-8">
          {loading ? (
            <Skeleton className="h-40 w-full rounded-xl" />
          ) : done ? (
            <div className="text-center space-y-3">
              <CheckCircle2 className="mx-auto text-primary" size={40} />
              <h1 className="font-serif text-2xl text-foreground">Password updated</h1>
              <p className="text-sm text-foreground/70">
                You can now sign in with your email and new password.
              </p>
              <Link
                to="/account"
                className="inline-flex items-center justify-center rounded-full bg-warm-earth text-warm-cream px-6 py-3 font-medium hover:opacity-90 transition"
              >
                Go to your account
              </Link>
            </div>
          ) : !user ? (
            <div className="text-center space-y-3">
              <h1 className="font-serif text-2xl text-foreground">This link has expired</h1>
              <p className="text-sm text-foreground/70">
                Password reset links only work once and expire after a while. Request a new one to
                continue.
              </p>
              <Link to="/auth" className="text-primary font-medium underline-offset-2 hover:underline">
                Back to sign in →
              </Link>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 mb-6">
                <KeyRound className="text-primary" size={20} />
                <div>
                  <h1 className="font-serif text-2xl text-foreground">Reset your password</h1>
                  <p className="text-sm text-foreground/60">Choose a new password for your account.</p>
                </div>
              </div>
              <form onSubmit={submit} className="space-y-3">
                <div>
                  <Label htmlFor="new-pw">New password</Label>
                  <div className="relative">
                    <Input
                      id="new-pw"
                      type={showPw ? "text" : "password"}
                      autoComplete="new-password"
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                      minLength={8}
                      autoFocus
                      value={pw}
                      onChange={(e) => setPw(e.target.value)}
                      required
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw((v) => !v)}
                      aria-label={showPw ? "Hide password" : "Show password"}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/50 hover:text-foreground"
                    >
                      {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <div>
                  <Label htmlFor="new-pw-confirm">Confirm password</Label>
                  <Input
                    id="new-pw-confirm"
                    type={showPw ? "text" : "password"}
                    autoComplete="new-password"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    minLength={8}
                    value={pwConfirm}
                    onChange={(e) => setPwConfirm(e.target.value)}
                    required
                  />
                </div>
                <p className="text-xs text-foreground/50">{PASSWORD_HINT}</p>
                <Button type="submit" disabled={busy} className="w-full">
                  {busy ? "…" : "Save new password"}
                </Button>
              </form>
            </>
          )}
        </div>
      </main>
      <Footer />
      <ScrollToTop />
    </div>
  );
}
