import { adminClient, corsHeaders, isPlaceholderEmail, json, UUID_RE, type PartnerRow } from "../_shared/partner.ts";
import { escapeHtml, SENDER_DOMAIN } from "../_shared/ops.ts";
import { sendWelcome } from "../_shared/partnerWelcome.ts";
import type { SupabaseClient } from "npm:@supabase/supabase-js@2";

/*
 * Partners Hub (25 Nov 2026) adds sign-in by email for an organisation's contact person:
 *
 *   { action: "email_link", email, lang }   -> emails a one-time link to every organisation whose
 *                                              contact email this is; always answers ok
 *   { action: "redeem", token, name? }      -> session token, like login; the first time, asks for
 *                                              the person's name and gives them a Kindness ID too
 *   { action: "send_welcome", partner_id }  -> the team (signed in to the Kindness Hub) sends a
 *                                              member the welcome email again
 */
const LINK_MINUTES = 30;
const PORTAL = "https://partners.passkindnessforward.com";
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

async function sha256Hex(s: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function randomToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function linkEmail(lang: "en" | "es", rows: { name: string; url: string }[]) {
  const es = lang === "es";
  const subject = es ? "Tu enlace para entrar al Partners Hub" : "Your link to the Partners Hub";
  const intro = es
    ? `Toca el enlace para entrar al Partners Hub de Kindness Forward. Funciona una vez y vence en ${LINK_MINUTES} minutos.`
    : `Tap the link to sign in to the Kindness Forward Partners Hub. It works once and expires in ${LINK_MINUTES} minutes.`;
  const ignore = es
    ? "Si no pediste este enlace, puedes ignorar este correo."
    : "If you didn't ask for this link, you can ignore this email.";
  const button = (r: { name: string; url: string }) =>
    `<p style="margin:0 0 14px"><a href="${r.url}" style="display:inline-block;background:#0e234b;color:#ffffff;font-weight:700;text-decoration:none;padding:12px 18px">${
      escapeHtml(es ? `Entrar como ${r.name}` : `Sign in as ${r.name}`)
    }</a></p>`;
  const html = `<div style="font-family:Montserrat,Arial,sans-serif;color:#0e234b;max-width:520px">
<div style="height:8px;background:linear-gradient(90deg,#fdb813,#f37023)"></div>
<h1 style="font-size:22px;margin:22px 0 10px">${escapeHtml(subject)}</h1>
<p style="font-size:15px;line-height:1.55;color:#33415e;margin:0 0 18px">${escapeHtml(intro)}</p>
${rows.map(button).join("\n")}
<p style="font-size:13px;color:#6b7790;margin:18px 0 0">${escapeHtml(ignore)}</p></div>`;
  const text = `${subject}\n\n${intro}\n\n${rows.map((r) => `${r.name}: ${r.url}`).join("\n")}\n\n${ignore}`;
  return { subject, html, text };
}

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

    if (action === "email_link") {
      const email = String(body.email ?? "").trim().toLowerCase();
      const lang = body.lang === "es" ? "es" : "en";
      if (!EMAIL_RE.test(email) || email.length > 200) return json({ error: "Type the email address we have for your organisation." }, 400);
      // Same answer whether or not the address is known, so this can't be used to find contacts.
      const ok = json({ ok: true });
      if (isPlaceholderEmail(email)) return ok;
      const [ipCount, emailCount] = await Promise.all([recentCount(admin, `link-ip:${ip}`, 60), recentCount(admin, `link:${email}`, 60)]);
      if (ipCount >= 10 || emailCount >= 3) return json({ error: "Too many links asked for. Try again in an hour." }, 429);
      await admin.from("partner_login_attempts").insert([{ key: `link-ip:${ip}` }, { key: `link:${email}` }]);

      const { data: partners } = await admin.from("partners").select("id, name").ilike("contact_email", email).limit(10);
      const { data: staffRows } = await admin.from("partner_staff").select("partner_id, partners(id, name)").ilike("email", email).eq("active", true).limit(10);
      const found = new Map<string, string>();
      for (const p of partners ?? []) found.set(p.id, p.name);
      for (const s of (staffRows ?? []) as { partner_id: string; partners: { id: string; name: string } | null }[]) {
        if (s.partners) found.set(s.partners.id, s.partners.name);
      }
      if (found.size === 0) return ok;

      const links: { name: string; url: string }[] = [];
      const expires = new Date(Date.now() + LINK_MINUTES * 60_000).toISOString();
      for (const [partnerId, name] of found) {
        const token = randomToken();
        const { error } = await admin.from("partner_login_links").insert({
          partner_id: partnerId,
          email,
          token_hash: await sha256Hex(token),
          expires_at: expires,
        });
        if (error) throw new Error(`could not save the link: ${error.message}`);
        links.push({ name, url: `${PORTAL}/link/${token}` });
      }
      const mail = linkEmail(lang, links);
      const { error: qErr } = await admin.rpc("enqueue_email", {
        queue_name: "transactional_emails",
        payload: {
          message_id: crypto.randomUUID(),
          to: email,
          from: `Kindness Forward <noreply@${SENDER_DOMAIN}>`,
          subject: mail.subject,
          html: mail.html,
          text: mail.text,
          label: "partner_sign_in_link",
          queued_at: new Date().toISOString(),
        },
      });
      if (qErr) throw new Error(`could not queue the email: ${qErr.message}`);
      return ok;
    }

    if (action === "redeem") {
      const token = String(body.token ?? "").trim();
      if (!/^[0-9a-f]{48}$/.test(token)) return json({ error: "This sign-in link isn't valid. Ask for a new one." }, 400);
      const { data: link } = await admin
        .from("partner_login_links")
        .select("id, partner_id, email, expires_at, used_at")
        .eq("token_hash", await sha256Hex(token))
        .maybeSingle();
      if (!link || link.used_at || new Date(link.expires_at).getTime() < Date.now()) {
        return json({ error: "This sign-in link has expired or was already used. Ask for a new one." }, 410);
      }
      const { data: partner } = await admin.from("partners").select("id, name, city, account_user_id").eq("id", link.partner_id).single();

      let { data: staff } = await admin
        .from("partner_staff")
        .select("id, name")
        .eq("partner_id", link.partner_id)
        .ilike("email", link.email)
        .eq("active", true)
        .order("created_at")
        .limit(1)
        .maybeSingle();
      let staffCode: string | undefined;
      if (!staff) {
        const name = String(body.name ?? "").trim().slice(0, 120);
        // Not used up yet: the person types their name, then the same link signs them in.
        if (!name) return json({ needs_name: true, partner: { id: partner.id, name: partner.name } });
        const { data: rows, error } = await admin.rpc("partner_staff_create", { _partner_id: link.partner_id, _name: name });
        if (error || !rows?.[0]) throw new Error(`partner_staff_create failed: ${error?.message}`);
        const created = rows[0] as { staff_id: string; staff_code: string };
        await admin.from("partner_staff").update({ email: link.email }).eq("id", created.staff_id);
        staff = { id: created.staff_id, name };
        staffCode = created.staff_code;
      }
      const { data: used } = await admin
        .from("partner_login_links")
        .update({ used_at: new Date().toISOString(), staff_id: staff.id })
        .eq("id", link.id)
        .is("used_at", null)
        .select("id");
      if (!used?.length) return json({ error: "This sign-in link was already used. Ask for a new one." }, 410);

      const email = await ensureAccount(admin, partner as PartnerRow);
      await admin.from("partner_staff").update({ last_login_at: new Date().toISOString() }).eq("id", staff.id);
      return json({
        token_hash: await sessionToken(admin, email),
        partner: { id: partner.id, name: partner.name, city: partner.city },
        staff: { id: staff.id, name: staff.name },
        staff_code: staffCode,
      });
    }

    if (action === "send_welcome") {
      const bearer = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
      const { data: who } = bearer ? await admin.auth.getUser(bearer) : { data: { user: null } };
      if (!who?.user) return json({ error: "Sign in to the Kindness Hub first." }, 401);
      const { data: role } = await admin.rpc("hub_role", { _user_id: who.user.id });
      if (!role) return json({ error: "Only the Kindness Forward team can send this." }, 403);
      const partnerId = String(body.partner_id ?? "");
      if (!UUID_RE.test(partnerId)) return json({ error: "Which member?" }, 400);
      const { data: member } = await admin
        .from("partners")
        .select("id, name, org_type, contact_email, invite_token, welcome_sent_at")
        .eq("id", partnerId)
        .maybeSingle();
      if (!member) return json({ error: "That member doesn't exist." }, 404);
      if (!member.contact_email) return json({ error: "There's no email for this member yet." }, 400);
      if ((await recentCount(admin, `welcome:${partnerId}`, 60)) >= 3) {
        return json({ error: "That's three welcome emails this hour. Try again later." }, 429);
      }
      await admin.from("partner_login_attempts").insert({ key: `welcome:${partnerId}` });
      await sendWelcome(admin, member, true);
      return json({ ok: true, to: member.contact_email });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    console.error("partner-auth error", e);
    return json({ error: "Something went wrong. Please try again." }, 500);
  }
});
