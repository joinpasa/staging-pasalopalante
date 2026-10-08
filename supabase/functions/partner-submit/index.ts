import { adminClient, corsHeaders, json, partnerFromRequest, UUID_RE } from "../_shared/partner.ts";

/**
 * Log 1 Act / Bulk Log from the partner portal. Saves each row as a pending
 * partner_submissions row; the review Google Sheet picks them up from
 * partner-sheet ("pull") within a minute, and approving one there is what
 * puts it on the Wall.
 *
 * Both forms also send `submitter_email` — who to email if the reviewer
 * marks the act "Needs Changes" (the org contact is cc'd). It's saved on
 * the act and on the person's partner_staff row so the portal can pre-fill it.
 *
 * New acts:
 *   { staff_id, submitter_email, media_consent, items: [{ description, people_count, act_date, link_url?, media: [{ path, type, name }] }] }
 * Permanently delete one of this organization's acts (any status):
 *   { action: "delete", staff_id, submission_id }
 *   Removes its uploaded files, its Wall row (and that row's photo copies)
 *   and the act itself. Only a tombstone (who/when, no content) is kept so
 *   the review sheet can grey the row out.
 * Fix an act the reviewer marked "Needs Changes" (goes back to Pending and
 * back into the sheet, flagged as resubmitted):
 *   { action: "update", staff_id, submission_id, media_consent, item: { …same fields… } }
 */

const MAX_ITEMS = 50;
const MAX_MEDIA_PER_ITEM = 4;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

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
    .select("id, active, name")
    .eq("id", staffId)
    .eq("partner_id", partner.id)
    .maybeSingle();
  if (!staff?.active) return json({ error: "Your Kindness ID is no longer active. Ask your coordinator." }, 403);

  const submitterEmail = String(body?.submitter_email ?? "").trim().toLowerCase().slice(0, 254) || null;
  if (submitterEmail && !EMAIL_RE.test(submitterEmail)) {
    return json({ error: "That email address doesn't look right." }, 400);
  }
  if (submitterEmail) {
    // Remember it for this person so the form pre-fills on any device.
    await admin.from("partner_staff").update({ email: submitterEmail }).eq("id", staffId);
  }

  if (body?.action === "delete") {
    const id = String(body.submission_id ?? "");
    if (!UUID_RE.test(id)) return json({ error: "That act couldn't be found." }, 400);
    const { data: sub } = await admin
      .from("partner_submissions")
      .select("id, media, act_id")
      .eq("id", id)
      .eq("partner_id", partner.id)
      .maybeSingle();
    if (!sub) return json({ error: "That act couldn't be found — it may already be deleted." }, 404);

    // Uploaded originals (private bucket).
    const paths = ((sub.media ?? []) as { path: string }[]).map((m) => m.path).filter(Boolean);
    if (paths.length) await admin.storage.from("partner-media").remove(paths);

    // Its Wall post, if it was approved: the public photo copies, then the row
    // (reactions, thank-yous and translations go with it — ON DELETE CASCADE).
    if (sub.act_id) {
      const { data: act } = await admin.from("acts_of_kindness").select("photo_paths").eq("id", sub.act_id).maybeSingle();
      const wallPhotos = ((act?.photo_paths ?? []) as string[]).filter((p) => p.startsWith(`partners/${sub.id}/`));
      if (wallPhotos.length) await admin.storage.from("kindness-photos").remove(wallPhotos);
      await admin.from("acts_of_kindness").delete().eq("id", sub.act_id);
    }

    const { error } = await admin.from("partner_submissions").delete().eq("id", id);
    if (error) {
      console.error("partner-submit delete failed", error);
      return json({ error: "Couldn't delete that act. Please try again." }, 500);
    }
    await admin.from("partner_deleted_submissions").upsert({
      submission_id: id,
      partner_id: partner.id,
      deleted_by_staff_id: staffId,
      deleted_by_name: staff.name ?? null,
    });
    return json({ ok: true, deleted: id });
  }

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
        ...(submitterEmail ? { submitter_email: submitterEmail } : {}),
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
      submitter_email: submitterEmail,
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
