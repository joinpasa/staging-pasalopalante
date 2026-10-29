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
 *
 * Partner portal: a row that is Approved AND has Portal Access = Yes also
 * gets an organization in the partner portal (public.partners), created
 * once and linked by the sheet row ID. Its invite link is returned in
 * `portalLinks` so the script can write it back into the sheet. Portal orgs
 * are never deleted from here — they hold the partner's submitted acts.
 *
 * GHL: once per org, the invite link is saved on the contact (matched by
 * the row's Contact Email) in the custom field `partner_portal_url`, and
 * the tag `partner-portal-invite` is added — a GHL workflow on that tag
 * sends the invite email. Retried each sync until it succeeds.
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
  /** Sheet's "Featured" column. Accepts a real boolean (checkbox) or a
   * yes/no-style string so either column type works in the sheet. */
  featured?: boolean | string;
  /** Sheet's "Portal Access" column (Yes/No). */
  portal?: boolean | string;
  /** Sheet's "Contact Email" column — only ever goes to the private portal
   * org row, never to the public partner_entries table. */
  contactEmail?: string;
}

const PORTAL_JOIN_URL = "https://partners.passkindnessforward.com/join/";
const GHL_BASE_URL = "https://services.leadconnectorhq.com";
const GHL_PORTAL_FIELD = "partner_portal_url";
const GHL_PORTAL_TAG = "partner-portal-invite";
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/** Sheet Category → the portal's org_type (free text in the sheet). */
function orgType(category: string): string {
  const c = category.toLowerCase();
  if (/school|educat|universit|college|academ/.test(c)) return "school";
  if (/faith|church|religio|ministr/.test(c)) return "faith";
  if (/gov|municip|city|town|public sector/.test(c)) return "government";
  if (/non-?profit|ngo|foundation|charit/.test(c)) return "ngo";
  if (/communit|civic|club|association/.test(c)) return "community";
  if (/business|compan|corporat|brand|media|press|retail|restaurant/.test(c)) return "company";
  return "other";
}

function isTruthy(v: unknown) {
  if (v === true) return true;
  if (typeof v !== "string") return false;
  return ["yes", "y", "true", "x", "1", "featured"].includes(v.trim().toLowerCase());
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
      featured: isTruthy(e.featured),
      synced_at: new Date().toISOString(),
    }));

  if (rows.length === 0) {
    return json({ error: "No valid entries in payload — refusing to wipe the directory" }, 400);
  }

  // Two sheet rows sharing an ID would make the whole upsert fail
  // ("ON CONFLICT DO UPDATE command cannot affect row a second time"), so
  // one copy-paste slip used to block every sync. Keep the last occurrence
  // of each ID (lowest in the sheet) and report the duplicates back so the
  // script's log says which IDs to fix.
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

  const { error: upsertError } = await supabase.from("partner_entries").upsert(uniqueRows, { onConflict: "id" });
  if (upsertError) {
    console.error("partner entries upsert failed", upsertError);
    // Detail is returned on purpose: this endpoint is only callable with the
    // sync secret (i.e. by the sheet's own Apps Script), and without it the
    // script's log can't say *why* a sync failed.
    return json(
      {
        error: "Could not sync partner entries",
        detail: upsertError.message,
        code: upsertError.code,
        hint: upsertError.hint ?? undefined,
      },
      500,
    );
  }

  const { data: existingIds, error: listError } = await supabase.from("partner_entries").select("id");
  if (listError) {
    console.error("partner entries list failed", listError);
    return json({ ok: true, synced: uniqueRows.length, deleted: 0, warning: "Could not check for stale rows", ...dupes });
  }

  const incomingIds = new Set(uniqueRows.map((r) => r.id));
  const staleIds = (existingIds ?? []).map((r) => r.id as string).filter((id) => !incomingIds.has(id));

  let deleted = 0;
  if (staleIds.length > 0) {
    const { error: deleteError } = await supabase.from("partner_entries").delete().in("id", staleIds);
    if (deleteError) {
      console.error("partner entries delete failed", deleteError);
      return json({ ok: true, synced: uniqueRows.length, deleted: 0, warning: "Could not remove stale rows", ...dupes });
    }
    deleted = staleIds.length;
  }

  const portal = await syncPortalOrgs(supabase, incoming);

  return json({ ok: true, synced: uniqueRows.length, deleted, ...dupes, ...portal });
});

/**
 * Creates (once) a partner-portal org for every Approved + Portal Access row
 * and returns { portalLinks: { [sheetId]: inviteUrl } } for all of them.
 * Failures here are reported as a warning, never fail the public sync.
 */
