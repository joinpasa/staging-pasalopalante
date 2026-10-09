import type { SupabaseClient } from "npm:@supabase/supabase-js@2";

/** Where every automated "something needs a human" alert goes — the pending
 *  acts/commitments digest, the oversized-pledge review alert, etc. One
 *  place to change it for all of them. (process-email-queue's separate
 *  Resend-rate-limit alert is controlled by the OPS_ALERT_EMAIL Supabase
 *  secret instead, since that one fires outside of any single function's
 *  deploy and can't read a source constant.) */
export const OPS_RECIPIENT = "teampkf@passkindnessforward.com";
export const SENDER_DOMAIN = "ntf.pasalopalante.com";
export const SITE_NAME = "Pásalo Pa'lante";

export function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Throws on failure to enqueue — callers for whom an alert is the whole
 *  point (the review digest) should let that fail the request; callers for
 *  whom it's a side effect of something else that already succeeded (an
 *  oversized pledge was saved fine; only the alert about it failed) should
 *  wrap this in their own try/catch and log instead, the same non-fatal
 *  pattern used elsewhere for fire-and-forget side effects. */
export async function notifyOps(
  supabase: SupabaseClient,
  opts: { subject: string; html: string; text: string; label: string },
): Promise<void> {
  const { error } = await supabase.rpc("enqueue_email", {
    queue_name: "transactional_emails",
    payload: {
      message_id: crypto.randomUUID(),
      to: OPS_RECIPIENT,
      from: `${SITE_NAME} <noreply@${SENDER_DOMAIN}>`,
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
      label: opts.label,
      queued_at: new Date().toISOString(),
    },
  });
  if (error) throw error;
}
