import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { escapeHtml, notifyOps, SITE_NAME } from "../_shared/ops.ts";
import { checkRateLimit, envInt, getClientIp, rateLimitedResponse, rateLimitIpKey, rateLimitMultiplier } from "../_shared/rateLimit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const TYPES = ["individual", "organization"] as const;
const HELP_ROLES = ["do_acts", "champion", "ambassador", "civic", "volunteer"] as const;
const ORG_TYPES = ["school", "company", "nonprofit", "ngo", "municipality", "faith", "other"] as const;

// The number input on both pledge forms technically allows up to 1 billion
// (the hard DB constraint) in a single submission, with no login required
// and no human in the loop — exactly how one joke/bad-faith submission once
// pushed the public "Acts pledged" total past 1B. Anything past these
// per-type thresholds (well above the forms' own presets — 500 for
// individuals, 10,000 for organizations — so a genuine enthusiastic pledge
// still sails through) is held as 'pending' instead of auto-publishing, the
// same way AI-flagged messages are, so it can't skew the public total until
// a human has looked at it.
const PLEDGE_REVIEW_THRESHOLD: Record<typeof TYPES[number], number> = {
  individual: 10_000,
  organization: 1_000_000,
};

// Hard cap on an individual pledge, rejected outright (400) rather than held
// for review. Set equal to the individual review threshold above by design:
// nothing above 10,000 is ever accepted from an individual, so the
// "hold for review" branch for individuals never fires — organizations
// (threshold 1,000,000, no separate cap) still go through that review path.
const MAX_INDIVIDUAL_PLEDGE = envInt("MAX_INDIVIDUAL_PLEDGE", 10_000);

// Matches packages/shared/src/i18n/translations.ts's Language union — see
// the same reasoning in submit-act/index.ts for why this beats guessing.
const VALID_LANGS = ["en", "zh", "hi", "es", "fr", "ar", "bn", "pt", "ru", "de", "sl"];

interface Body {
  type: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  org_name?: string;
  chapter?: string;
  org_website?: string;
  pledge_count?: number;
  message?: string;
  help_role?: string | null;
  country?: string | null;
  org_type?: string | null;
  lang?: string;
}

