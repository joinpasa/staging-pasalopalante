import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { checkRateLimit, envInt, getClientIp, rateLimitedResponse, rateLimitIpKey, rateLimitMultiplier } from "../_shared/rateLimit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const MODES = ["performed", "witnessed", "received"] as const;
const REASON_CODES = [
  "hate","harassment","threat","sexual","profanity",
  "pii","self_harm","spam","off_topic","other",
];

// type_tag/category used to be guessed by the AI from the story text on every
// call — but the "what did you do" chip on the Log an Act screen already
// tells us this (AppLogAct.tsx's CHIP_LABELS, sent as act_type), so asking
// the model to re-derive it was pure redundant spend. This table is the
// static mapping instead; AI only has to do the part only it can do
// (moderation), which also shrinks every single call's prompt and output.
// Values are a judgment call, not a precise science — low-stakes, since
// neither field drives anything user-facing today (type_tag is stored and
// returned but not rendered as a label anywhere; category isn't read by the
// frontend at all). Revisit if that changes.
const ACT_TYPE_MAP: Record<string, { type_tag: string; category: string }> = {
  "Helped a neighbor": { type_tag: "other", category: "time_services" },
  "Gave a compliment": { type_tag: "encouragement", category: "words" },
  "Volunteered": { type_tag: "other", category: "time_services" },
  "Donated": { type_tag: "donation", category: "financial" },
  "Paid for someone": { type_tag: "gift", category: "financial" },
  "Listened & supported": { type_tag: "listening", category: "words" },
  "Something else": { type_tag: "other", category: "time_services" },
};
const DEFAULT_CLASSIFICATION = { type_tag: "other", category: "time_services" };

// Sub-type tags — these ARE rendered to users (the emoji + chip row on the
// Wall and the app's feed), unlike type_tag/category above, so unlike those
// this isn't a static mapping off act_type; it still needs the AI reading
// the actual story. What changed: this used to be a *second*, separate
// Gemini call (classify-act), dispatched fire-and-forget right after this
// one — meaning every act with a description paid two full round trips,
// two system prompts, and had its story text sent twice. Folded into this
// same call instead: one round trip, the story sent once, same tagging
// quality (classify-act's own wording is reused below almost verbatim).
// classify-act itself is left in place for its /backfill admin path
// (reclassifying old acts) — just no longer auto-dispatched per submission.
const TAGS = ["time", "money", "hands_on", "group", "words", "hug"] as const;
const TAG_CONFIDENCE_THRESHOLD = Number(Deno.env.get("TAG_CONFIDENCE_THRESHOLD") ?? "0.7");

// Matches packages/shared/src/i18n/translations.ts's Language union. The
// moderation call below also reports which of these the story is actually
// written in (no extra AI call) — people often write in a different
// language than their UI is set to, and a wrong value here means readers
// in the UI's language are never offered a translation. The submitter's UI
// language is only the fallback: no text, AI unavailable, or a language
// outside this list.
const VALID_LANGS = ["en", "zh", "hi", "es", "fr", "ar", "bn", "pt", "ru", "de", "sl"];

// Reject on uncertainty. Flip to false to hold borderline content for review instead.
const STRICT_MODE = true;
// Below this confidence with any flagged reason → treat as rejected (in STRICT_MODE).
const CONFIDENCE_THRESHOLD = 0.6;
const MODERATION_MODEL = Deno.env.get("GEMINI_MODEL") || "gemini-3.6-flash";

