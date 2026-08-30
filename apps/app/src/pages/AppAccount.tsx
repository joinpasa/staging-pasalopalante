import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, KeyRound, Loader2, LogOut } from "lucide-react";

import PasswordForm from "@/components/app/PasswordForm";
import PushToggle from "@/components/app/PushToggle";
import { useAuth } from "@shared/contexts/AuthContext";
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

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("first_name, last_name, country, has_password, custom_display_name")
        .eq("user_id", user.id)
        .maybeSingle();
      setFirstName(data?.first_name ?? "");
      setLastName(data?.last_name ?? "");
      setCountry(data?.country ?? "");
      setHasPassword(!!data?.has_password);
      setNickname(data?.custom_display_name ?? "");
      setSavedNickname(data?.custom_display_name ?? "");
      setLoading(false);
    })();
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
      toast.error(nicknameValid ? "That nickname is taken." : "Nickname must be 2-30 letters/numbers.");
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
    if (error) toast.error("Couldn't save your profile. Please try again.");
    else {
      toast.success("Profile updated.");
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
          aria-label="Back"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-app-surface"
        >
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </button>
        <h1 className="font-sans text-lg font-bold text-foreground">Account</h1>
      </header>

      {!loading && (
        <div className="space-y-6">
          <section>
            <h2 className="mb-3 font-sans text-sm font-bold text-foreground">Your profile</h2>
            <form onSubmit={saveProfile} className="space-y-3 rounded-2xl bg-app-surface p-4">
              <div className="grid grid-cols-2 gap-3">
                <label className="block space-y-1.5">
                  <span className="text-xs font-semibold text-muted-foreground">First name</span>
                  <input
                    maxLength={60}
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    autoComplete="given-name"
                    className={inputClass}
                  />
                </label>
                <label className="block space-y-1.5">
                  <span className="text-xs font-semibold text-muted-foreground">Last name</span>
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
                <span className="text-xs font-semibold text-muted-foreground">Country</span>
                <select value={country} onChange={(e) => setCountry(e.target.value)} className={inputClass}>
                  <option value="">Select your country</option>
                  {COUNTRIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block space-y-1.5">
                <span className="text-xs font-semibold text-muted-foreground">Nickname</span>
                <input
                  maxLength={30}
                  placeholder="How you'll appear on the Wall"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  className={inputClass}
                />
                <p className="text-[11px] leading-snug text-muted-foreground">
                  {trimmedNickname && isReservedDisplayName(trimmedNickname) ? (
                    <span className="text-destructive">That name isn't available.</span>
                  ) : trimmedNickname && !nicknameValid ? (
                    <span className="text-destructive">2-30 letters, numbers, spaces, or - ' _</span>
                  ) : checkingNickname ? (
                    <span className="inline-flex items-center gap-1">
                      <Loader2 className="h-3 w-3 animate-spin" /> Checking availability…
                    </span>
                  ) : trimmedNickname && nicknameAvailable === true ? (
                    <span className="text-app-teal">Available</span>
                  ) : trimmedNickname && nicknameAvailable === false ? (
                    <span className="text-destructive">Already taken</span>
                  ) : (
                    "Optional — used on the Wall and when people connect with you via /wave. Leave blank to show your first name and last initial instead."
                  )}
                </p>
              </label>
              <button
                type="submit"
                disabled={saving}
                className="h-11 w-full rounded-xl bg-app-coral text-sm font-semibold text-app-surface disabled:opacity-60"
              >
                {saving ? "Saving…" : "Save profile"}
              </button>
            </form>
          </section>

          <section>
            <h2 className="mb-3 font-sans text-sm font-bold text-foreground">Password</h2>
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
                      {hasPassword ? "Change password" : "Set a password"}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {hasPassword
                        ? "Update the password you use to sign in."
                        : "Add a password so you can sign in without an email link."}
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
            <h2 className="mb-3 font-sans text-sm font-bold text-foreground">Notifications</h2>
            <PushToggle />
          </section>

          <button
            type="button"
            onClick={handleLogout}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-border bg-app-surface text-sm font-semibold text-foreground"
          >
            <LogOut className="h-4 w-4" />
            Log out
          </button>
        </div>
      )}
    </div>
  );
}