function bad(msg: string, status = 400) {
  return new Response(JSON.stringify({ error: msg }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function isEmail(s: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = (await req.json()) as Body;
    if (!body || typeof body !== "object") return bad("Invalid body");
    if (!TYPES.includes(body.type as typeof TYPES[number])) return bad("Invalid type");

    const firstName = (body.first_name ?? "").toString().trim().slice(0, 60);
    const lastName = (body.last_name ?? "").toString().trim().slice(0, 60);
    const email = (body.email ?? "").toString().trim().slice(0, 200);
    const phone = (body.phone ?? "").toString().trim().slice(0, 40);
    const orgNameRaw = (body.org_name ?? "").toString().trim().slice(0, 120);
    const chapter = (body.chapter ?? "").toString().trim().slice(0, 120);
    const orgName = chapter ? `${orgNameRaw} — ${chapter}`.slice(0, 240) : orgNameRaw;
    const orgWebsite = (body.org_website ?? "").toString().trim().slice(0, 300);
    const message = (body.message ?? "").toString().trim().slice(0, 600);
    let pledgeCount = Number.isFinite(body.pledge_count) ? Math.floor(body.pledge_count!) : 1;
    if (pledgeCount < 1) pledgeCount = 1;
    if (pledgeCount > 1_000_000_000) pledgeCount = 1_000_000_000;

    if (!email || !isEmail(email)) return bad("A valid email is required");
    if (!firstName) return bad("First name is required");
    if (!lastName) return bad("Last name is required");

    if (body.type === "organization") {
      if (!orgNameRaw) return bad("Organization name is required");
      if (!orgWebsite) return bad("Website is required");
      if (!/^https?:\/\//i.test(orgWebsite)) return bad("Website must start with http(s)://");
    } else if (orgWebsite && !/^https?:\/\//i.test(orgWebsite)) {
      return bad("Website must start with http(s)://");
    }

    if (body.type === "individual" && pledgeCount > MAX_INDIVIDUAL_PLEDGE) {
      return bad(`An individual pledge can't exceed ${MAX_INDIVIDUAL_PLEDGE.toLocaleString("en-US")} acts.`);
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    // This endpoint is public (verify_jwt=false — guests pledge without an
    // account). Checked before the AI moderation call below, same reasoning
    // as submit-act: a blocked request shouldn't also burn an AI call.
    // submit-commitment always inserts a new row per submission rather than
    // updating one by email (confirmed by reading this function — there's
    // no upsert/lookup-by-email anywhere here), so there's nothing to dedupe
    // against; the per-email limit exists purely to cap repeat submissions.
    const clientIp = getClientIp(req);
    const ipMax = envInt("SUBMIT_COMMITMENT_IP_MAX", 100) * rateLimitMultiplier();
    const ipWindow = envInt("SUBMIT_COMMITMENT_IP_WINDOW_SECONDS", 600);
    const ipCheck = await checkRateLimit(supabase, "submit-commitment:ip", rateLimitIpKey(clientIp), ipMax, ipWindow);
    if (ipCheck.error) {
      console.error("rate limit check failed (ip)", ipCheck.error);
      // Fail open — a DB hiccup here must never block a real pledge.
    } else if (!ipCheck.allowed) {
      return rateLimitedResponse(ipWindow, corsHeaders);
    }

    const emailDailyMax = envInt("SUBMIT_COMMITMENT_EMAIL_DAILY_MAX", 5);
    const emailDailyWindow = envInt("SUBMIT_COMMITMENT_EMAIL_DAILY_WINDOW_SECONDS", 86400);
    const emailDailyCheck = await checkRateLimit(
      supabase, "submit-commitment:email-daily", email.toLowerCase(), emailDailyMax, emailDailyWindow,
    );
    if (emailDailyCheck.error) {
      console.error("rate limit check failed (email daily)", emailDailyCheck.error);
    } else if (!emailDailyCheck.allowed) {
      return rateLimitedResponse(emailDailyWindow, corsHeaders);
    }

    // No caller actually sends a free-text `message` here any more (checked
    // all 8 call sites: it's either omitted entirely, or what looked like a
    // message is really a separate CRM-sync payload, not this function's
    // body) — `message` is only ever a synthetic string built from an
    // already-validated enum (help_role) or omitted. An AI moderation call
    // on that was pure dead weight and never actually ran in production;
    // removed rather than left as unreachable code. `language` now comes
    // from the caller's active UI language (same reasoning as submit-act),
    // not a hardcoded "en".
    const requestedLang = (body.lang ?? "").toString().trim().toLowerCase();
    const language = VALID_LANGS.includes(requestedLang) ? requestedLang : "en";

    let userId: string | null = null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      try {
        const { data: u } = await supabase.auth.getUser(authHeader.slice(7));
        userId = u?.user?.id ?? null;
      } catch (_) { /* ignore */ }
    }

    const reviewThreshold = PLEDGE_REVIEW_THRESHOLD[body.type as typeof TYPES[number]];
    const needsPledgeReview = pledgeCount > reviewThreshold;
    const status = needsPledgeReview ? "pending" : "published";
    const moderationReason = needsPledgeReview
      ? `Pledge count ${pledgeCount.toLocaleString("en-US")} exceeds the ${reviewThreshold.toLocaleString("en-US")} auto-publish threshold for ${body.type} commitments — held for review.`
      : null;

    const helpRole = body.help_role && HELP_ROLES.includes(body.help_role as any) ? body.help_role : null;
    const country = (body.country ?? "").toString().trim().slice(0, 80) || null;
    if (!country) return bad("Country is required");
    const orgType = body.org_type && ORG_TYPES.includes(body.org_type as any) ? body.org_type : null;

    const { data, error } = await supabase
      .from("commitments")
      .insert({
        type: body.type,
        first_name: firstName || null,
        last_name: lastName || null,
        email: email || null,
        phone: phone || null,
        org_name: orgName || null,
        org_website: orgWebsite || null,
        pledge_count: pledgeCount,
        message: message || null,
        language,
        status,
        moderation_reason: moderationReason,
        user_id: userId,
        help_role: body.type === "individual" ? helpRole : null,
        country,
        org_type: body.type === "organization" ? orgType : null,
      })
      .select("id")
      .single();

    if (error) {
      console.error("DB error", error);
      return bad("Could not save commitment", 500);
    }

    if (needsPledgeReview) {
      try {
        const who = orgNameRaw || `${firstName} ${lastName}`.trim() || email;
        await notifyOps(supabase, {
          label: "oversized_pledge_review",
          subject: `Pledge of ${pledgeCount.toLocaleString("en-US")} held for review — ${SITE_NAME}`,
          text:
            `${who} (${email}) pledged ${pledgeCount.toLocaleString("en-US")} acts as a${body.type === "organization" ? "n organization" : "n individual"}, ` +
            `which is over the ${reviewThreshold.toLocaleString("en-US")} auto-publish threshold.\n\n` +
            `It's saved but NOT counted in the public "Acts pledged" total yet (commitments.id = ${data.id}).\n\n` +
            `To approve: in the Supabase Table Editor, open commitments, find this row by its id, and change status from pending to published.\n` +
            `To reject: delete the row (or set status to rejected).`,
          html:
            `<p><strong>${escapeHtml(who)}</strong> (${escapeHtml(email)}) pledged <strong>${pledgeCount.toLocaleString("en-US")}</strong> acts ` +
            `as a${body.type === "organization" ? "n organization" : "n individual"}, over the ${reviewThreshold.toLocaleString("en-US")} auto-publish threshold.</p>` +
            `<p>It's saved but <strong>not counted</strong> in the public "Acts pledged" total yet.</p>` +
            `<p style="font-size:12px;color:#a89c8e">commitments.id = ${data.id}</p>` +
            `<p>To approve: in the Supabase Table Editor, open <code>commitments</code>, find this row by its id, and change <code>status</code> from <code>pending</code> to <code>published</code>.<br>` +
            `To reject: delete the row (or set <code>status</code> to <code>rejected</code>).</p>`,
        });
      } catch (e) {
        console.error("oversized pledge review alert failed", e);
      }
    }

    // Sync role/org fields onto the user's profile (CRM-ready). Never overwrite with null.
    if (userId) {
      try {
        const profileUpdate: Record<string, string> = {};
        if (body.type === "individual" && helpRole) profileUpdate.help_role = helpRole;
        if (country) profileUpdate.country = country;
        if (firstName) profileUpdate.first_name = firstName;
        if (lastName) profileUpdate.last_name = lastName;
        if (body.type === "organization" && orgNameRaw) profileUpdate.org_name = orgNameRaw;
        if (body.type === "organization" && orgType) profileUpdate.org_type = orgType;
        if (Object.keys(profileUpdate).length > 0) {
          await supabase.from("profiles").update(profileUpdate).eq("user_id", userId);
        }
      } catch (e) {
        console.error("profile sync error", e);
      }
    }

    // For organization commitments, ensure org row + leader membership when signed in
    if (body.type === "organization" && orgNameRaw) {
      try {
        const { data: existing } = await supabase
          .from("organizations")
          .select("id")
          .ilike("name", orgNameRaw)
          .is("chapter", chapter ? undefined as any : null)
          .maybeSingle();
        let orgId = existing?.id as string | undefined;
        if (!orgId) {
          const { data: created } = await supabase
            .from("organizations")
            .insert({
              name: orgNameRaw,
              chapter: chapter || null,
              website: orgWebsite || null,
            })
            .select("id")
            .single();
          orgId = created?.id;
        }
        if (orgId && userId) {
          await supabase
            .from("org_members")
            .insert({ org_id: orgId, user_id: userId, is_leader: true });
        }
      } catch (e) {
        console.error("org provisioning error", e);
      }
    }

    // Refresh this contact's GHL totals (acts + pledges) fire-and-forget —
    // same non-blocking dispatch pattern used in submit-act.
    try {
      const task = fetch(`${SUPABASE_URL}/functions/v1/ghl-sync-totals`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${SERVICE_ROLE}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ mode: "user", email }),
      })
        // fetch() only rejects on a network-level failure - a non-2xx
        // response (missing GHL secrets, a rejected custom field, an auth
        // mismatch) resolved normally and was previously invisible here,
        // since nothing checked response.ok. Log the body on failure so a
        // real cause shows up in this function's logs going forward.
        .then(async (res) => {
          if (!res.ok) console.error("ghl-sync-totals dispatch failed", res.status, await res.text());
        })
        .catch((e) => console.error("ghl-sync-totals dispatch error", e));
      // @ts-ignore EdgeRuntime is available in Supabase Edge Functions
      if (typeof EdgeRuntime !== "undefined") EdgeRuntime.waitUntil(task);
    } catch (e) {
      console.error("ghl-sync-totals dispatch error", e);
    }

    // Return updated totals
    const { data: totals } = await supabase
      .from("pledge_totals")
      .select("total_pledged_acts, total_commitments")
      .single();

    return new Response(
      JSON.stringify({
        id: data.id,
        total_pledged_acts: Number(totals?.total_pledged_acts ?? 0),
        total_commitments: Number(totals?.total_commitments ?? 0),
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("submit-commitment error", e);
    return bad("Unexpected error", 500);
  }
});
