import { adminClient, corsHeaders, json, UUID_RE, type PartnerRow } from "../_shared/partner.ts";
import type { SupabaseClient } from "npm:@supabase/supabase-js@2";

/**
 * Partner portal sign-in. No email or password per person: each partner
 * (school) has ONE auth account, and staff prove who they are with a
 * generated Staff ID instead.
 *
 *   { action: "join",  invite_token, name }       -> new Staff ID + session token
 *   { action: "login", partner_id, staff_code }   -> session token
 *
 * The "session token" is a one-time magic-link token_hash for the school's
 * account (admin.generateLink never sends an email); the portal exchanges
 * it with supabase.auth.verifyOtp. The school account is created lazily the
 * first time anyone from that partner joins or logs in.
 */

const FAIL_WINDOW_MIN = 15;
const MAX_FAILS = 10; // per school and per IP, per window
const MAX_JOINS_PER_HOUR = 30; // per IP

function accountEmail(partnerId: string) {
  // Never receives mail — only exists so the account has a unique login key.
  // Deliberately NOT tied to the portal's public domain (now
  // partners.passkindnessforward.com): changing it would orphan existing accounts.
  return `partner-${partnerId}@partners.pasalopalante.com`;
}

async function ensureAccount(admin: SupabaseClient, partner: PartnerRow): Promise<string> {
  if (partner.account_user_id) {
    const { data } = await admin.auth.admin.getUserById(partner.account_user_id);
    if (data.user?.email) return data.user.email;
  }
  const email = accountEmail(partner.id);
  const password = crypto.randomUUID() + crypto.randomUUID();
  const { data: created, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: partner.name, partner_account: true, partner_id: partner.id },
  });
  let userId = created?.user?.id;
  if (error || !userId) {
    // Already exists (e.g. account_user_id was cleared) — look it up instead.
    const { data: prof } = await admin.from("profiles").select("user_id").eq("email", email).maybeSingle();
    userId = prof?.user_id;
    if (!userId) throw new Error(`could not create partner account: ${error?.message}`);
  }
  await admin.from("partners").update({ account_user_id: userId }).eq("id", partner.id);
  return email;
}

async function sessionToken(admin: SupabaseClient, email: string): Promise<string> {
  const { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email });
  if (error || !data.properties?.hashed_token) throw new Error(`generateLink failed: ${error?.message}`);
  return data.properties.hashed_token;
}

async function recentCount(admin: SupabaseClient, key: string, minutes: number) {
  const since = new Date(Date.now() - minutes * 60_000).toISOString();
  const { count } = await admin
    .from("partner_login_attempts")
    .select("id", { count: "exact", head: true })
    .eq("key", key)
    .gte("attempted_at", since);
  return count ?? 0;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const body = await req.json().catch(() => null);
  const action = body?.action;
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
  const admin = adminClient();

  try {
    if (action === "join") {
      const token = String(body.invite_token ?? "").trim();
      const name = String(body.name ?? "").trim().slice(0, 120);
      if (!token || !name) return json({ error: "Your name is required." }, 400);

      if ((await recentCount(admin, `join:${ip}`, 60)) >= MAX_JOINS_PER_HOUR) {
        return json({ error: "Too many sign-ups from this network. Try again in a bit." }, 429);
      }
      await admin.from("partner_login_attempts").insert({ key: `join:${ip}` });

      const { data: partner } = await admin
        .from("partners")
        .select("id, name, city, account_user_id")
        .eq("invite_token", token)
        .maybeSingle();
      if (!partner) return json({ error: "This invite link isn't valid. Ask your coordinator for a new one." }, 404);

      const { data: staffRows, error: staffErr } = await admin.rpc("partner_staff_create", {
        _partner_id: partner.id,
        _name: name,
      });
      if (staffErr || !staffRows?.[0]) throw new Error(`partner_staff_create failed: ${staffErr?.message}`);
      const staff = staffRows[0] as { staff_id: string; staff_code: string };

      const email = await ensureAccount(admin, partner as PartnerRow);
      await admin.from("partner_staff").update({ last_login_at: new Date().toISOString() }).eq("id", staff.staff_id);
      return json({
        token_hash: await sessionToken(admin, email),
        partner: { id: partner.id, name: partner.name, city: partner.city },
        staff: { id: staff.staff_id, name },
        staff_code: staff.staff_code,
      });
    }

    if (action === "login") {
      const partnerId = String(body.partner_id ?? "");
      const code = String(body.staff_code ?? "");
      if (!UUID_RE.test(partnerId) || !code.trim()) {
        return json({ error: "Pick your organization and enter your Kindness ID." }, 400);
      }

      const schoolKey = `login:${partnerId}`;
      const ipKey = `login-ip:${ip}`;
      const [schoolFails, ipFails] = await Promise.all([
        recentCount(admin, schoolKey, FAIL_WINDOW_MIN),
        recentCount(admin, ipKey, FAIL_WINDOW_MIN),
      ]);
      if (schoolFails >= MAX_FAILS || ipFails >= MAX_FAILS) {
        return json({ error: "Too many tries. Wait 15 minutes and try again." }, 429);
      }

      const { data: rows, error: verifyErr } = await admin.rpc("partner_verify_staff", {
        _partner_id: partnerId,
        _staff_code: code,
      });
      if (verifyErr) throw new Error(`partner_verify_staff failed: ${verifyErr.message}`);
      const staff = rows?.[0] as { staff_id: string; staff_name: string } | undefined;
      if (!staff) {
        await admin.from("partner_login_attempts").insert([{ key: schoolKey }, { key: ipKey }]);
        return json({ error: "That Kindness ID doesn't match this organization." }, 401);
      }

      const { data: partner } = await admin
        .from("partners")
        .select("id, name, city, account_user_id")
        .eq("id", partnerId)
        .single();
      const email = await ensureAccount(admin, partner as PartnerRow);
      await admin.from("partner_staff").update({ last_login_at: new Date().toISOString() }).eq("id", staff.staff_id);
      return json({
        token_hash: await sessionToken(admin, email),
        partner: { id: partner.id, name: partner.name, city: partner.city },
        staff: { id: staff.staff_id, name: staff.staff_name },
      });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    console.error("partner-auth error", e);
    return json({ error: "Something went wrong. Please try again." }, 500);
  }
});
