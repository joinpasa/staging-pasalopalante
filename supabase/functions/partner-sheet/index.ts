import { adminClient, corsHeaders, json, UUID_RE } from "../_shared/partner.ts";
import type { SupabaseClient } from "npm:@supabase/supabase-js@2";

/**
 * The review Google Sheet's only door into the database. Called by the Apps
 * Script in supabase/sheets/partner-review.gs, authenticated with the
 * PARTNER_SHEET_SECRET header (set the same value as a Supabase function
 * secret and as the script's SHEET_SECRET property).
 *
 *   { action: "pull" }                                  -> new submissions to append
 *   { action: "ack", ids: [...] }                       -> mark those as in the sheet
 *   { action: "review", submission_id, status, note }   -> apply a Status change
 *
 * Approving copies the submission's photos into the public kindness-photos
 * bucket and inserts a published acts_of_kindness row — the exact row shape
 * the website and app walls already read — so it shows up with no wall
 * changes. Moving it off Approved later un-publishes that same row.
 */

const SHEET_SECRET = Deno.env.get("PARTNER_SHEET_SECRET") ?? "";
const PULL_LIMIT = 200;
const LINK_TTL_SECONDS = 60 * 60 * 24 * 30; // review links work for 30 days

const STATUS_FROM_SHEET: Record<string, string> = {
  "pending": "pending",
  "pending review": "pending",
  "approved": "approved",
  "needs changes": "changes_requested",
  "rejected": "rejected",
};

function constantTimeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** PostgREST returns a to-one embed as an object (or, depending on version, a one-item array). */
function one<T>(embed: unknown): T | null {
  if (Array.isArray(embed)) return (embed[0] as T) ?? null;
  return (embed as T) ?? null;
}

interface MediaItem {
  path: string;
  type: "image" | "video";
  name?: string;
}

async function pull(admin: SupabaseClient) {
  const { data, error } = await admin
    .from("partner_submissions")
    .select(
      "id, batch_id, created_at, description, people_count, act_date, media, media_consent, status, partners(name, city), partner_staff(name)",
    )
    .is("sheet_synced_at", null)
    .order("created_at", { ascending: true })
    .limit(PULL_LIMIT);
  if (error) throw error;

  const rows = [];
  for (const s of data ?? []) {
    const media = (s.media ?? []) as MediaItem[];
    const links: string[] = [];
    for (const m of media) {
      const { data: signed } = await admin.storage.from("partner-media").createSignedUrl(m.path, LINK_TTL_SECONDS);
      if (signed?.signedUrl) links.push(signed.signedUrl);
    }
    const p = one<{ name: string; city: string | null }>(s.partners);
    const st = one<{ name: string }>(s.partner_staff);
    rows.push({
      id: s.id,
      submitted_at: s.created_at,
      school: p?.name ?? "",
      city: p?.city ?? "",
      staff: st?.name ?? "",
      description: s.description,
      people: s.people_count,
      act_date: s.act_date,
      media_links: links,
      media_consent: s.media_consent,
      batch_id: s.batch_id,
    });
  }
  return rows;
}

async function publishToWall(admin: SupabaseClient, submissionId: string) {
  const { data: s, error } = await admin
    .from("partner_submissions")
    .select("id, description, media, act_id, partners(name, account_user_id)")
    .eq("id", submissionId)
    .single();
  if (error || !s) throw error ?? new Error("submission not found");

  if (s.act_id) {
    await admin.from("acts_of_kindness").update({ status: "published" }).eq("id", s.act_id);
    return s.act_id as string;
  }

  // Wall cards read photo_paths from the public kindness-photos bucket.
  // Videos stay in the sheet for review/social — the walls only embed
  // YouTube links today.
  const photoPaths: string[] = [];
  for (const m of ((s.media ?? []) as MediaItem[]).filter((m) => m.type === "image")) {
    const { data: file } = await admin.storage.from("partner-media").download(m.path);
    if (!file) continue;
    const ext = (m.path.split(".").pop() ?? "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
    const dest = `partners/${s.id}/${photoPaths.length + 1}.${ext}`;
    const { error: upErr } = await admin.storage
      .from("kindness-photos")
      .upload(dest, file, { contentType: file.type || "image/jpeg", upsert: true });
    if (!upErr) photoPaths.push(dest);
  }

  const partner = one<{ name: string; account_user_id: string | null }>(s.partners);
  const { data: act, error: actErr } = await admin
    .from("acts_of_kindness")
    .insert({
      mode: "performed",
      description: s.description,
      first_name: partner?.name ?? null,
      photo_paths: photoPaths,
      status: "published",
      share_on_wall: true,
      user_id: partner?.account_user_id ?? null,
      moderation_reason: "Approved in partner review sheet",
    })
    .select("id")
    .single();
  if (actErr) throw actErr;
  return act.id as string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  if (!SHEET_SECRET || !constantTimeEqual(req.headers.get("x-sheet-secret") ?? "", SHEET_SECRET)) {
    return json({ error: "Unauthorized" }, 401);
  }

  const admin = adminClient();
  const body = await req.json().catch(() => null);

  try {
    if (body?.action === "pull") {
      return json({ rows: await pull(admin) });
    }

    if (body?.action === "ack") {
      const ids = (Array.isArray(body.ids) ? body.ids : []).filter((id: unknown) => typeof id === "string" && UUID_RE.test(id));
      if (ids.length) {
        await admin.from("partner_submissions").update({ sheet_synced_at: new Date().toISOString() }).in("id", ids);
      }
      return json({ ok: true, acked: ids.length });
    }

    if (body?.action === "review") {
      const id = String(body.submission_id ?? "");
      const status = STATUS_FROM_SHEET[String(body.status ?? "").trim().toLowerCase()];
      if (!UUID_RE.test(id) || !status) return json({ error: "Bad submission id or status" }, 400);
      const note = String(body.note ?? "").trim().slice(0, 1000) || null;

      const { data: current } = await admin.from("partner_submissions").select("act_id").eq("id", id).maybeSingle();
      if (!current) return json({ error: "Submission not found" }, 404);

      let actId = current.act_id as string | null;
      if (status === "approved") {
        actId = await publishToWall(admin, id);
      } else if (actId) {
        await admin.from("acts_of_kindness").update({ status: "rejected" }).eq("id", actId);
      }

      await admin
        .from("partner_submissions")
        .update({ status, review_note: note, reviewed_at: new Date().toISOString(), act_id: actId })
        .eq("id", id);
      return json({ ok: true, status, on_wall: status === "approved" });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    console.error("partner-sheet error", e);
    return json({ error: "Server error" }, 500);
  }
});
