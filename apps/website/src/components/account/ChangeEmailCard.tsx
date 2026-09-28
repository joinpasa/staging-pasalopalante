import { useState } from "react";
import { supabase } from "@shared/integrations/supabase/client";
import { useAuth } from "@shared/contexts/AuthContext";
import { getAuthErrorMessage } from "@shared/lib/authErrors";
import { Button } from "@shared/components/ui/button";
import { Input } from "@shared/components/ui/input";
import { Label } from "@shared/components/ui/label";
import { toast } from "sonner";
import { Mail } from "lucide-react";

export default function ChangeEmailCard() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (trimmed.toLowerCase() === (user?.email ?? "").toLowerCase()) {
      toast.error("That's already your current email.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ email: trimmed });
    setBusy(false);
    if (error) {
      toast.error(getAuthErrorMessage(error));
      return;
    }
    toast.success(`Confirmation link sent to ${trimmed}. Click it to finish changing your email.`);
    setEmail("");
    setOpen(false);
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Mail className="text-primary" size={20} />
          <div>
            <h3 className="font-serif text-lg text-foreground">Email</h3>
            <p className="text-sm text-foreground/60">{user?.email}</p>
          </div>
        </div>
        {!open && (
          <Button variant="outline" onClick={() => setOpen(true)}>Change email</Button>
        )}
      </div>
      {open && (
        <form onSubmit={submit} className="mt-5 space-y-3 max-w-sm">
          <div>
            <Label htmlFor="new-email">New email</Label>
            <Input
              id="new-email"
              type="email"
              autoComplete="email"
              required
              maxLength={200}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <p className="text-xs text-foreground/50">
            We'll send a confirmation link to the new address — your email only changes once you click it.
          </p>
          <div className="flex gap-2">
            <Button type="submit" disabled={busy}>{busy ? "…" : "Send confirmation"}</Button>
            <Button type="button" variant="ghost" onClick={() => { setOpen(false); setEmail(""); }}>Cancel</Button>
          </div>
        </form>
      )}
    </div>
  );
}
