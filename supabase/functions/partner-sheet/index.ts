import { adminClient, corsHeaders, json, SERVICE_ROLE_KEY, SUPABASE_URL, UUID_RE } from "../_shared/partner.ts";
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
 *   { action: "video", submission_id, youtube_url }     -> set/clear the YouTube link
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

// Same URL shapes the website wall's parseYouTubeId (packages/shared/src/lib/youtube.ts) accepts.
const YT_PATTERNS = [
  /(?:youtube\.com\/watch\?[^#]*v=)([A-Za-z0-9_-]{11})/,
  /(?:youtu\.be\/)([A-Za-z0-9_-]{11})/,
  /(?:youtube\.com\/shorts\/)([A-Za-z0-9_-]{11})/,
  /(?:youtube\.com\/embed\/)([A-Za-z0-9_-]{11})/,
  /(?:youtube\.com\/live\/)([A-Za-z0-9_-]{11})/,
];

/** Any YouTube link form -> canonical watch URL; "" -> null; anything else -> undefined (invalid). */
function normalizeYouTube(raw: string): string | null | undefined {
  const url = raw.trim();
  if (!url) return null;
  for (const re of YT_PATTERNS) {
    const m = url.match(re);
    if (m) return `https://www.youtube.com/watch?v=${m[1]}`;
  }
  return undefined;
}

const ORG_TYPE_LABELS: Record<string, string> = {
  school: "School",
  ngo: "NGO",
  company: "Company",
  faith: "Faith",
  government: "Government",
  community: "Community",
  other: "Other",
};

interface MediaItem {
  path: string;
  type: "image" | "video";
  name?: string;
}

async function pull(admin: SupabaseClient) {
  const { data, error } = await admin
    .from("partner_submissions")
    .select(
      "id, batch_id, created_at, description, people_count, act_date, media, media_consent, link_url, resubmitted_at, review_note, submitter_email, status, partners(name, city, org_type, contact_email), partner_staff(name)",
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
    const p = one<{ name: string; city: string | null; org_type: string | null; contact_email: string | null }>(s.partners);
    const st = one<{ name: string }>(s.partner_staff);
    const photos = media.filter((m) => m.type === "image").length;
    const videos = media.filter((m) => m.type === "video").length;
    rows.push({
      id: s.id,
      submitted_at: s.created_at,
      organization: p?.name ?? "",
      org_type: ORG_TYPE_LABELS[p?.org_type ?? ""] ?? "",
      org_contact: p?.contact_email ?? "",
      // Who logged it — the "Needs Changes" email goes here (org contact cc'd).
      submitter_email: s.submitter_email ?? "",
      city: p?.city ?? "",
      staff: st?.name ?? "",
      description: s.description,
      people: s.people_count,
      act_date: s.act_date,
      // The organization's own social post link (if any) leads the cell.
      media_links: s.link_url ? [`Link: ${s.link_url}`, ...links] : links,
      link_url: s.link_url ?? "",
      // Set when the organization edited it after "Needs Changes": the sheet
      // updates the existing row instead of appending a new one.
      resubmitted_at: s.resubmitted_at ?? null,
      previous_note: s.review_note ?? "",
      // "2 photos · 1 video" / "None" — lets reviewers filter rows needing a YouTube upload.
      media_summary:
        [photos && `${photos} photo${photos > 1 ? "s" : ""}`, videos && `${videos} video${videos > 1 ? "s" : ""}`]
          .filter(Boolean)
          .join(" · ") || "None",
      media_consent: s.media_consent,
      // Short, human-scannable code shared by every row of one Bulk Log submission.
      batch: String(s.batch_id).slice(0, 8).toUpperCase(),
    });
  }
  return rows;
}

function isYouTube(url: string) {
  try {
    const host = new URL(url).hostname.toLowerCase().replace(/^www\./, "");
    return host === "youtube.com" || host.endsWith(".youtube.com") || host === "youtu.be";
  } catch {
    return false;
  }
}

/**
 * Approve → publish (or refresh) the submission's Wall row. Always rewrites
 * the row's content, so an act that was approved, sent back with "Needs
 * Changes", edited by the organization and approved again shows the edit.
 */
async function publishToWall(admin: SupabaseClient, submissionId: string) {
  const { data: s, error } = await admin
    .from("partner_submissions")
    .select("id, description, media, act_id, youtube_url, link_url, partners(name, account_user_id)")
    .eq("id", submissionId)
    .single();
  if (error || !s) throw error ?? new Error("submission not found");

  // Wall cards read photo_paths from the public kindness-photos bucket.
  // Uploaded videos aren't copied: the wall plays YouTube links, which come
  // from the sheet's "YouTube link" column (youtube_url) or the
  // organization's own post link (link_url).
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

  // Reviewer's YouTube upload wins; otherwise the organization's own link —
  // the walls render YouTube as a player and other platforms as a link card.
  const videoUrl = (s.youtube_url as string | null) ?? (s.link_url as string | null) ?? null;
  const partner = one<{ name: string; account_user_id: string | null }>(s.partners);
  const fields = {
    mode: "performed",
    description: s.description,
    first_name: partner?.name ?? null,
    photo_paths: photoPaths,
    video_url: videoUrl,
    link_preview_image: null,
    status: "published",
    share_on_wall: true,
    user_id: partner?.account_user_id ?? null,
    moderation_reason: "Approved in partner review sheet",
  };

  let actId = s.act_id as string | null;
  if (actId) {
    const { error: upErr } = await admin.from("acts_of_kindness").update(fields).eq("id", actId);
    if (upErr) throw upErr;
  } else {
    const { data: act, error: actErr } = await admin.from("acts_of_kindness").insert(fields).select("id").single();
    if (actErr) throw actErr;
    actId = act.id as string;
  }

  // Same thumbnail step submit-act uses for Instagram/Facebook/TikTok/X links.
  if (videoUrl && !isYouTube(videoUrl)) {
    const task = fetch(`${SUPABASE_URL}/functions/v1/fetch-link-preview`, {
      method: "POST",
      headers: { Authorization: `Bearer ${SERVICE_ROLE_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ act_id: actId, url: videoUrl }),
    }).catch((e) => console.error("fetch-link-preview dispatch failed", e));
    // Keep the request alive until the dispatch is sent (Supabase Edge Runtime).
    (globalThis as { EdgeRuntime?: { waitUntil(p: Promise<unknown>): void } }).EdgeRuntime?.waitUntil(task);
  }
  return actId;
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
      // Acts the organization deleted since the last pull — the sheet greys
      // those rows out. Acked with the same "ack" call as new rows.
      const { data: deleted } = await admin
        .from("partner_deleted_submissions")
        .select("submission_id, deleted_by_name, deleted_at")
        .is("sheet_synced_at", null)
        .order("deleted_at", { ascending: true })
        .limit(PULL_LIMIT);
      return json({
        rows: await pull(admin),
        deleted: (deleted ?? []).map((d) => ({ id: d.submission_id, by: d.deleted_by_name ?? "", at: d.deleted_at })),
      });
    }

    if (body?.action === "ack") {
      const ids = (Array.isArray(body.ids) ? body.ids : []).filter((id: unknown) => typeof id === "string" && UUID_RE.test(id));
      if (ids.length) {
        const now = new Date().toISOString();
        await admin.from("partner_submissions").update({ sheet_synced_at: now }).in("id", ids);
        await admin.from("partner_deleted_submissions").update({ sheet_synced_at: now }).in("submission_id", ids);
      }
      return json({ ok: true, acked: ids.length });
    }

    if (body?.action === "review") {
      const id = String(body.submission_id ?? "");
      const status = STATUS_FROM_SHEET[String(body.status ?? "").trim().toLowerCase()];
      if (!UUID_RE.test(id) || !status) return json({ error: "Bad submission id or status" }, 400);
      const note = String(body.note ?? "").trim().slice(0, 1000) || null;

      const { data: current } = await admin
        .from("partner_submissions")
        .select("act_id")
        .eq("id", id)
        .maybeSingle();
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
      // The "Needs Changes" email to the organization is sent by the review
      // sheet itself (Gmail, via Apps Script), so replies land in the
      // reviewer's inbox — see supabase/sheets/partner-review.gs.
      return json({ ok: true, status, on_wall: status === "approved" });
    }

    if (body?.action === "video") {
      const id = String(body.submission_id ?? "");
      const youtubeUrl = normalizeYouTube(String(body.youtube_url ?? ""));
      if (!UUID_RE.test(id)) return json({ error: "Bad submission id" }, 400);
      if (youtubeUrl === undefined) {
        return json({ error: "Not a YouTube link — paste the video's youtube.com or youtu.be URL" }, 400);
      }

      const { data: current } = await admin.from("partner_submissions").select("act_id").eq("id", id).maybeSingle();
      if (!current) return json({ error: "Submission not found" }, 404);

      await admin.from("partner_submissions").update({ youtube_url: youtubeUrl }).eq("id", id);
      // Already on the wall? Update it now; otherwise approval picks it up.
      if (current.act_id) {
        await admin.from("acts_of_kindness").update({ video_url: youtubeUrl }).eq("id", current.act_id);
      }
      return json({ ok: true, youtube_url: youtubeUrl });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    console.error("partner-sheet error", e);
    return json({ error: "Server error" }, 500);
  }
});
