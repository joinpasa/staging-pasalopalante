import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

// Daily digest of acts held for manual review (status='pending' in
// acts_of_kindness — under the current STRICT_MODE=true in submit-act, the
// only way an act lands here is the AI moderation service itself being
// unavailable, not genuine content concerns, but this reports whatever is
// actually pending regardless of why). Meant to be invoked once a day on a
// schedule (Supabase Dashboard → Integrations → Cron Jobs, since scheduling
// isn't something a migration should embed secrets to set up) rather than
// alerting per-submission, which would spam during a real outage instead of
// giving one useful daily summary.
const RECIPIENT = "kindnessforward.26@gmail.com";
const SENDER_DOMAIN = "ntf.pasalopalante.com";
const SITE_NAME = "Pásalo Pa'lante";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PendingAct {
  id: string;
  mode: string;
  description: string | null;
  first_name: string | null;
  email: string | null;
  moderation_reason: string | null;
  created_at: string;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function renderRow(act: PendingAct): string {
  const who = act.first_name || act.email || "Someone";
  const when = new Date(act.created_at).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Puerto_Rico",
  });
  const description = act.description ? escapeHtml(act.description).slice(0, 300) : "(no description)";
  return `
    <tr>
      <td style="padding:12px 0;border-bottom:1px solid #ece2d3">
        <p style="margin:0 0 4px;font-size:13px;color:#8a7b6f">${escapeHtml(who)} · ${act.mode} · ${when}</p>
        <p style="margin:0 0 4px;font-size:14px;color:#2c2622">${description}</p>
        ${act.moderation_reason ? `<p style="margin:0;font-size:12px;color:#a89c8e;font-style:italic">${escapeHtml(act.moderation_reason)}</p>` : ""}
      </td>
    </tr>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRole);

    const { data: pending, error } = await supabase
      .from("acts_of_kindness")
      .select("id, mode, description, first_name, email, moderation_reason, created_at")
      .eq("status", "pending")
      .order("created_at", { ascending: true });

    if (error) throw error;

    const acts = (pending ?? []) as PendingAct[];

    // Nothing to review — skip sending rather than mailing an empty digest
    // every single day regardless of whether anything actually needs eyes.
    if (acts.length === 0) {
      return new Response(JSON.stringify({ sent: false, pending_count: 0 }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const subject = `${acts.length} act${acts.length === 1 ? "" : "s"} awaiting review — ${SITE_NAME}`;
    const html = `
      <div style="font-family:'DM Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;background:#ffffff;padding:32px 16px;color:#2c2622">
        <div style="max-width:600px;margin:0 auto;background:#fbf7f0;border:1px solid #ece2d3;border-radius:16px;padding:32px">
          <h1 style="font-size:22px;margin:0 0 8px">${acts.length} act${acts.length === 1 ? "" : "s"} awaiting review</h1>
          <p style="margin:0 0 20px;font-size:14px;color:#5b4f47">
            Held for manual review on ${SITE_NAME} — none of these are visible on the Wall, Map, or movement totals until approved.
          </p>
          <table style="width:100%;border-collapse:collapse">${acts.map(renderRow).join("")}</table>
          <p style="margin:20px 0 0;font-size:12px;color:#a89c8e">
            Approve in the Supabase SQL editor: update acts_of_kindness set status = 'published' where id = '...';
          </p>
        </div>
      </div>`;
    const text = acts
      .map((a) => `${a.first_name || a.email || "Someone"} · ${a.mode} · ${a.description ?? ""}`)
      .join("\n");

    const messageId = crypto.randomUUID();
    const { error: enqueueError } = await supabase.rpc("enqueue_email", {
      queue_name: "transactional_emails",
      payload: {
        message_id: messageId,
        to: RECIPIENT,
        from: `${SITE_NAME} <noreply@${SENDER_DOMAIN}>`,
        subject,
        html,
        text,
        label: "pending_review_digest",
        queued_at: new Date().toISOString(),
      },
    });

    if (enqueueError) throw enqueueError;

    return new Response(JSON.stringify({ sent: true, pending_count: acts.length }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("pending-review-digest failed", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
