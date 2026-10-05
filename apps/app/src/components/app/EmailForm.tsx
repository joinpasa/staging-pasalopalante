import { useState } from "react";
import { toast } from "sonner";

import { useAuth } from "@shared/contexts/AuthContext";
import { useLanguage } from "@shared/contexts/LanguageContext";
import { supabase } from "@shared/integrations/supabase/client";
import { getAuthErrorMessage } from "@shared/lib/authErrors";

/** Change-email form for the Account page — sends a confirmation link to the
 *  new address; the email only actually changes once that link is clicked. */
export default function EmailForm({ onSaved, onCancel }: { onSaved: () => void; onCancel?: () => void }) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (trimmed.toLowerCase() === (user?.email ?? "").toLowerCase()) {
      toast.error(t.appWidgets.emailAlreadyCurrent);
      return;
    }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ email: trimmed });
    setSaving(false);
    if (error) {
      toast.error(getAuthErrorMessage(error, t.appJoin.authErrors));
      return;
    }
    toast.success(t.appWidgets.confirmationSent.replace("{email}", trimmed));
    setEmail("");
    onSaved();
  };

  const fieldClass =
    "h-10 w-full rounded-lg border border-border bg-app-surface px-3 text-sm text-foreground outline-none focus:border-app-coral";

  return (
    <form onSubmit={submit} className="space-y-2">
      <input
        type="email"
        autoComplete="email"
        required
        autoFocus
        maxLength={200}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder={t.appWidgets.newEmail}
        className={fieldClass}
      />
      <p className="text-[11px] leading-snug text-muted-foreground">
        {t.appWidgets.emailConfirmationBody}
      </p>
      <div className="flex items-center gap-2 pt-1">
        <button
          type="submit"
          disabled={saving}
          className="h-9 shrink-0 rounded-lg bg-app-coral px-4 text-xs font-semibold text-app-surface disabled:opacity-60"
        >
          {saving ? "…" : t.appWidgets.sendConfirmation}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="h-9 shrink-0 rounded-lg border border-border bg-app-surface px-4 text-xs font-semibold text-foreground"
          >
            {t.appWidgets.cancel}
          </button>
        )}
      </div>
    </form>
  );
}
