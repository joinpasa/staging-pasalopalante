import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { KeyRound } from "lucide-react";

export default function SetPasswordCard() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [hasPassword, setHasPassword] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("has_password")
        .eq("user_id", user.id)
        .maybeSingle();
      setHasPassword(!!(data as any)?.has_password);
    })();
  }, [user]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pw.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    if (!error && user) {
      await supabase.from("profiles").update({ has_password: true }).eq("user_id", user.id);
    }
    setBusy(false);
    if (error) toast.error(error.message);
    else {
      toast.success(hasPassword ? "Password updated." : "Password set. You can now sign in with email + password.");
      setPw("");
      setOpen(false);
      setHasPassword(true);
    }
  };

  const title = hasPassword ? "Change password" : "Set a password (optional)";
  const subtitle = hasPassword
    ? "Update the password you use to sign in."
    : "Add a password so you can sign in without an email link.";
  const buttonLabel = hasPassword ? "Change password" : "Set password";

  return (
    <div className="bg-card border border-border rounded-2xl p-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <KeyRound className="text-primary" size={20} />
          <div>
            <h3 className="font-serif text-lg text-foreground">{title}</h3>
            <p className="text-sm text-foreground/60">{subtitle}</p>
          </div>
        </div>
        {!open && (
          <Button variant="outline" onClick={() => setOpen(true)}>{buttonLabel}</Button>
        )}
      </div>
      {open && (
        <form onSubmit={submit} className="mt-5 space-y-3 max-w-sm">
          <div>
            <Label htmlFor="new-pw">{hasPassword ? "New password" : "New password"}</Label>
            <Input id="new-pw" type="password" minLength={8} value={pw} onChange={(e) => setPw(e.target.value)} required />
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={busy}>{busy ? "…" : (hasPassword ? "Update password" : "Save password")}</Button>
            <Button type="button" variant="ghost" onClick={() => { setOpen(false); setPw(""); }}>Cancel</Button>
          </div>
        </form>
      )}
    </div>
  );
}
