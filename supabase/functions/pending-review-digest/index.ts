import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { escapeHtml, notifyOps, SITE_NAME } from "../_shared/ops.ts";

// Daily digest of everything held for manual review: acts
// (status='pending' in acts_of_kindness — under the current
// STRICT_MODE=true in submit-act, the only way an act lands here is the AI
// moderation service itself being unavailable, not genuine content
// concerns, but this reports whatever is actually pending regardless of
// why) and oversized pledges (status='pending' in commitments — see
// submit-commitment). Meant to be invoked once a day on a schedule
// (Supabase Dashboard → Integrations → Cron Jobs, since scheduling isn't
// something a migration should embed secrets to set up) rather than
// alerting per-submission, which would spam during a real outage instead of
// giving one useful daily summary.
//
// Oversized pledges also get their own immediate alert at submission time
// (see submit-commitment) since those are rare and worth a human's
// attention right away — this digest is the safety net in case that alert
// didn't land, not the only notice.

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

interface PendingCommitment {
  id: string;
  type: string;
  first_name: string | null;
  email: string | null;
  org_name: string | null;
  pledge_count: number;
  moderation_reason: string | null;
  created_at: string;
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

function renderCommitmentRow(c: PendingCommitment): string {
  const who = c.org_name || c.first_name || c.email || "Someone";
  const when = new Date(c.created_at).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Puerto_Rico",
  });
  return `
    <tr>
      <td style="padding:12px 0;border-bottom:1px solid #ece2d3">
        <p style="margin:0 0 4px;font-size:13px;color:#8a7b6f">${escapeHtml(who)} · ${c.type} · ${when}</p>
        <p style="margin:0 0 4px;font-size:14px;color:#2c2622">Pledged ${c.pledge_count.toLocaleString("en-US")} acts${c.email ? ` (${escapeHtml(c.email)})` : ""}</p>
        ${c.moderation_reason ? `<p style="margin:0;font-size:12px;color:#a89c8e;font-style:italic">${escapeHtml(c.moderation_reason)}</p>` : ""}
        <p style="margin:4px 0 0;font-size:12px;color:#a89c8e">id: ${c.id}</p>
      </td>
    </tr>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRole);

    const [actsRes, commitmentsRes] = await Promise.all([
      supabase
        .from("acts_of_kindness")
        .select("id, mode, description, first_name, email, moderation_reason, created_at")
        .eq("status", "pending")
        .order("created_at", { ascending: true }),
      supabase
        .from("commitments")
        .select("id, type, first_name, email, org_name, pledge_count, moderation_reason, created_at")
        .eq("status", "pending")
        .order("created_at", { ascending: true }),
    ]);

    if (actsRes.error) throw actsRes.error;
    if (commitmentsRes.error) throw commitmentsRes.error;

    const acts = (actsRes.data ?? []) as PendingAct[];
    const commitments = (commitmentsRes.data ?? []) as PendingCommitment[];
    const total = acts.length + commitments.length;

    // Nothing to review — skip sending rather than mailing an empty digest
    // every single day regardless of whether anything actually needs eyes.
    if (total === 0) {
      return new Response(JSON.stringify({ sent: false, pending_acts: 0, pending_commitments: 0 }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const parts: string[] = [];
    if (acts.length > 0) {
      parts.push(`${acts.length} act${acts.length === 1 ? "" : "s"}`);
    }
    if (commitments.length > 0) {
      parts.push(`${commitments.length} pledge${commitments.length === 1 ? "" : "s"}`);
    }
    const subject = `${parts.join(" + ")} awaiting review — ${SITE_NAME}`;

    const actsSection = acts.length > 0
      ? `
          <h2 style="font-size:16px;margin:24px 0 4px">Acts (${acts.length})</h2>
          <table style="width:100%;border-collapse:collapse">${acts.map(renderRow).join("")}</table>
          <p style="margin:12px 0 0;font-size:12px;color:#a89c8e">
            Approve in the Supabase SQL editor: update acts_of_kindness set status = 'published' where id = '...';
          </p>`
      : "";
    const commitmentsSection = commitments.length > 0
      ? `
          <h2 style="font-size:16px;margin:24px 0 4px">Pledges (${commitments.length})</h2>
          <table style="width:100%;border-collapse:collapse">${commitments.map(renderCommitmentRow).join("")}</table>
          <p style="margin:12px 0 0;font-size:12px;color:#a89c8e">
            These exceeded the per-submission auto-publish threshold and aren't counted in the public "Acts pledged"
            total yet. In the Table Editor, open commitments, find the row by its id above, and change status
            from pending to published to count it (or delete the row to reject it).
          </p>`
      : "";

    const html = `
      <div style="font-family:'DM Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;background:#ffffff;padding:32px 16px;color:#2c2622">
        <div style="max-width:600px;margin:0 auto;background:#fbf7f0;border:1px solid #ece2d3;border-radius:16px;padding:32px">
          <h1 style="font-size:22px;margin:0 0 8px">${parts.join(" + ")} awaiting review</h1>
          <p style="margin:0 0 4px;font-size:14px;color:#5b4f47">
            Held for manual review on ${SITE_NAME} — none of these count toward the Wall, Map, or movement totals until approved.
          </p>
          ${actsSection}${commitmentsSection}
        </div>
      </div>`;
    const text = [
      ...acts.map((a) => `${a.first_name || a.email || "Someone"} · ${a.mode} · ${a.description ?? ""}`),
      ...commitments.map((c) => `${c.org_name || c.first_name || c.email || "Someone"} · pledged ${c.pledge_count} · id ${c.id}`),
    ].join("\n");

    await notifyOps(supabase, { subject, html, text, label: "pending_review_digest" });

    return new Response(JSON.stringify({ sent: true, pending_acts: acts.length, pending_commitments: commitments.length }), {
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
