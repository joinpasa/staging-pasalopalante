import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@shared/contexts/AuthContext";
import { useLanguage } from "@shared/contexts/LanguageContext";
import { getAuthErrorMessage } from "@shared/lib/authErrors";
import { Button } from "@shared/components/ui/button";
import { Input } from "@shared/components/ui/input";
import { Label } from "@shared/components/ui/label";
import { toast } from "sonner";
import { CheckCircle2 } from "lucide-react";
import Footer from "@/components/Footer";

function safeNext(raw: string | null): string {
  if (!raw) return "/account";
  // Only allow same-origin relative paths.
  if (!raw.startsWith("/") || raw.startsWith("//")) return "/account";
  return raw;
}

const AuthPage = () => {
  const { t } = useLanguage();
  const { signIn, signInWithMagicLink, user, loading } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = safeNext(params.get("next"));
  const [busy, setBusy] = useState(false);
  const [magicSentTo, setMagicSentTo] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

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
    setBusy(true);
    const { error } = await signIn(String(fd.get("email")), String(fd.get("password")));
    setBusy(false);
    if (error) toast.error(getAuthErrorMessage(error));
    else navigate(next);
  };

  return (
    <div className="min-h-screen bg-warm-cream flex flex-col items-center justify-center px-6 py-20">
      <Link to="/" className="mb-8">
        <img src="/logo-PPL.png" alt="Pásalo Pa'lante" className="h-12" />
      </Link>
      <div className="w-full max-w-md bg-background rounded-2xl shadow-sm border border-border p-8">
        <h1 className="font-serif text-3xl text-center mb-2">{t.auth.title}</h1>
        <p className="text-sm text-foreground/70 text-center mb-6">{t.auth.subtitle}</p>

        {magicSentTo ? (
          <div className="text-center space-y-4 py-6">
            <CheckCircle2 className="mx-auto text-primary" size={40} />
            <h2 className="font-serif text-xl">{t.auth.magicSent}</h2>
            <p className="text-sm text-foreground/70">
              {t.auth.magicSentBody.replace("{email}", magicSentTo)}
            </p>
          </div>
        ) : (
          <>
            <form onSubmit={handleMagicLink} className="space-y-4">
              <div>
                <Label htmlFor="magic-email">{t.auth.email}</Label>
                <Input id="magic-email" name="email" type="email" required autoComplete="email" />
              </div>
              <Button type="submit" className="w-full" disabled={busy}>
                {busy ? "…" : t.auth.magicSend}
              </Button>
              <p className="text-xs text-foreground/60 text-center">{t.auth.magicHint}</p>
            </form>

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
      <Footer />
    </div>
  );
};

export default AuthPage;
