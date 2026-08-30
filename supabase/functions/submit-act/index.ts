import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const MODES = ["performed", "witnessed", "received"] as const;
const TYPE_TAGS = [
  "hug","listening","encouragement","gift","professional_services",
  "beautification","food","transport","donation","other",
];
const CATEGORIES = ["words", "time_services", "financial"];
const REASON_CODES = [
  "hate","harassment","threat","sexual","profanity",
  "pii","self_harm","spam","off_topic","other",
];

// Reject on uncertainty. Flip to false to hold borderline content for review instead.
const STRICT_MODE = true;
// Below this confidence with any flagged reason → treat as rejected (in STRICT_MODE).
const CONFIDENCE_THRESHOLD = 0.6;
const MODERATION_MODEL = Deno.env.get("GEMINI_MODEL") || "gemini-2.5-flash";

interface SubmitBody {
  mode: string;
  description?: string;
  first_name?: string;
  email?: string;
  video_url?: string;
  photo_paths?: string[];
  to_user_id?: string;
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

    if (videoUrl && !/^https?:\/\//i.test(videoUrl)) return badRequest("Invalid video URL");

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Moderation defaults (when there's no description to scan).
    let modStatus: "approved" | "rejected" | "flagged_for_review" = "approved";
    let reasonCodes: string[] = [];
    let shortReason: string | null = null;
    let confidence = 1;
    let typeTag = "other";
    let category = "time_services";
    let language = "en";

    if (description && GEMINI_API_KEY) {
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
                "You moderate and classify short stories about acts of kindness for a public wall. " +
                "Reject content that contains hate speech, harassment, threats, sexual content, profanity, " +
                "personal contact info (phone/email/address), self-harm encouragement, spam, or that is unrelated to kindness. " +
                "Be strict but fair: positive personal stories about kindness should be approved. " +
                "Use 'flagged_for_review' only when truly uncertain. Always call moderate_act.",
            },
            { role: "user", content: `Mode: ${body.mode}\nStory: ${description}` },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "moderate_act",
                description: "Moderate and classify an act of kindness.",
                parameters: {
                  type: "object",
                  properties: {
                    status: { type: "string", enum: ["approved", "rejected", "flagged_for_review"] },
                    confidence: { type: "number", description: "0–1 confidence in the status" },
                    reason_codes: {
                      type: "array",
                      items: { type: "string", enum: REASON_CODES },
                    },
                    short_reason: { type: "string", description: "Brief human-readable reason" },
                    type_tag: { type: "string", enum: TYPE_TAGS },
                    category: { type: "string", enum: CATEGORIES },
                    language: { type: "string", description: "ISO 639-1 code" },
                  },
                  required: ["status", "confidence", "reason_codes", "type_tag", "category", "language"],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: { type: "function", function: { name: "moderate_act" } },
        }),
      });

      if (aiRes.status === 429) {
        return new Response(JSON.stringify({ error: "Too many requests, please try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiRes.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please contact support." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiRes.ok) {
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
            typeTag = TYPE_TAGS.includes(parsed.type_tag) ? parsed.type_tag : "other";
            category = CATEGORIES.includes(parsed.category) ? parsed.category : "time_services";
            language = (parsed.language || "en").toString().slice(0, 8);
          } catch (_) { /* fall through */ }
        }
      } else {
        console.error("AI gateway error", aiRes.status, await aiRes.text());
      }
    }

    // Reject-on-uncertainty rule.
    if (STRICT_MODE) {
      if (modStatus === "flagged_for_review") modStatus = "rejected";
      if (modStatus === "approved" && reasonCodes.length > 0 && confidence < CONFIDENCE_THRESHOLD) {
        modStatus = "rejected";
      }
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Optionally attach user_id when an Authorization header was sent.
    let userId: string | null = null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      try {
        const { data: u } = await supabase.auth.getUser(authHeader.slice(7));
        userId = u?.user?.id ?? null;
        if (!email && u?.user?.email) email = u.user.email.toLowerCase();
      } catch (_) { /* ignore */ }
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

    // Audit metadata.
    const fwd = req.headers.get("x-forwarded-for") || "";
    const ipAddress =
      req.headers.get("cf-connecting-ip") ||
      (fwd ? fwd.split(",")[0].trim() : null) ||
      req.headers.get("x-real-ip") ||
      null;
    const userAgent = req.headers.get("user-agent") || null;

    const shouldStore = modStatus !== "rejected";
    const shouldPublish = modStatus === "approved";
    const shouldAlertAdmin = modStatus !== "approved";

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
    const rowStatus = shouldPublish ? "published" : "pending_review";

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

    // Sub-type tag classification: fire-and-forget, never blocks the response.
    try {
      const task = fetch(`${SUPABASE_URL}/functions/v1/classify-act`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${SERVICE_ROLE}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ act_id: data.id }),
      }).catch((e) => console.error("classify-act dispatch failed", e));
      // @ts-ignore EdgeRuntime is available in Supabase Edge Functions
      if (typeof EdgeRuntime !== "undefined") EdgeRuntime.waitUntil(task);
    } catch (e) {
      console.error("classify-act dispatch error", e);
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