// deno-lint-ignore no-explicit-any
async function syncPortalOrgs(supabase: any, incoming: Entry[]) {
  const wanted = new Map<string, { name: string; category: string; email: string | null }>();
  for (const e of incoming) {
    const id = e.id?.trim();
    const name = e.name?.trim();
    if (!id || !name || !e.category?.trim()) continue;
    if (e.status?.trim().toLowerCase() !== "approved" || !isTruthy(e.portal)) continue;
    const email = e.contactEmail?.trim() ?? "";
    wanted.set(id, { name: name.slice(0, 160), category: e.category.trim(), email: EMAIL_RE.test(email) ? email : null });
  }
  if (wanted.size === 0) return {};

  try {
    const ids = [...wanted.keys()];
    const { data: linked, error: linkedErr } = await supabase
      .from("partners").select("id, sheet_entry_id, invite_token, contact_email, ghl_invite_pushed_at").in("sheet_entry_id", ids);
    if (linkedErr) throw linkedErr;
    const tokenById = new Map<string, string>();
    // Orgs whose link hasn't reached GHL yet: portal org id → { email, link }.
    const toPush = new Map<string, { email: string; link: string }>();
    for (const p of linked ?? []) {
      tokenById.set(p.sheet_entry_id, p.invite_token);
      if (!p.ghl_invite_pushed_at && p.contact_email) toPush.set(p.id, { email: p.contact_email, link: PORTAL_JOIN_URL + p.invite_token });
    }

    const created: string[] = [];
    for (const [id, w] of wanted) {
      if (tokenById.has(id)) continue;
      // An org someone already added by hand (same name, not yet linked)
      // gets linked instead of duplicated.
      const { data: manual } = await supabase
        .from("partners").select("id, invite_token, contact_email, ghl_invite_pushed_at").is("sheet_entry_id", null).ilike("name", w.name.replace(/[%_\\]/g, "\\$&")).limit(1);
      if (manual && manual.length > 0) {
        const { error } = await supabase.from("partners").update({ sheet_entry_id: id }).eq("id", manual[0].id);
        if (error) throw error;
        tokenById.set(id, manual[0].invite_token);
        const email = manual[0].contact_email ?? w.email;
        if (!manual[0].ghl_invite_pushed_at && email) toPush.set(manual[0].id, { email, link: PORTAL_JOIN_URL + manual[0].invite_token });
        continue;
      }
      const { data: inserted, error } = await supabase
        .from("partners")
        .insert({ name: w.name, org_type: orgType(w.category), contact_email: w.email, sheet_entry_id: id })
        .select("id, invite_token")
        .single();
      if (error) throw error;
      tokenById.set(id, inserted.invite_token);
      if (w.email) toPush.set(inserted.id, { email: w.email, link: PORTAL_JOIN_URL + inserted.invite_token });
      created.push(id);
    }

    const portalLinks: Record<string, string> = {};
    for (const [id, token] of tokenById) portalLinks[id] = PORTAL_JOIN_URL + token;
    const ghl = await pushInvitesToGhl(supabase, toPush);
    return { portalLinks, portalCreated: created, ...ghl };
  } catch (err) {
    console.error("portal org sync failed", err);
    return { portalWarning: `Could not create portal orgs: ${(err as { message?: string })?.message ?? err}` };
  }
}

/**
 * Saves each new portal invite link on the partner's GHL contact and tags
 * it so the GHL workflow emails it. Marks the org as pushed only on
 * success, so a failure (or a contact that doesn't exist yet) is retried on
 * the next sync instead of being lost.
 */
// deno-lint-ignore no-explicit-any
async function pushInvitesToGhl(supabase: any, toPush: Map<string, { email: string; link: string }>) {
  const apiKey = Deno.env.get("GHL_API_KEY");
  const locationId = Deno.env.get("GHL_LOCATION_ID");
  if (toPush.size === 0) return {};
  if (!apiKey || !locationId) return { ghlWarning: "GHL not configured — invite links not pushed" };

  const headers = { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", Version: "2021-07-28" };
  const pushed: string[] = [];
  const notInGhl: string[] = [];
  const failed: string[] = [];
  for (const [orgId, { email, link }] of toPush) {
    try {
      const searchRes = await fetch(
        `${GHL_BASE_URL}/contacts/search?email=${encodeURIComponent(email)}&locationId=${locationId}`,
        { headers },
      );
      if (!searchRes.ok) throw new Error(`search ${searchRes.status}: ${await searchRes.text()}`);
      const contactId = (await searchRes.json()).contacts?.[0]?.id;
      if (!contactId) {
        notInGhl.push(email);
        continue;
      }
      // Custom field first, tag second: the tag is what fires the email,
      // so the link must already be on the contact when it lands.
      const fieldRes = await fetch(`${GHL_BASE_URL}/contacts/${contactId}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ customFields: [{ key: GHL_PORTAL_FIELD, field_value: link }] }),
      });
      if (!fieldRes.ok) throw new Error(`field ${fieldRes.status}: ${await fieldRes.text()}`);
      const tagRes = await fetch(`${GHL_BASE_URL}/contacts/${contactId}/tags`, {
        method: "POST",
        headers,
        body: JSON.stringify({ tags: [GHL_PORTAL_TAG] }),
      });
      if (!tagRes.ok) throw new Error(`tag ${tagRes.status}: ${await tagRes.text()}`);
      const { error } = await supabase.from("partners").update({ ghl_invite_pushed_at: new Date().toISOString() }).eq("id", orgId);
      if (error) throw error;
      pushed.push(email);
    } catch (err) {
      console.error("GHL invite push failed", email, err);
      failed.push(email);
    }
  }
  return {
    ghlInvitesPushed: pushed,
    ...(notInGhl.length ? { ghlContactNotFound: notInGhl } : {}),
    ...(failed.length ? { ghlInviteFailed: failed } : {}),
  };
}