interface SubmitBody {
  mode: string;
  description?: string;
  first_name?: string;
  email?: string;
  video_url?: string;
  photo_paths?: string[];
  to_user_id?: string;
  act_type?: string;
  share_on_wall?: boolean;
  lang?: string;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function badRequest(msg: string) {
  return new Response(JSON.stringify({ error: msg }), {
    status: 400,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = (await req.json()) as SubmitBody;

    if (!body || typeof body !== "object") return badRequest("Invalid body");
    if (!MODES.includes(body.mode as typeof MODES[number])) return badRequest("Invalid mode");

    const description = (body.description ?? "").toString().trim().slice(0, 1000);
    const firstName = (body.first_name ?? "").toString().trim().slice(0, 60);
    let email = (body.email ?? "").toString().trim().slice(0, 200).toLowerCase();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) email = "";
    const videoUrl = (body.video_url ?? "").toString().trim().slice(0, 500);
    const photoPaths = Array.isArray(body.photo_paths)
      ? body.photo_paths.filter((p) => typeof p === "string").slice(0, 3)
      : [];
    const actType = (body.act_type ?? "").toString().trim().slice(0, 60) || null;
    const requestedLang = (body.lang ?? "").toString().trim().toLowerCase();
    let language = VALID_LANGS.includes(requestedLang) ? requestedLang : "en";
    const { type_tag: typeTag, category } = (actType && ACT_TYPE_MAP[actType]) || DEFAULT_CLASSIFICATION;
    // Defaults to true (matches the Log an Act screen's own toggle default)
    // when the caller doesn't send it at all — only an explicit `false`
    // opts an act out of the public Wall.
    const shareOnWall = body.share_on_wall !== false;

    if (videoUrl && !/^https?:\/\//i.test(videoUrl)) return badRequest("Invalid video URL");

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Audit metadata — computed early (not just for the DB row later) so the
    // rate-limit checks right below can use it too.
    const clientIp = getClientIp(req);
    const ipAddress = clientIp === "unknown" ? null : clientIp;
    const userAgent = req.headers.get("user-agent") || null;

    // This endpoint is public (verify_jwt=false — guests submit without an
    // account), so without a limit here a script could loop it to fabricate
    // "acts pledged" counts and flood the public Wall, burning a Gemini
    // moderation call on every single try. Checked before moderation runs,
    // not after, so a blocked caller never costs an AI call either. Defaults
    // are generous enough for anyone actually logging several acts in one
    // sitting; nowhere near what an abuse loop would need — and every
    // number here is env-configurable so an event window can widen them
    // without a deploy. RATE_LIMIT_MULTIPLIER only scales the per-IP limit,
    // not the per-email ones below (those cap what one person can do, not
    // legitimate shared-IP traffic at an event).
    const ipMax = envInt("SUBMIT_ACT_IP_MAX", 60) * rateLimitMultiplier();
    const ipWindow = envInt("SUBMIT_ACT_IP_WINDOW_SECONDS", 600);
    const ipCheck = await checkRateLimit(supabase, "submit-act:ip", rateLimitIpKey(clientIp), ipMax, ipWindow);
    if (ipCheck.error) {
      console.error("rate limit check failed (ip)", ipCheck.error);
      // Fail open on our own error (not the caller's fault), same as every
      // other best-effort check in this codebase — a DB hiccup here must
      // never block someone from logging a real act.
    } else if (!ipCheck.allowed) {
      return rateLimitedResponse(ipWindow, corsHeaders);
    }

    // Optionally attach user_id when an Authorization header was sent — moved
    // ahead of moderation (it used to run after) so a signed-in caller who
    // omits email from the body but has one on their account still gets
    // the per-email checks below applied to that resolved address, not
    // skipped over as if they were anonymous.
    let userId: string | null = null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      try {
        const { data: u } = await supabase.auth.getUser(authHeader.slice(7));
        userId = u?.user?.id ?? null;
        if (!email && u?.user?.email) email = u.user.email.toLowerCase();
      } catch (_) { /* ignore */ }
    }

    // Per-email limits only apply when an email was actually given — an
    // anonymous submission has nothing to key on besides the IP check above.
    if (email) {
      const emailMax = envInt("SUBMIT_ACT_EMAIL_MAX", 10);
      const emailWindow = envInt("SUBMIT_ACT_EMAIL_WINDOW_SECONDS", 600);
      const emailCheck = await checkRateLimit(supabase, "submit-act:email", email, emailMax, emailWindow);
      if (emailCheck.error) {
        console.error("rate limit check failed (email)", emailCheck.error);
      } else if (!emailCheck.allowed) {
        return rateLimitedResponse(emailWindow, corsHeaders);
      }

      const emailDailyMax = envInt("SUBMIT_ACT_EMAIL_DAILY_MAX", 50);
      const emailDailyWindow = envInt("SUBMIT_ACT_EMAIL_DAILY_WINDOW_SECONDS", 86400);
      const emailDailyCheck = await checkRateLimit(supabase, "submit-act:email-daily", email, emailDailyMax, emailDailyWindow);
      if (emailDailyCheck.error) {
        console.error("rate limit check failed (email daily)", emailDailyCheck.error);
      } else if (!emailDailyCheck.allowed) {
        return rateLimitedResponse(emailDailyWindow, corsHeaders);
      }
    }

    // Moderation defaults (when there's no description to scan).
    let modStatus: "approved" | "rejected" | "flagged_for_review" = "approved";
    let reasonCodes: string[] = [];
    let shortReason: string | null = null;
    let confidence = 1;

    // Tagging defaults. A photo-only/no-description act has nothing to tag —
    // matches classify-act's own prior behavior of marking those "classified"
    // with no tags rather than leaving them perpetually unclassified.
    let tags: string[] | null = null;
    let tagConfidence: Record<string, number> | null = null;
    let classifiedAt: string | null = description ? null : new Date().toISOString();

    // Whether the moderation call itself could run at all (rate-limited,
    // out of credits, network failure, ...) — distinct from the model
    // actually reviewing the content and being uncertain about it. An AI
    // outage must never mean "everyone's submission just fails"; it holds
    // the act for manual review instead, same as genuine model uncertainty
    // does outside STRICT_MODE.
    let aiUnavailable = false;

    if (description && GEMINI_API_KEY) {
      try {
        const aiRes = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${GEMINI_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: MODERATION_MODEL,
            messages: [
              {
                role: "system",
                content:
                  "You review short real-world stories submitted to a public kindness wall, in one pass:\n\n" +
                  "1) MODERATE: reject hate speech, harassment, threats, sexual content, profanity, personal contact info " +
                  "(phone/email/address), self-harm encouragement, spam, or content unrelated to kindness. Be strict but fair — " +
                  "positive personal stories about kindness should be approved. Use 'flagged_for_review' only when truly uncertain.\n\n" +
                  "2) TAG (every act, regardless of status): assign a 0-1 confidence score for EVERY tag below, including ones that " +
                  "don't apply (score them low) — multi-label, one act often has several:\n" +
                  "- time: the person gave their time or attention (visiting, waiting with someone, tutoring, listening, showing up).\n" +
                  "- money: money or paid-for goods changed hands (paying for someone, buying a meal, donating, covering a bill).\n" +
                  "- hands_on: physical effort or labor (carrying, cleaning, cooking, driving, fixing, moving, building).\n" +
                  "- group: done with or by more than one person, a team, family, class, church, or organization.\n" +
                  "- words: the kindness was primarily spoken or written (encouragement, a compliment, a thank-you note, advice, saying the thing out loud).\n" +
                  "- hug: physical affection or comfort (a hug, a hand on the shoulder, holding someone's hand, sitting with someone who is hurting).\n" +
                  "The story may be in English, Spanish, French, German, or any other language — tag directly in that language, do NOT translate it first. " +
                  "Be conservative: vague or very short text should score low across the board.\n\n" +
                  "3) LANGUAGE: report the language the story is written in (the dominant one if mixed), or 'other' if it isn't one of the listed ones.\n\n" +
                  "Always call review_act.",
              },
              { role: "user", content: `Mode: ${body.mode}\nStory: ${description}` },
            ],
            tools: [
              {
                type: "function",
                function: {
                  name: "review_act",
                  description: "Moderate and tag an act of kindness story in one pass.",
                  parameters: {
                    type: "object",
                    properties: {
                      status: { type: "string", enum: ["approved", "rejected", "flagged_for_review"] },
                      confidence: { type: "number", description: "0–1 confidence in the status" },
                      reason_codes: {
                        type: "array",
                        items: { type: "string", enum: REASON_CODES },
                      },
                      short_reason: { type: "string", description: "Brief human-readable reason, under 80 characters" },
                      time: { type: "number", description: "0-1 confidence that the act is 'time'" },
                      money: { type: "number", description: "0-1 confidence that the act is 'money'" },
                      hands_on: { type: "number", description: "0-1 confidence that the act is 'hands_on'" },
                      group: { type: "number", description: "0-1 confidence that the act is 'group'" },
                      words: { type: "number", description: "0-1 confidence that the act is 'words'" },
                      hug: { type: "number", description: "0-1 confidence that the act is 'hug'" },
                      language: {
                        type: "string",
                        enum: [...VALID_LANGS, "other"],
                        description: "ISO 639-1 code of the language the story is written in",
                      },
                    },
                    required: ["status", "confidence", "reason_codes", ...TAGS, "language"],
                    additionalProperties: false,
                  },
                },
              },
            ],
            tool_choice: { type: "function", function: { name: "review_act" } },
          }),
        });

        if (aiRes.status === 429 || aiRes.status === 402 || !aiRes.ok) {
          console.error("AI gateway unavailable", aiRes.status, await aiRes.text().catch(() => ""));
          aiUnavailable = true;
        } else {
          const data = await aiRes.json();
          const args = data.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
          if (args) {
            try {
              const parsed = JSON.parse(args);
              const s = parsed.status;
              modStatus = (s === "rejected" || s === "flagged_for_review") ? s : "approved";
              confidence = typeof parsed.confidence === "number"
                ? Math.max(0, Math.min(1, parsed.confidence))
                : 0.5;
              reasonCodes = Array.isArray(parsed.reason_codes)
                ? parsed.reason_codes.filter((r: unknown) => typeof r === "string" && REASON_CODES.includes(r as string)).slice(0, 8)
                : [];
              shortReason = typeof parsed.short_reason === "string" ? parsed.short_reason.slice(0, 300) : null;
              const scores: Record<string, number> = {};
              for (const tag of TAGS) {
                const v = parsed[tag];
                scores[tag] = typeof v === "number" && Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : 0;
              }
              tagConfidence = scores;
              classifiedAt = new Date().toISOString();
              if (VALID_LANGS.includes(parsed.language)) language = parsed.language;
            } catch (_) {
              // Response didn't parse as expected — treat the same as the
              // model being unreachable rather than silently auto-approving.
              aiUnavailable = true;
            }
          } else {
            aiUnavailable = true;
          }
        }
      } catch (e) {
        console.error("AI gateway request failed", e);
        aiUnavailable = true;
      }
    }

    if (aiUnavailable) {
      modStatus = "flagged_for_review";
      shortReason = "Automated moderation was unavailable — held for manual review.";
    }

    // Reject-on-uncertainty rule — doesn't apply when the AI never actually
    // reviewed the content (an outage, not model uncertainty); that case is
    // always held for manual review, never auto-rejected.
    if (STRICT_MODE && !aiUnavailable) {
      if (modStatus === "flagged_for_review") modStatus = "rejected";
      if (modStatus === "approved" && reasonCodes.length > 0 && confidence < CONFIDENCE_THRESHOLD) {
        modStatus = "rejected";
      }
    }

    // to_user_id only ever comes from the /wave hand-off flow: requires a
    // real signed-in caller, a syntactically valid id, and can't be self.
    let toUserId: string | null = null;
    const rawToUserId = (body.to_user_id ?? "").toString().trim();
    if (userId && rawToUserId && UUID_RE.test(rawToUserId) && rawToUserId !== userId) {
      toUserId = rawToUserId;
    }

    // Resolve display name.
    let finalFirstName = firstName;
    if (userId) {
      try {
        const { data: prof } = await supabase
          .from("profiles")
          .select("display_name")
          .eq("user_id", userId)
          .maybeSingle();
        const dn = (prof?.display_name ?? "").toString().trim();
        if (!finalFirstName && dn) {
          finalFirstName = dn.split(/\s+/)[0].slice(0, 60);
        } else if (finalFirstName && !dn) {
          await supabase
            .from("profiles")
            .update({ display_name: finalFirstName })
            .eq("user_id", userId);
        }
      } catch (_) { /* best effort */ }
    }

    const shouldStore = modStatus !== "rejected";
    const shouldPublish = modStatus === "approved";
    const shouldAlertAdmin = modStatus !== "approved";

    // Tags are only meaningful (and only ever shown) for published acts —
    // matches classify-act's prior behavior of never classifying anything
    // that wasn't already 'published'. Pending/rejected acts keep tags null
    // even though the model scored them in the same call; nothing reads
    // that data for a non-published row, so there's no reason to store it.
    if (shouldPublish && tagConfidence) {
      const picked = TAGS.filter((t) => tagConfidence![t] >= TAG_CONFIDENCE_THRESHOLD);
      tags = picked.length ? picked : null;
    } else if (!shouldPublish) {
      // Leave unclassified (null) rather than tag-less-but-marked-done — if
      // a pending/flagged act is later manually approved from the Supabase
      // Table Editor, classify-act's backfill (which looks for
      // classified_at IS NULL) needs to still pick it up and tag it then,
      // the same way it would have before this call existed.
      tags = null;
      tagConfidence = null;
      classifiedAt = null;
    }

    // Log rejected decisions immediately (no act row will be created).
    if (modStatus === "rejected") {
      try {
        await supabase.from("moderation_logs").insert({
          act_id: null,
          user_id: userId,
          email: email || null,
          mode: body.mode,
          status: modStatus,
          reason_codes: reasonCodes,
          short_reason: shortReason,
          confidence,
          original_text: description || null,
          model: MODERATION_MODEL,
          ip_address: ipAddress,
          user_agent: userAgent,
        });
      } catch (e) {
        console.error("moderation_logs insert failed", e);
      }
    }

    if (!shouldStore) {
      return new Response(
        JSON.stringify({
          status: modStatus,
          reason_codes: reasonCodes,
          short_reason: shortReason,
          confidence,
          should_store: false,
          should_publish: false,
          should_alert_admin: shouldAlertAdmin,
          id: null,
          type_tag: typeTag,
          category,
          language,
          unlocked_badges: [],
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let termsVersion: string | null = null;
    let privacyVersion: string | null = null;
    let cgVersion: string | null = null;
    try {
      const { data: versions } = await supabase
        .from("legal_document_versions")
        .select("doc_key, version");
      for (const row of (versions || []) as Array<{ doc_key: string; version: string }>) {
        if (row.doc_key === "terms") termsVersion = row.version;
        else if (row.doc_key === "privacy") privacyVersion = row.version;
        else if (row.doc_key === "community_guidelines") cgVersion = row.version;
      }
    } catch (_) { /* best-effort */ }

    let previouslyEarned = new Set<string>();
    if (userId) {
      const { data: existingBadges } = await supabase
        .from("user_badges")
        .select("badge_id")
        .eq("user_id", userId);
      previouslyEarned = new Set((existingBadges || []).map((b: { badge_id: string }) => b.badge_id));
    }

    // flagged_for_review (only reachable when STRICT_MODE is false) → stored but not public.
    // "pending" is the only non-published value the status check constraint
    // allows (acts_of_kindness_status_check) — this used to say
    // "pending_review", a value that was never actually valid; it just never
    // got exercised until the AI-unavailable fallback above made this branch
    // reachable for the first time.
    const rowStatus = shouldPublish ? "published" : "pending";

    const { data, error } = await supabase
      .from("acts_of_kindness")
      .insert({
        mode: body.mode,
        description: description || null,
        first_name: finalFirstName || null,
        email: email || null,
        video_url: videoUrl || null,
        photo_paths: photoPaths,
        type_tag: typeTag,
        category,
        language,
        act_type: actType,
        tags,
        tag_confidence: tagConfidence,
        classified_at: classifiedAt,
        share_on_wall: shareOnWall,
        status: rowStatus,
        moderation_reason: shortReason,
        user_id: userId,
        to_user_id: toUserId,
        ip_address: ipAddress,
        user_agent: userAgent,
        terms_version: termsVersion,
        privacy_version: privacyVersion,
        community_guidelines_version: cgVersion,
      })
      .select("id")
      .single();

    if (error) {
      console.error("DB error", error);
      return new Response(JSON.stringify({ error: "Could not save submission" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // For flagged content, log with act_id now that we have it.
    if (modStatus === "flagged_for_review") {
      try {
        await supabase.from("moderation_logs").insert({
          act_id: data.id,
          user_id: userId,
          email: email || null,
          mode: body.mode,
          status: modStatus,
          reason_codes: reasonCodes,
          short_reason: shortReason,
          confidence,
          original_text: description || null,
          model: MODERATION_MODEL,
          ip_address: ipAddress,
          user_agent: userAgent,
        });
      } catch (_) { /* best effort */ }
    }

    // Sub-type tags are already computed above (in the same Gemini call as
    // moderation) and included in the insert — no more separate dispatch to
    // classify-act here. That function is still around for its /backfill
    // admin path (reclassifying older acts that predate this change, or
    // ones a backfill needs to retry), just no longer auto-triggered per
    // submission.

    // Link-preview thumbnail for a non-YouTube social link (Facebook/
    // Instagram/TikTok/X) — YouTube already gets a thumbnail directly from
    // img.youtube.com with no fetch needed. Fire-and-forget: never blocks
    // the response, and a blocked/failed fetch just leaves no preview
    // image, which the Wall already renders fine as a plain link card.
    if (shouldPublish && videoUrl) {
      try {
        const host = new URL(videoUrl).hostname.toLowerCase().replace(/^www\./, "");
        const isYouTube = host === "youtube.com" || host.endsWith(".youtube.com") || host === "youtu.be";
        if (!isYouTube) {
          const task = fetch(`${SUPABASE_URL}/functions/v1/fetch-link-preview`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${SERVICE_ROLE}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ act_id: data.id, url: videoUrl }),
          })
            .then(async (res) => {
              if (!res.ok) console.error("fetch-link-preview dispatch failed", res.status, await res.text());
            })
            .catch((e) => console.error("fetch-link-preview dispatch failed", e));
          // @ts-ignore EdgeRuntime is available in Supabase Edge Functions
          if (typeof EdgeRuntime !== "undefined") EdgeRuntime.waitUntil(task);
        }
      } catch (e) {
        console.error("fetch-link-preview dispatch error", e);
      }
    }

    // Refresh this contact's GHL totals (acts + pledges) fire-and-forget —
    // same non-blocking dispatch pattern as the link-preview call above.
    if (shouldPublish && email) {
      try {
        const task = fetch(`${SUPABASE_URL}/functions/v1/ghl-sync-totals`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${SERVICE_ROLE}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ mode: "user", email }),
        })
          // fetch() only rejects on a network-level failure (DNS, connection
          // refused) - a non-2xx response (missing GHL secrets, a rejected
          // custom field, an auth mismatch) resolves normally and was
          // previously invisible here, since nothing checked response.ok.
          // That silence is exactly why totals could go unsynced for every
          // contact with no trace anywhere - log the body on failure so a
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
    }

    let unlockedBadges: string[] = [];
    if (userId && shouldPublish) {
      const { error: badgeError } = await supabase.rpc("award_badges_for_user", { _user_id: userId });
      if (badgeError) console.error("badge award error", badgeError);
      const { data: currentBadges } = await supabase
        .from("user_badges")
        .select("badge_id")
        .eq("user_id", userId);
      unlockedBadges = (currentBadges || [])
        .map((b: { badge_id: string }) => b.badge_id)
        .filter((badgeId: string) => !previouslyEarned.has(badgeId));
    }

    return new Response(
      JSON.stringify({
        status: modStatus,
        reason_codes: reasonCodes,
        short_reason: shortReason,
        confidence,
        should_store: true,
        should_publish: shouldPublish,
        should_alert_admin: shouldAlertAdmin,
        id: data.id,
        type_tag: typeTag,
        category,
        language,
        unlocked_badges: unlockedBadges,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("submit-act error", e);
    return new Response(JSON.stringify({ error: "Unexpected error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
