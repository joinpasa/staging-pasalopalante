import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

/**
 * The PKF_Media Google Sheet's only door into the database. Called by a
 * time-driven Apps Script trigger bound to that sheet (every ~15 minutes),
 * authenticated with the x-media-secret header (set the same value as the
 * MEDIA_SYNC_SECRET Supabase function secret and the script's
 * CONFIG.SYNC_SECRET).
 *
 * Same mirror semantics as sync-partners: each call carries a full snapshot
 * of every data row (every status — visibility is enforced by the table's
 * RLS policy), rows present are upserted by the sheet's own ID (e.g.
 * "ART-001", "SOC-012"), rows missing from the payload are deleted, and an
 * empty payload is refused rather than treated as "delete everything".
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-media-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SECRET = Deno.env.get("MEDIA_SYNC_SECRET") ?? "";

const TYPES = ["article", "youtube", "spotify", "facebook", "instagram", "x", "linkedin"];

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

function constantTimeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

interface Entry {
  id?: string;
  section?: string;
  status?: string;
  /** Sheet's "Featured?" column — real boolean (checkbox) or yes/no string. */
  featured?: boolean | string;
  outlet?: string;
  title?: string;
  url?: string;
  type?: string;
  imageUrl?: string;
  descriptionEn?: string;
  descriptionEs?: string;
  note?: string;
  sortOrder?: number;
}

function isTruthy(v: unknown) {
  if (v === true) return true;
  if (typeof v !== "string") return false;
  return ["yes", "y", "true", "x", "1", "featured"].includes(v.trim().toLowerCase());
}

/** Unknown/blank Type falls back to a plain article link card. */
function normalizeType(v: unknown) {
  const t = typeof v === "string" ? v.trim().toLowerCase() : "";
  return TYPES.includes(t) ? t : "article";
}

interface Body {
  entries?: Entry[];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  if (!SECRET || !constantTimeEqual(req.headers.get("x-media-secret") ?? "", SECRET)) {
    return json({ error: "Unauthorized" }, 401);
  }

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid body" }, 400);
  }

  const incoming = Array.isArray(body.entries) ? body.entries : [];
  const rows = incoming
    .filter((e): e is Entry & { id: string; section: string; status: string; outlet: string } =>
      typeof e.id === "string" && e.id.trim() !== "" &&
      typeof e.section === "string" && e.section.trim() !== "" &&
      typeof e.status === "string" && e.status.trim() !== "" &&
      typeof e.outlet === "string" && e.outlet.trim() !== "",
    )
    .map((e) => ({
      id: e.id.trim(),
      section: e.section.trim(),
      status: e.status.trim(),
      featured: isTruthy(e.featured),
      outlet: e.outlet.trim(),
      title: e.title?.trim() || null,
      url: e.url?.trim() || null,
      type: normalizeType(e.type),
      image_url: e.imageUrl?.trim() || null,
      description_en: e.descriptionEn?.trim() || null,
      description_es: e.descriptionEs?.trim() || null,
      note: e.note?.trim() || null,
      sort_order: typeof e.sortOrder === "number" && Number.isFinite(e.sortOrder) ? e.sortOrder : null,
      synced_at: new Date().toISOString(),
    }));

  if (rows.length === 0) {
    return json({ error: "No valid entries in payload — refusing to wipe the media list" }, 400);
  }

  // Two sheet rows sharing an ID would make the whole upsert fail, so keep
  // the last occurrence of each ID and report the duplicates back so the
  // script's log says which IDs to fix (Media → Fix duplicate IDs).
  const byId = new Map<string, (typeof rows)[number]>();
  const duplicateIds = new Set<string>();
  for (const r of rows) {
    if (byId.has(r.id)) duplicateIds.add(r.id);
    byId.set(r.id, r);
  }
  const uniqueRows = [...byId.values()];
  const dupes = duplicateIds.size > 0 ? { duplicateIds: [...duplicateIds] } : {};

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

  const { error: upsertError } = await supabase.from("media_entries").upsert(uniqueRows, { onConflict: "id" });
  if (upsertError) {
    console.error("media entries upsert failed", upsertError);
    // Detail is returned on purpose: only the sheet's own script (holding the
    // secret) can call this, and its log needs to say *why* a sync failed.
    return json(
      {
        error: "Could not sync media entries",
        detail: upsertError.message,
        code: upsertError.code,
        hint: upsertError.hint ?? undefined,
      },
      500,
    );
  }

  const { data: existingIds, error: listError } = await supabase.from("media_entries").select("id");
  if (listError) {
    console.error("media entries list failed", listError);
    return json({ ok: true, synced: uniqueRows.length, deleted: 0, warning: "Could not check for stale rows", ...dupes });
  }

  const incomingIds = new Set(uniqueRows.map((r) => r.id));
  const staleIds = (existingIds ?? []).map((r) => r.id as string).filter((id) => !incomingIds.has(id));

  let deleted = 0;
  if (staleIds.length > 0) {
    const { error: deleteError } = await supabase.from("media_entries").delete().in("id", staleIds);
    if (deleteError) {
      console.error("media entries delete failed", deleteError);
      return json({ ok: true, synced: uniqueRows.length, deleted: 0, warning: "Could not remove stale rows", ...dupes });
    }
    deleted = staleIds.length;
  }

  return json({ ok: true, synced: uniqueRows.length, deleted, ...dupes });
});
