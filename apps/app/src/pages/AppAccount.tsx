import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, KeyRound, Loader2, LogOut, Mail } from "lucide-react";

import PasswordForm from "@/components/app/PasswordForm";
import EmailForm from "@/components/app/EmailForm";
import PushToggle from "@/components/app/PushToggle";
import { useAuth } from "@shared/contexts/AuthContext";
import { useLanguage } from "@shared/contexts/LanguageContext";
import { LANGUAGES } from "@shared/i18n/translations";
import { supabase } from "@shared/integrations/supabase/client";
import { COUNTRIES } from "@shared/data/countries";
import { DISPLAY_NAME_RE, isReservedDisplayName } from "@shared/lib/displayName";

const inputClass =
  "w-full rounded-xl border border-border bg-app-surface px-3 py-3 text-sm text-foreground outline-none focus:border-app-coral";

/**
 * In-app account settings: profile info, password, notifications, logout.
 * Replaces the old "Account" link out to the website's /account page, which
 * doesn't share a session with the app on the current staging domains.
 */
export default function AppAccount() {
  const { user, signOut } = useAuth();
  const { lang, setLang, t } = useLanguage();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [country, setCountry] = useState("");
  const [nickname, setNickname] = useState("");
  const [savedNickname, setSavedNickname] = useState("");
  const [checkingNickname, setCheckingNickname] = useState(false);
  const [nicknameAvailable, setNicknameAvailable] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);
  const [hasPassword, setHasPassword] = useState(true);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("first_name, last_name, country, has_password, custom_display_name")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled) return;
      setFirstName(data?.first_name ?? "");
      setLastName(data?.last_name ?? "");
      setCountry(data?.country ?? "");
      setHasPassword(!!data?.has_password);
      setNickname(data?.custom_display_name ?? "");
      setSavedNickname(data?.custom_display_name ?? "");
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user]);

  const trimmedNickname = nickname.trim();
  const nicknameValid = !trimmedNickname || (DISPLAY_NAME_RE.test(trimmedNickname) && !isReservedDisplayName(trimmedNickname));

  // Debounced availability check — same rule as the website's nickname field.
  useEffect(() => {
    if (!trimmedNickname || !nicknameValid || trimmedNickname.toLowerCase() === savedNickname.toLowerCase()) {
      setNicknameAvailable(trimmedNickname && trimmedNickname.toLowerCase() === savedNickname.toLowerCase() ? true : null);
      return;
    }
    let cancelled = false;
    setCheckingNickname(true);
    const id = setTimeout(async () => {
      const { data } = await supabase.rpc("is_display_name_available", { candidate: trimmedNickname });
      if (!cancelled) {
        setNicknameAvailable(data === true);
        setCheckingNickname(false);
      }
    }, 450);
    return () => {
      cancelled = true;
      clearTimeout(id);
      setCheckingNickname(false);
    };
  }, [trimmedNickname, nicknameValid, savedNickname]);

  if (!user) return null;

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (trimmedNickname && (!nicknameValid || nicknameAvailable === false)) {
      toast.error(nicknameValid ? t.appAccount.nicknameTaken : t.appAccount.nicknameInvalid);
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        first_name: firstName.trim() || null,
        last_name: lastName.trim() || null,
        country: country || null,
        public_name_mode: trimmedNickname ? "custom" : "initial",
        custom_display_name: trimmedNickname || null,
      })
      .eq("user_id", user.id);
    setSaving(false);
    if (error) toast.error(t.appAccount.profileSaveError);
    else {
      toast.success(t.appAccount.profileUpdated);
      setSavedNickname(trimmedNickname);
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate("/wall", { replace: true });
  };

  return (
    <div className="px-5 pt-5 pb-8">
      <header className="mb-5 flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate("/")}
          aria-label={t.appAccount.back}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-app-surface"
        >
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </button>
        <h1 className="font-sans text-lg font-bold text-foreground">{t.appAccount.title}</h1>
      </header>

      {!loading && (
        <div className="space-y-6">
          <section>
            <h2 className="mb-3 font-sans text-sm font-bold text-foreground">{t.appAccount.profile}</h2>
            <form onSubmit={saveProfile} className="space-y-3 rounded-2xl bg-app-surface p-4">
              <div className="grid grid-cols-2 gap-3">
                <label className="block space-y-1.5">
                  <span className="text-xs font-semibold text-muted-foreground">{t.appAccount.firstName}</span>
                  <input
                    maxLength={60}
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    autoComplete="given-name"
                    className={inputClass}
                  />
                </label>
                <label className="block space-y-1.5">
                  <span className="text-xs font-semibold text-muted-foreground">{t.appAccount.lastName}</span>
                  <input
                    maxLength={60}
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    autoComplete="family-name"
                    className={inputClass}
                  />
                </label>
              </div>
              <label className="block space-y-1.5">
                <span className="text-xs font-semibold text-muted-foreground">{t.appAccount.country}</span>
                <select value={country} onChange={(e) => setCountry(e.target.value)} className={inputClass}>
                  <option value="">{t.appAccount.selectCountry}</option>
                  {COUNTRIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block space-y-1.5">
                <span className="text-xs font-semibold text-muted-foreground">{t.appAccount.nickname}</span>
                <input
                  maxLength={30}
                  placeholder={t.appAccount.nicknamePlaceholder}
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  className={inputClass}
                />
                <p className="text-[11px] leading-snug text-muted-foreground">
                  {trimmedNickname && isReservedDisplayName(trimmedNickname) ? (
                    <span className="text-destructive">{t.appAccount.nicknameReserved}</span>
                  ) : trimmedNickname && !nicknameValid ? (
                    <span className="text-destructive">{t.appAccount.nicknameLength}</span>
                  ) : checkingNickname ? (
                    <span className="inline-flex items-center gap-1">
                      <Loader2 className="h-3 w-3 animate-spin" /> {t.appAccount.checkingAvailability}
                    </span>
                  ) : trimmedNickname && nicknameAvailable === true ? (
                    <span className="text-app-teal">{t.appAccount.available}</span>
                  ) : trimmedNickname && nicknameAvailable === false ? (
                    <span className="text-destructive">{t.appAccount.alreadyTaken}</span>
                  ) : (
                    t.appAccount.nicknameHint
                  )}
                </p>
              </label>
              <button
                type="submit"
                disabled={saving}
                className="h-11 w-full rounded-xl bg-app-coral text-sm font-semibold text-app-surface disabled:opacity-60"
              >
                {saving ? t.appAccount.saving : t.appAccount.saveProfile}
              </button>
            </form>
          </section>

          <section>
            <h2 className="mb-3 font-sans text-sm font-bold text-foreground">{t.appAccount.language}</h2>
            <div className="rounded-2xl bg-app-surface p-4">
              <select
                aria-label={t.appAccount.language}
                value={lang}
                onChange={(event) => {
                  const selectedLanguage = LANGUAGES.find(
                    (language) => language.code === event.target.value,
                  );
                  if (selectedLanguage) setLang(selectedLanguage.code);
                }}
                className={inputClass}
              >
                {LANGUAGES.map((language) => (
                  <option key={language.code} value={language.code}>
                    {language.native}
                  </option>
                ))}
              </select>
            </div>
          </section>

          <section>
            <h2 className="mb-3 font-sans text-sm font-bold text-foreground">{t.appAccount.email}</h2>
            <div className="rounded-2xl bg-app-surface p-4">
              {!showEmailForm ? (
                <button
                  type="button"
                  onClick={() => setShowEmailForm(true)}
                  className="flex w-full items-center gap-3 text-start"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-app-coral-tint text-app-coral">
                    <Mail className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold text-foreground">{t.appAccount.changeEmail}</span>
                    <span className="block truncate text-xs text-muted-foreground">{user.email}</span>
                  </span>
                </button>
              ) : (
                <EmailForm
                  onSaved={() => setShowEmailForm(false)}
                  onCancel={() => setShowEmailForm(false)}
                />
              )}
            </div>
          </section>

          <section>
            <h2 className="mb-3 font-sans text-sm font-bold text-foreground">{t.appAccount.password}</h2>
            <div className="rounded-2xl bg-app-surface p-4">
              {!showPasswordForm ? (
                <button
                  type="button"
                  onClick={() => setShowPasswordForm(true)}
                  className="flex w-full items-center gap-3 text-start"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-app-coral-tint text-app-coral">
                    <KeyRound className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold text-foreground">
                      {hasPassword ? t.appAccount.changePassword : t.appAccount.setPassword}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {hasPassword
                        ? t.appAccount.passwordUpdateBody
                        : t.appAccount.passwordSetupBody}
                    </span>
                  </span>
                </button>
              ) : (
                <PasswordForm
                  hasPassword={hasPassword}
                  onSaved={() => {
                    setHasPassword(true);
                    setShowPasswordForm(false);
                  }}
                  onCancel={() => setShowPasswordForm(false)}
                />
              )}
            </div>
          </section>

          <section>
            <h2 className="mb-3 font-sans text-sm font-bold text-foreground">{t.appAccount.notifications}</h2>
            <PushToggle />
          </section>

          <button
            type="button"
            onClick={handleLogout}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-border bg-app-surface text-sm font-semibold text-foreground"
          >
            <LogOut className="h-4 w-4" />
            {t.appAccount.logout}
          </button>
        </div>
      )}
    </div>
  );
}
