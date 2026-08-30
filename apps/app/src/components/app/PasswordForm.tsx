import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@shared/contexts/AuthContext";
import { supabase } from "@shared/integrations/supabase/client";
import { PASSWORD_HINT, validatePassword } from "@shared/lib/passwordStrength";
import { syncGhlTag } from "@shared/lib/ghlSync";

/** Set/change-password form shared by the VerificationBanner nudge and the
 *  full Account page — same validation, show/hide toggle, and submit logic
 *  either way. */
export default function PasswordForm({
  hasPassword,
  onSaved,
  onCancel,
}: {
  hasPassword: boolean;
  onSaved: () => void;
  onCancel?: () => void;
}) {
  const { user } = useAuth();
  const [pw, setPw] = useState("");
  const [pwConfirm, setPwConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const validationError = validatePassword(pw);
    if (validationError) {
      toast.error(validationError);
      return;
    }
    if (pw !== pwConfirm) {
      toast.error("Passwords don't match. Watch out for a password manager auto-filling a different one.");
      return;
    }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    if (!error) await supabase.from("profiles").update({ has_password: true }).eq("user_id", user.id);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(hasPassword ? "Password updated." : "Password set. You can now sign in with email + password.");
    if (!hasPassword) syncGhlTag(user.email, "password-set");
    setPw("");
    setPwConfirm("");
    onSaved();
  };

  const inputType = showPw ? "text" : "password";
  const fieldClass =
    "h-10 w-full rounded-lg border border-border bg-app-surface px-3 pr-10 text-sm text-foreground outline-none focus:border-app-coral";

  return (
    <form onSubmit={submit} className="space-y-2">
      <div className="relative">
        <input
          type={inputType}
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
          className={fieldClass}
        />
        <button
          type="button"
          onClick={() => setShowPw((v) => !v)}
          aria-label={showPw ? "Hide password" : "Show password"}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
        >
          {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      <div className="relative">
        <input
          type={inputType}
          autoComplete="new-password"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          minLength={8}
          required
          value={pwConfirm}
          onChange={(e) => setPwConfirm(e.target.value)}
          placeholder="Confirm password"
          className={fieldClass}
        />
      </div>
      <p className="text-[11px] leading-snug text-muted-foreground">{PASSWORD_HINT}</p>
      <div className="flex items-center gap-2 pt-1">
        <button
          type="submit"
          disabled={saving}
          className="h-9 shrink-0 rounded-lg bg-app-coral px-4 text-xs font-semibold text-app-surface disabled:opacity-60"
        >
          {saving ? "…" : "Save"}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="h-9 shrink-0 rounded-lg border border-border bg-app-surface px-4 text-xs font-semibold text-foreground"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
