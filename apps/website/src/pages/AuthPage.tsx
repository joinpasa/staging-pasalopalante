import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@shared/contexts/AuthContext";
import { useLanguage } from "@shared/contexts/LanguageContext";
import { getAuthErrorMessage } from "@shared/lib/authErrors";
import { supabase } from "@shared/integrations/supabase/client";
import { Button } from "@shared/components/ui/button";
import { Input } from "@shared/components/ui/input";
import { Label } from "@shared/components/ui/label";
import { toast } from "sonner";
import { CheckCircle2, KeyRound } from "lucide-react";
import Footer from "@/components/Footer";

function safeNext(raw: string | null): string {
  if (!raw) return "/account";
  // Only allow same-origin relative paths.
  if (!raw.startsWith("/") || raw.startsWith("//")) return "/account";
  return raw;
}

type AuthTab = "signin" | "signup";

const AuthPage = () => {
  const { t } = useLanguage();
  const { signIn, signInWithMagicLink, resetPassword, user, loading } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = safeNext(params.get("next"));
  const [tab, setTab] = useState<AuthTab>(params.get("tab") === "signup" ? "signup" : "signin");
  const [busy, setBusy] = useState(false);
  const [magicSentTo, setMagicSentTo] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [needsReset, setNeedsReset] = useState<{ email: string; sent: boolean } | null>(null);

  function selectTab(newTab: AuthTab) {
    setTab(newTab);
    setShowPassword(false); // password sign-in is a Sign in-tab-only affordance
  }

  useEffect(() => {
    if (!loading && user) navigate(next, { replace: true });
  }, [user, loading, navigate, next]);

  const handleMagicLink = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email"));
    setBusy(true);
    const { error } = await signInWithMagicLink(email);
    setBusy(false);
    if (error) toast.error(t.auth.magicError);
    else setMagicSentTo(email);
  };

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email"));
    setBusy(true);
    const { error } = await signIn(email, String(fd.get("password")));
    if (error && "code" in error && error.code === "invalid_credentials") {
      // Wrong password could just mean "wrong password" - but it's also
      // exactly what every migrated/never-set-a-password account sees on
      // any password attempt, since none of them have a real one. Check
      // has_password (public profiles read) to tell the two apart instead
      // of showing a generic error to someone who was never going to get in
      // this way no matter what they typed.
      const { data: profile } = await supabase.from("profiles").select("has_password").ilike("email", email).maybeSingle();
      if (profile && profile.has_password === false) {
        setBusy(false);
        setNeedsReset({ email, sent: false });
        return;
      }
    }
    setBusy(false);
    if (error) toast.error(getAuthErrorMessage(error));
    else navigate(next);
  };

  const handleSendReset = async () => {
    if (!needsReset) return;
    setBusy(true);
    const { error } = await resetPassword(needsReset.email);
    setBusy(false);
    if (error) toast.error(getAuthErrorMessage(error));
    else setNeedsReset({ ...needsReset, sent: true });
  };

  return (
    <div className="min-h-screen bg-warm-cream flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-20">
        <Link to="/" className="mb-8">
          <img src="/logo-PPL.png" alt="Pásalo Pa'lante" className="h-12" />
        </Link>
        <div className="w-full max-w-md bg-background rounded-2xl shadow-sm border border-border p-8">
          {!magicSentTo && !needsReset && (
            <div className="flex items-center gap-1 rounded-full bg-warm-sand/60 p-1 mb-6" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={tab === "signin"}
                onClick={() => selectTab("signin")}
                className={`flex-1 rounded-full py-2 text-sm font-semibold transition-colors ${
                  tab === "signin" ? "bg-background text-foreground shadow-sm" : "text-foreground/50 hover:text-foreground/70"
                }`}
              >
                {t.auth.signInTab}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={tab === "signup"}
                onClick={() => selectTab("signup")}
                className={`flex-1 rounded-full py-2 text-sm font-semibold transition-colors ${
                  tab === "signup" ? "bg-background text-foreground shadow-sm" : "text-foreground/50 hover:text-foreground/70"
                }`}
              >
                {t.auth.signUpTab}
              </button>
            </div>
          )}

          <h1 className="font-serif text-3xl text-center mb-2">
            {tab === "signup" ? t.auth.createAccountHeading : t.auth.title}
          </h1>
          <p className="text-sm text-foreground/70 text-center mb-6">
            {tab === "signup" ? t.auth.createAccountSubtitle : t.auth.subtitle}
          </p>

          {magicSentTo ? (
            <div className="text-center space-y-4 py-6">
              <CheckCircle2 className="mx-auto text-primary" size={40} />
              <h2 className="font-serif text-xl">{t.auth.magicSent}</h2>
              <p className="text-sm text-foreground/70">
                {t.auth.magicSentBody.replace("{email}", magicSentTo)}
              </p>
            </div>
          ) : needsReset ? (
            <div className="text-center space-y-4 py-6">
              <KeyRound className="mx-auto text-primary" size={40} />
              <h2 className="font-serif text-xl">{t.auth.welcomeBackHeading}</h2>
              {needsReset.sent ? (
                <p className="text-sm text-foreground/70">{t.auth.resetLinkSent.replace("{email}", needsReset.email)}</p>
              ) : (
                <>
                  <p className="text-sm text-foreground/70">{t.auth.welcomeBackBody}</p>
                  <Button type="button" className="w-full" disabled={busy} onClick={handleSendReset}>
                    {busy ? "…" : t.auth.sendResetLink}
                  </Button>
                </>
              )}
              <button
                type="button"
                onClick={() => setNeedsReset(null)}
                className="text-sm text-foreground/60 hover:text-foreground underline underline-offset-4"
              >
                {t.auth.tryDifferentEmail}
              </button>
            </div>
          ) : (
            <>
              <form onSubmit={handleMagicLink} className="space-y-4">
                <div>
                  <Label htmlFor="magic-email">{t.auth.email}</Label>
                  <Input id="magic-email" name="email" type="email" required autoComplete="email" />
                </div>
                <Button type="submit" className="w-full" disabled={busy}>
                  {busy ? "…" : tab === "signup" ? t.auth.magicSendSignup : t.auth.magicSend}
                </Button>
                <p className="text-xs text-foreground/60 text-center">{t.auth.magicHint}</p>
              </form>

              {tab === "signin" && (
                <div className="mt-6 pt-6 border-t border-border">
                  {!showPassword ? (
                    <button
                      type="button"
                      onClick={() => setShowPassword(true)}
                      className="w-full text-sm text-foreground/60 hover:text-foreground underline underline-offset-4"
                    >
                      {t.auth.orPassword}
                    </button>
                  ) : (
                    <form onSubmit={handleSignIn} className="space-y-4">
                      <div>
                        <Label htmlFor="signin-email">{t.auth.email}</Label>
                        <Input id="signin-email" name="email" type="email" required autoComplete="email" />
                      </div>
                      <div>
                        <Label htmlFor="signin-password">{t.auth.password}</Label>
                        <Input id="signin-password" name="password" type="password" required autoComplete="current-password" autoCapitalize="none" autoCorrect="off" spellCheck={false} />
                      </div>
                      <Button type="submit" variant="outline" className="w-full" disabled={busy}>
                        {busy ? "…" : t.auth.signIn}
                      </Button>
                    </form>
                  )}
                </div>
              )}
            </>
          )}

          <p className="mt-6 pt-6 border-t border-border text-sm text-center text-foreground/70">
            {t.auth.newHerePrompt}{" "}
            <Link to="/commit" className="text-primary underline underline-offset-4 font-medium">
              {t.auth.newHereCta}
            </Link>
          </p>
        </div>

        <Link to="/" className="text-sm text-foreground/60 hover:text-foreground mt-6 mb-12">
          ← {t.auth.backHome}
        </Link>
      </div>
      <Footer />
    </div>
  );
};

export default AuthPage;
