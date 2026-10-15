import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

/**
 * The PKF_Directory Google Sheet's only door into the database. Called by a
 * time-driven Apps Script trigger bound to that sheet (every ~15 minutes),
 * authenticated with the x-directory-secret header (set the same value as
 * the DIRECTORY_SYNC_SECRET Supabase function secret and the script's
 * CONFIG.SYNC_SECRET).
 *
 * Each call carries a full snapshot of every directory tab in the sheet
 * (every row, every status — not just Approved; visibility is enforced by
 * the table's RLS policy, not by what gets synced). The Apps Script never
 * reads or sends the sheet's Email or Internal Notes columns in the first
 * place, so there's nothing private in this payload to begin with — this
 * function doesn't need to (and doesn't) filter anything out on top of that.
 *
 * This is a mirror, not an append: rows present in the payload are upserted
 * by id (the sheet's own row ID, e.g. "CH-001" — globally unique across
 * tabs), and any row already in the table whose id is NOT in this payload
 * gets deleted, so removing a row in the sheet removes it here too. An empty
 * payload is refused rather than treated as "delete everything" — that's
 * far more likely to be a script error than an actual empty directory.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-directory-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SECRET = Deno.env.get("DIRECTORY_SYNC_SECRET") ?? "";

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
  category?: string;
  status?: string;
  name?: string;
  handle?: string;
  designation?: string;
  subcategory?: string;
  country?: string;
  region?: string;
  image?: string;
  bio?: string;
  socialLink?: string;
  sortOrder?: number;
}

interface Body {
  entries?: Entry[];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  if (!SECRET || !constantTimeEqual(req.headers.get("x-directory-secret") ?? "", SECRET)) {
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
    .filter((e): e is Entry & { id: string; category: string; status: string; name: string } =>
      typeof e.id === "string" && e.id.trim() !== "" &&
      typeof e.category === "string" && e.category.trim() !== "" &&
      typeof e.status === "string" && e.status.trim() !== "" &&
      typeof e.name === "string" && e.name.trim() !== "",
    )
    .map((e) => ({
      id: e.id.trim(),
      category: e.category.trim(),
      status: e.status.trim(),
      name: e.name.trim(),
      handle: e.handle?.trim() || null,
      designation: e.designation?.trim() || null,
      subcategory: e.subcategory?.trim() || null,
      country: e.country?.trim() || null,
      region: e.region?.trim() || null,
      image_url: e.image?.trim() || null,
      bio: e.bio?.trim() || null,
      social_link: e.socialLink?.trim() || null,
      sort_order: typeof e.sortOrder === "number" ? e.sortOrder : null,
      synced_at: new Date().toISOString(),
    }));

  if (rows.length === 0) {
    return json({ error: "No valid entries in payload — refusing to wipe the directory" }, 400);
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

  const { error: upsertError } = await supabase.from("directory_entries").upsert(rows, { onConflict: "id" });
  if (upsertError) {
    console.error("directory upsert failed", upsertError);
    return json({ error: "Could not sync directory entries" }, 500);
  }

  const { data: existingIds, error: listError } = await supabase.from("directory_entries").select("id");
  if (listError) {
    console.error("directory list failed", listError);
    return json({ ok: true, synced: rows.length, deleted: 0, warning: "Could not check for stale rows" });
  }

  const incomingIds = new Set(rows.map((r) => r.id));
  const staleIds = (existingIds ?? []).map((r) => r.id as string).filter((id) => !incomingIds.has(id));

  let deleted = 0;
  if (staleIds.length > 0) {
    const { error: deleteError } = await supabase.from("directory_entries").delete().in("id", staleIds);
    if (deleteError) {
      console.error("directory delete failed", deleteError);
      return json({ ok: true, synced: rows.length, deleted: 0, warning: "Could not remove stale rows" });
    }
    deleted = staleIds.length;
  }

  return json({ ok: true, synced: rows.length, deleted });
});
