import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { sendWelcome } from "../_shared/partnerWelcome.ts";

/**
 * The Ambassador Kit Google Sheet's only door into the database. Called by
 * the Apps Script (Code.gs's syncAmbassadorDirectory_), authenticated with
 * the x-ambassador-secret header (set the same value as the
 * AMBASSADOR_SYNC_SECRET Supabase function secret and the script's
 * CONFIG.SYNC_SECRET).
 *
 * Called twice per ambassador: once right after their form submission is
 * saved (name, country, region, role, socials, round badge photo), and
 * again once Kit.gs finishes generating their badge (badgeUrl only, once
 * it's known). Upserts by a one-way hash of the email — never the email
 * itself, matching the directory page's "Never Email" design note — so the
 * second call updates the same row instead of creating a duplicate, and so
 * does an accidental resubmission if the script's own dedup check is ever
 * bypassed.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-ambassador-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SECRET = Deno.env.get("AMBASSADOR_SYNC_SECRET") ?? "";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

function constantTimeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function sha256Hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

interface Body {
  email?: string;
  name?: string;
  country?: string;
  region?: string;
  role?: string;
  instagram?: string;
  facebook?: string;
  tiktok?: string;
  otherSocial?: string;
  website?: string;
  photoBase64?: string;
  photoMimeType?: string;
  badgeUrl?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  if (!SECRET || !constantTimeEqual(req.headers.get("x-ambassador-secret") ?? "", SECRET)) {
    return json({ error: "Unauthorized" }, 401);
  }

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid body" }, 400);
  }

  const email = (body.email ?? "").toString().trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: "Invalid email" }, 400);
  const emailHash = await sha256Hex(email);

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

  // Optional photo upload — only present on the first sync call (right after
  // submission); the later badge-link call won't re-send it.
  let photoUrl: string | undefined;
  if (body.photoBase64) {
    const mime = (body.photoMimeType || "image/png").toString();
    const ext = mime.includes("jpeg") ? "jpg" : mime.includes("webp") ? "webp" : "png";
    let bytes: Uint8Array;
    try {
      bytes = Uint8Array.from(atob(body.photoBase64), (c) => c.charCodeAt(0));
    } catch {
      return json({ error: "Invalid photo data" }, 400);
    }
    const path = `${emailHash}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("ambassador-photos")
      .upload(path, bytes, { contentType: mime, upsert: true });
    if (uploadError) {
      console.error("ambassador photo upload failed", uploadError);
      return json({ error: "Photo upload failed" }, 500);
    }
    const { data: pub } = supabase.storage.from("ambassador-photos").getPublicUrl(path);
    photoUrl = `${pub.publicUrl}?v=${Date.now()}`; // cache-bust in case this is a replacement photo
  }

  // Only set fields this call actually carries, so the badge-link-only call
  // never blanks out everything else already saved for this ambassador.
  const fields: Record<string, unknown> = { email_hash: emailHash };
  const setIfString = (key: string, value: unknown) => {
    if (typeof value !== "string") return;
    const v = value.trim();
    if (v) fields[key] = v;
  };
  setIfString("name", body.name);
  setIfString("country", body.country);
  setIfString("region", body.region);
  setIfString("role", body.role);
  setIfString("instagram", body.instagram);
  setIfString("facebook", body.facebook);
  setIfString("tiktok", body.tiktok);
  setIfString("other_social", body.otherSocial);
  setIfString("website", body.website);
  setIfString("badge_url", body.badgeUrl);
  if (photoUrl) fields.photo_url = photoUrl;

  const { data: existing } = await supabase
    .from("ambassadors")
    .select("id")
    .eq("email_hash", emailHash)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase.from("ambassadors").update(fields).eq("id", existing.id);
    if (error) {
      console.error("ambassador update failed", error);
      return json({ error: "Could not update ambassador" }, 500);
    }
    return json({ ok: true, id: existing.id, created: false });
  }

  if (!fields.name || !fields.country || !fields.role) {
    return json({ error: "name, country and role are required for a new ambassador" }, 400);
  }
  const { data: inserted, error: insertError } = await supabase
    .from("ambassadors")
    .insert(fields)
    .select("id")
    .single();
  if (insertError) {
    console.error("ambassador insert failed", insertError);
    return json({ error: "Could not save ambassador" }, 500);
  }
  // A NEW ambassador also gets a Partners Hub account and the welcome email (25 Nov 2026).
  // Only here, on the first save: an update (the badge call, or a re-sync of the whole sheet)
  // never creates accounts or sends email. A problem here never fails the ambassador's sign-up.
  let hub: Record<string, unknown> = {};
  try {
    hub = await joinPartnersHub(supabase, email, fields, body);
  } catch (err) {
    console.error("partners hub account for ambassador failed", err);
    hub = { hubError: String((err as { message?: string })?.message ?? err).slice(0, 300) };
  }
  return json({ ok: true, id: inserted.id, created: true, ...hub });
});

/** Creates the ambassador's Partners Hub account (a member of one), with their photo, and welcomes them. */
async function joinPartnersHub(supabase: any, email: string, fields: Record<string, unknown>, body: Body) {
  const { data: already } = await supabase
    .from("partners")
    .select("id, name, org_type, contact_email, invite_token, welcome_sent_at")
    .eq("org_type", "ambassador")
    .ilike("contact_email", email)
    .limit(1)
    .maybeSingle();
  let member = already;
  if (!member) {
    const { data, error } = await supabase
      .from("partners")
      .insert({
        name: String(fields.name).slice(0, 160),
        org_type: "ambassador",
        contact_email: email,
        contact_name: String(fields.name).slice(0, 120),
        country: (fields.country as string) ?? null,
        region: (fields.region as string) ?? null,
        about: typeof fields.role === "string" ? String(fields.role).slice(0, 600) : null,
        instagram: typeof fields.instagram === "string" ? String(fields.instagram).slice(0, 200) : null,
        facebook: typeof fields.facebook === "string" ? String(fields.facebook).slice(0, 300) : null,
        website: typeof fields.website === "string" && /^https?:\/\//i.test(String(fields.website)) ? fields.website : null,
      })
      .select("id, name, org_type, contact_email, invite_token, welcome_sent_at")
      .single();
    if (error) throw new Error(`partners insert: ${error.message}`);
    member = data;
    // their sign-up photo becomes their Partners Hub picture
    if (body.photoBase64) {
      try {
        const mime = (body.photoMimeType || "image/png").toString();
        const ext = mime.includes("jpeg") ? "jpg" : mime.includes("webp") ? "webp" : "png";
        const bytes = Uint8Array.from(atob(body.photoBase64), (c) => c.charCodeAt(0));
        const path = `${member.id}/profile/photo.${ext}`;
        const up = await supabase.storage.from("partner-media").upload(path, bytes, { contentType: mime, upsert: true });
        if (!up.error) await supabase.from("partners").update({ logo_path: path }).eq("id", member.id);
      } catch (e) {
        console.error("ambassador hub photo failed", e);
      }
    }
  }
  const sent = await sendWelcome(supabase, member);
  return { hubMemberId: member.id, welcomeSent: sent };
}
