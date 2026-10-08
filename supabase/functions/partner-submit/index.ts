import { adminClient, corsHeaders, json, partnerFromRequest, UUID_RE } from "../_shared/partner.ts";

/**
 * Log 1 Act / Bulk Log from the partner portal. Saves each row as a pending
 * partner_submissions row; the review Google Sheet picks them up from
 * partner-sheet ("pull") within a minute, and approving one there is what
 * puts it on the Wall.
 *
 * New acts:
 *   { staff_id, media_consent, items: [{ description, people_count, act_date, link_url?, media: [{ path, type, name }] }] }
 * Fix an act the reviewer marked "Needs Changes" (goes back to Pending and
 * back into the sheet, flagged as resubmitted):
 *   { action: "update", staff_id, submission_id, media_consent, item: { …same fields… } }
 */

const MAX_ITEMS = 50;
const MAX_MEDIA_PER_ITEM = 4;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

interface MediaIn {
  path?: unknown;
  type?: unknown;
  name?: unknown;
}

interface CleanItem {
  description: string;
  people_count: number;
  act_date: string;
  link_url: string | null;
  media: { path: string; type: "image" | "video"; name: string }[];
}

/** Validates one act; returns the cleaned row or an error message. */
function cleanItem(raw: Record<string, unknown> | null, partnerId: string, consent: boolean, label: string): CleanItem | string {
  const today = new Date();
  today.setUTCDate(today.getUTCDate() + 1); // allow for time zones ahead of UTC

  const description = String(raw?.description ?? "").trim().slice(0, 1000);
  const people = Number(raw?.people_count);
  const actDate = String(raw?.act_date ?? "");
  if (!description) return `${label}describe what happened.`;
  if (!Number.isInteger(people) || people < 1 || people > 100000) {
    return `${label}people involved must be a whole number from 1 to 100,000.`;
  }
  if (!DATE_RE.test(actDate) || isNaN(Date.parse(actDate)) || new Date(actDate) > today) {
    return `${label}pick a date that isn't in the future.`;
  }

  let link: string | null = null;
  const rawLink = String(raw?.link_url ?? "").trim();
  if (rawLink) {
    try {
      const u = new URL(rawLink);
      if (u.protocol !== "https:" && u.protocol !== "http:") throw new Error();
      link = rawLink.slice(0, 500);
    } catch {
      return `${label}that link doesn't look right — paste the full address starting with https://`;
    }
  }

  const mediaIn: MediaIn[] = Array.isArray(raw?.media) ? (raw.media as MediaIn[]).slice(0, MAX_MEDIA_PER_ITEM) : [];
  const media: CleanItem["media"] = [];
  for (const m of mediaIn) {
    const path = String(m.path ?? "");
    // Only files this organization uploaded into its own folder.
    if (!path.startsWith(`${partnerId}/`) || path.includes("..")) return `${label}invalid file.`;
    media.push({ path, type: m.type === "video" ? "video" : "image", name: String(m.name ?? "").slice(0, 200) });
  }
  if (media.length > 0 && !consent) return "Please confirm you have permission to share the photos/videos.";

  return { description, people_count: people, act_date: actDate, link_url: link, media };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const admin = adminClient();
  const partner = await partnerFromRequest(req, admin);
  if (!partner) return json({ error: "Please log in again." }, 401);

  const body = await req.json().catch(() => null);
  const staffId = String(body?.staff_id ?? "");
  const consent = body?.media_consent === true;

  if (!UUID_RE.test(staffId)) return json({ error: "Please log in again." }, 401);
  const { data: staff } = await admin
    .from("partner_staff")
    .select("id, active")
    .eq("id", staffId)
    .eq("partner_id", partner.id)
    .maybeSingle();
  if (!staff?.active) return json({ error: "Your Kindness ID is no longer active. Ask your coordinator." }, 403);

  if (body?.action === "update") {
    const id = String(body.submission_id ?? "");
    if (!UUID_RE.test(id)) return json({ error: "That act couldn't be found." }, 400);
    const { data: current } = await admin
      .from("partner_submissions")
      .select("id, status")
      .eq("id", id)
      .eq("partner_id", partner.id)
      .maybeSingle();
    if (!current) return json({ error: "That act couldn't be found." }, 404);
    if (current.status !== "changes_requested") {
      return json({ error: "Only acts marked “Needs Changes” can be edited." }, 409);
    }

    const item = cleanItem(body.item ?? null, partner.id, consent, "");
    if (typeof item === "string") return json({ error: item.charAt(0).toUpperCase() + item.slice(1) }, 400);

    const { error } = await admin
      .from("partner_submissions")
      .update({
        ...item,
        media_consent: consent,
        staff_id: staffId,
        status: "pending",
        resubmitted_at: new Date().toISOString(),
        sheet_synced_at: null, // the sheet re-pulls it and updates the same row
      })
      .eq("id", id);
    if (error) {
      console.error("partner-submit update failed", error);
      return json({ error: "Couldn't save your changes. Please try again." }, 500);
    }
    return json({ ok: true, activities: 1, acts: item.people_count, resubmitted: true });
  }

  const items = Array.isArray(body?.items) ? body.items : [];
  if (items.length === 0) return json({ error: "Add at least one act." }, 400);
  if (items.length > MAX_ITEMS) return json({ error: `Up to ${MAX_ITEMS} rows per submission.` }, 400);

  const batchId = crypto.randomUUID();
  const rows = [];
  for (const [i, raw] of items.entries()) {
    const item = cleanItem(raw, partner.id, consent, items.length > 1 ? `Row ${i + 1}: ` : "");
    if (typeof item === "string") return json({ error: item.charAt(0).toUpperCase() + item.slice(1) }, 400);
    rows.push({
      ...item,
      partner_id: partner.id,
      staff_id: staffId,
      batch_id: batchId,
      media_consent: consent,
    });
  }

  const { data, error } = await admin.from("partner_submissions").insert(rows).select("id");
  if (error) {
    console.error("partner-submit insert failed", error);
    return json({ error: "Couldn't save your acts. Please try again." }, 500);
  }

  return json({
    ok: true,
    batch_id: batchId,
    ids: (data ?? []).map((r) => r.id),
    activities: rows.length,
    acts: rows.reduce((sum, r) => sum + r.people_count, 0),
  });
});
