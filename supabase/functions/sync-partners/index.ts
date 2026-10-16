import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

/**
 * The PKF_Partners Google Sheet's only door into the database. Called by a
 * time-driven Apps Script trigger bound to that sheet (every ~15 minutes),
 * authenticated with the x-partners-secret header (set the same value as
 * the PARTNERS_SYNC_SECRET Supabase function secret and the script's
 * CONFIG.SYNC_SECRET).
 *
 * Each call carries a full snapshot of every data row in the sheet — every
 * status, not just Approved; visibility is enforced by the table's RLS
 * policy, not by what gets synced. This is a mirror, not an append: rows
 * present in the payload are upserted by id (the sheet's own row ID, e.g.
 * "COR-001", "GOV-014"), and any row already in the table whose id is NOT
 * in this payload gets deleted, so removing a row in the sheet removes it
 * here too. An empty payload is refused rather than treated as "delete
 * everything" — far more likely to be a script error than an actually
 * empty directory.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-partners-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SECRET = Deno.env.get("PARTNERS_SYNC_SECRET") ?? "";

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
  logo?: string;
  website?: string;
  facebook?: string;
  role?: string;
  dark?: boolean;
  sortOrder?: number;
}

interface Body {
  entries?: Entry[];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  if (!SECRET || !constantTimeEqual(req.headers.get("x-partners-secret") ?? "", SECRET)) {
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
      logo_url: e.logo?.trim() || null,
      website: e.website?.trim() || null,
      facebook: e.facebook?.trim() || null,
      role: e.role?.trim() || null,
      dark: e.dark === true,
      sort_order: typeof e.sortOrder === "number" ? e.sortOrder : null,
      synced_at: new Date().toISOString(),
    }));

  if (rows.length === 0) {
    return json({ error: "No valid entries in payload — refusing to wipe the directory" }, 400);
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

  const { error: upsertError } = await supabase.from("partner_entries").upsert(rows, { onConflict: "id" });
  if (upsertError) {
    console.error("partner entries upsert failed", upsertError);
    return json({ error: "Could not sync partner entries" }, 500);
  }

  const { data: existingIds, error: listError } = await supabase.from("partner_entries").select("id");
  if (listError) {
    console.error("partner entries list failed", listError);
    return json({ ok: true, synced: rows.length, deleted: 0, warning: "Could not check for stale rows" });
  }

  const incomingIds = new Set(rows.map((r) => r.id));
  const staleIds = (existingIds ?? []).map((r) => r.id as string).filter((id) => !incomingIds.has(id));

  let deleted = 0;
  if (staleIds.length > 0) {
    const { error: deleteError } = await supabase.from("partner_entries").delete().in("id", staleIds);
    if (deleteError) {
      console.error("partner entries delete failed", deleteError);
      return json({ ok: true, synced: rows.length, deleted: 0, warning: "Could not remove stale rows" });
    }
    deleted = staleIds.length;
  }

  return json({ ok: true, synced: rows.length, deleted });
});
