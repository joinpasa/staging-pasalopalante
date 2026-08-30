import { useState } from "react";
import { Mail, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@shared/integrations/supabase/client";
import { useLanguage } from "@shared/contexts/LanguageContext";
import { Button } from "@shared/components/ui/button";
import { Input } from "@shared/components/ui/input";
import { getAuthErrorMessage } from "@shared/lib/authErrors";
import { getCanonicalOrigin } from "@shared/lib/canonicalOrigin";

const emailSchema = z.string().trim().email().max(255);

export default function CheckInboxCard({ email, actId }: { email: string; actId: string }) {
  const { t } = useLanguage();
  const [currentEmail, setCurrentEmail] = useState(email);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [newEmail, setNewEmail] = useState(email);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentToNew, setSentToNew] = useState<string | null>(null);

  async function sendLink(target: string) {
    const { error } = await supabase.auth.signInWithOtp({
      email: target,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: `${getCanonicalOrigin()}/share/thanks/${actId}?claim=1`,
      },
    });
    return error;
  }

  async function resend() {
    if (cooldown) return;
    setResending(true);
    try {
      const sendError = await sendLink(currentEmail);
      if (sendError) {
        toast.error(getAuthErrorMessage(sendError));
        return;
      }
      toast.success(t.share.checkInboxResent);
      setCooldown(true);
      setTimeout(() => setCooldown(false), 30000);
    } catch (e) {
      console.error(e);
      toast.error(getAuthErrorMessage(null));
    } finally {
      setResending(false);
    }
  }

  async function submitNewEmail(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const parsed = emailSchema.safeParse(newEmail);
    if (!parsed.success) {
      setError(t.share.checkInboxInvalidEmail);
      return;
    }
    const target = parsed.data;
    setSending(true);
    try {
      const sendError = await sendLink(target);
      if (sendError) {
        setError(getAuthErrorMessage(sendError));
        return;
      }
      setCurrentEmail(target);
      // Keep sessionStorage aligned for refreshes
      try {
        const raw = sessionStorage.getItem(`share_post_${actId}`);
        if (raw) {
          const parsedRaw = JSON.parse(raw);
          sessionStorage.setItem(
            `share_post_${actId}`,
            JSON.stringify({ ...parsedRaw, email: target }),
          );
        }
      } catch { /* noop */ }
      setSentToNew(target);
      setEditOpen(false);
      toast.success(t.share.checkInboxResent);
      setCooldown(true);
      setTimeout(() => setCooldown(false), 30000);
    } catch (err) {
      console.error(err);
      setError(t.share.checkInboxInvalidEmail);
    } finally {
      setSending(false);
    }
  }

  const body = t.share.checkInboxBody.replace("{email}", currentEmail);
  const sentMessage = sentToNew
    ? t.share.checkInboxSentToNew.replace("{email}", sentToNew)
    : null;

  return (
    <div className="bg-card border border-border rounded-2xl p-6 md:p-8">
      <div className="flex items-start gap-4">
        <div className="shrink-0 w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center">
          <Mail size={22} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-display text-2xl text-foreground mb-2">
            {t.share.checkInboxHeading}
          </h3>
          <p className="text-foreground/80 mb-5">{body}</p>

          {sentMessage && (
            <div className="mb-4 flex items-start gap-2 rounded-lg bg-primary/5 border border-primary/20 p-3 text-sm text-foreground/90">
              <CheckCircle2 size={16} className="mt-0.5 text-primary shrink-0" />
              <span>{sentMessage}</span>
            </div>
          )}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={resend}
            disabled={resending || cooldown}
          >
            {resending ? <Loader2 className="animate-spin" size={14} /> : null}
            {t.share.checkInboxResend}
          </Button>

          <div className="mt-6 border-t border-border/60 pt-4">
            <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">
              {t.share.checkInboxDidntGet}
            </p>
            {!editOpen ? (
              <button
                type="button"
                onClick={() => {
                  setEditOpen(true);
                  setNewEmail(currentEmail);
                  setError(null);
                }}
                className="text-sm text-primary font-medium hover:underline"
              >
                {t.share.checkInboxUsePersonal}
              </button>
            ) : (
              <form onSubmit={submitNewEmail} className="space-y-3">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {t.share.checkInboxUsePersonalHelper}
                </p>
                <div>
                  <label className="sr-only" htmlFor="recovery-email">
                    {t.share.checkInboxEmailLabel}
                  </label>
                  <Input
                    id="recovery-email"
                    type="email"
                    autoComplete="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder={t.share.checkInboxEmailLabel}
                    maxLength={255}
                  />
                  {error && (
                    <p className="mt-1 text-xs text-destructive">{error}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button type="submit" size="sm" disabled={sending}>
                    {sending ? <Loader2 className="animate-spin" size={14} /> : null}
                    {t.share.checkInboxSendToThis}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setEditOpen(false);
                      setError(null);
                    }}
                  >
                    {t.share.checkInboxCancel}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
