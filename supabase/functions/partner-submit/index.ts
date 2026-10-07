import { adminClient, corsHeaders, json, partnerFromRequest, UUID_RE } from "../_shared/partner.ts";

/**
 * Log 1 Act / Bulk Log from the partner portal. Saves each row as a pending
 * partner_submissions row; the review Google Sheet picks them up from
 * partner-sheet ("pull") within a minute, and approving one there is what
 * puts it on the Wall.
 *
 * Body: { staff_id, media_consent, items: [{ description, people_count, act_date, media: [{ path, type, name }] }] }
 */

const MAX_ITEMS = 50;
const MAX_MEDIA_PER_ITEM = 4;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

interface MediaIn {
  path?: unknown;
  type?: unknown;
  name?: unknown;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const admin = adminClient();
  const partner = await partnerFromRequest(req, admin);
  if (!partner) return json({ error: "Please log in again." }, 401);

  const body = await req.json().catch(() => null);
  const staffId = String(body?.staff_id ?? "");
  const items = Array.isArray(body?.items) ? body.items : [];
  const consent = body?.media_consent === true;

  if (!UUID_RE.test(staffId)) return json({ error: "Please log in again." }, 401);
  const { data: staff } = await admin
    .from("partner_staff")
    .select("id, active")
    .eq("id", staffId)
    .eq("partner_id", partner.id)
    .maybeSingle();
  if (!staff?.active) return json({ error: "Your Kindness ID is no longer active. Ask your coordinator." }, 403);

  if (items.length === 0) return json({ error: "Add at least one act." }, 400);
  if (items.length > MAX_ITEMS) return json({ error: `Up to ${MAX_ITEMS} rows per submission.` }, 400);

  const today = new Date();
  today.setUTCDate(today.getUTCDate() + 1); // allow for time zones ahead of UTC
  const batchId = crypto.randomUUID();
  const rows = [];

  for (const [i, raw] of items.entries()) {
    const n = i + 1;
    const description = String(raw?.description ?? "").trim().slice(0, 1000);
    const people = Number(raw?.people_count);
    const actDate = String(raw?.act_date ?? "");
    if (!description) return json({ error: `Row ${n}: describe what happened.` }, 400);
    if (!Number.isInteger(people) || people < 1 || people > 100000) {
      return json({ error: `Row ${n}: people involved must be a whole number from 1 to 100,000.` }, 400);
    }
    if (!DATE_RE.test(actDate) || isNaN(Date.parse(actDate)) || new Date(actDate) > today) {
      return json({ error: `Row ${n}: pick a date that isn't in the future.` }, 400);
    }

    const mediaIn: MediaIn[] = Array.isArray(raw?.media) ? raw.media.slice(0, MAX_MEDIA_PER_ITEM) : [];
    const media = [];
    for (const m of mediaIn) {
      const path = String(m.path ?? "");
      const type = m.type === "video" ? "video" : "image";
      // Only files this school uploaded into its own folder.
      if (!path.startsWith(`${partner.id}/`) || path.includes("..")) {
        return json({ error: `Row ${n}: invalid file.` }, 400);
      }
      media.push({ path, type, name: String(m.name ?? "").slice(0, 200) });
    }
    if (media.length > 0 && !consent) {
      return json({ error: "Please confirm you have permission to share the photos/videos." }, 400);
    }

    rows.push({
      partner_id: partner.id,
      staff_id: staffId,
      batch_id: batchId,
      description,
      people_count: people,
      act_date: actDate,
      media,
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
