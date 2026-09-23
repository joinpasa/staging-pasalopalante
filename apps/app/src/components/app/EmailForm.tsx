import { useState } from "react";
import { toast } from "sonner";

import { useAuth } from "@shared/contexts/AuthContext";
import { supabase } from "@shared/integrations/supabase/client";
import { getAuthErrorMessage } from "@shared/lib/authErrors";

/** Change-email form for the Account page — sends a confirmation link to the
 *  new address; the email only actually changes once that link is clicked. */
export default function EmailForm({ onSaved, onCancel }: { onSaved: () => void; onCancel?: () => void }) {
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (trimmed.toLowerCase() === (user?.email ?? "").toLowerCase()) {
      toast.error("That's already your current email.");
      return;
    }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ email: trimmed });
    setSaving(false);
    if (error) {
      toast.error(getAuthErrorMessage(error));
      return;
    }
    toast.success(`Confirmation link sent to ${trimmed}. Click it to finish changing your email.`);
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
        placeholder="New email"
        className={fieldClass}
      />
      <p className="text-[11px] leading-snug text-muted-foreground">
        We'll send a confirmation link to the new address — your email only changes once you click it.
      </p>
      <div className="flex items-center gap-2 pt-1">
        <button
          type="submit"
          disabled={saving}
          className="h-9 shrink-0 rounded-lg bg-app-coral px-4 text-xs font-semibold text-app-surface disabled:opacity-60"
        >
          {saving ? "…" : "Send confirmation"}
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
