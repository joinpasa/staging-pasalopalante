import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Closed tag vocabulary.
const TAGS = ["time", "money", "hands_on", "group", "words", "hug"] as const;
type Tag = typeof TAGS[number];

// Config, not a magic number: only tags scoring at or above this are written.
const CONFIDENCE_THRESHOLD = Number(Deno.env.get("TAG_CONFIDENCE_THRESHOLD") ?? "0.7");
const CLASSIFIER_MODEL = Deno.env.get("GEMINI_MODEL") || "gemini-2.5-flash";
const CALL_TIMEOUT_MS = 15000;
const MAX_ATTEMPTS = 2; // initial call + one retry, per spec

const SYSTEM_PROMPT =
  "You tag short real-world stories about acts of kindness with a fixed, closed set of sub-type tags.\n" +
  "Tags:\n" +
  "- time: the person gave their time or attention (visiting, waiting with someone, tutoring, listening, showing up).\n" +
  "- money: money or paid-for goods changed hands (paying for someone, buying a meal, donating, covering a bill).\n" +
  "- hands_on: physical effort or labor (carrying, cleaning, cooking, driving, fixing, moving, building).\n" +
  "- group: done with or by more than one person, a team, family, class, church, or organization.\n" +
  "- words: the kindness was primarily spoken or written (encouragement, a compliment, a thank-you note, advice, saying the thing out loud).\n" +
  "- hug: physical affection or comfort (a hug, a hand on the shoulder, holding someone's hand, sitting with someone who is hurting).\n" +
  "Multi-label: assign every tag that clearly applies. One act often has several.\n" +
  "The description may be in English, Spanish, French, German, or any other language. " +
  "Classify directly in the language it is written in. Do NOT translate it first.\n" +
  "Return a confidence from 0 to 1 for EVERY tag in the vocabulary, including ones that do not apply (score them low). " +
  "Be conservative: vague or very short descriptions should score low across the board. " +
  "Always call classify_act.";

const TOOL = {
  type: "function",
  function: {
    name: "classify_act",
    description: "Assign sub-type tags with confidence scores to an act of kindness.",
    parameters: {
      type: "object",
      properties: Object.fromEntries(
        TAGS.map((tag) => [tag, { type: "number", description: `0-1 confidence that the act is '${tag}'` }]),
      ),
      required: [...TAGS],
      additionalProperties: false,
    },
  },
};

async function classify(description: string, apiKey: string): Promise<Record<Tag, number> | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CALL_TIMEOUT_MS);
  try {
    const res = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
      method: "POST",
      signal: controller.signal,
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: CLASSIFIER_MODEL,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: description },
        ],
        tools: [TOOL],
        tool_choice: { type: "function", function: { name: "classify_act" } },
      }),
    });

    if (!res.ok) {
      console.error("classify-act gateway error", res.status, await res.text());
      return null;
    }
    const data = await res.json();
    const args = data.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!args) return null;
    const parsed = JSON.parse(args);
    const scores = {} as Record<Tag, number>;
    for (const tag of TAGS) {
      const v = parsed[tag];
      scores[tag] = typeof v === "number" && Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : 0;
    }
    return scores;
  } catch (e) {
    console.error("classify-act call failed", e);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function classifyOne(
  supabase: ReturnType<typeof createClient>,
  act: { id: string; description: string | null },
  apiKey: string,
): Promise<boolean> {
  const description = (act.description ?? "").trim();
  // Photo-only / empty acts: mark as classified with no tags. Untagged is valid.
  if (!description) {
    await supabase
      .from("acts_of_kindness")
      .update({ tags: null, tag_confidence: null, classified_at: new Date().toISOString() })
      .eq("id", act.id);
    return true;
  }

  let scores: Record<Tag, number> | null = null;
  for (let attempt = 0; attempt < MAX_ATTEMPTS && !scores; attempt++) {
    scores = await classify(description, apiKey);
  }

  if (!scores) {
    // Fail open: leave tags null, do not mark classified so a later backfill can retry.
    console.error("classify-act: giving up on act", act.id);
    return false;
  }

  const tags = TAGS.filter((t) => scores![t] >= CONFIDENCE_THRESHOLD);
  const { error } = await supabase
    .from("acts_of_kindness")
    .update({
      tags: tags.length ? tags : null,
      tag_confidence: scores,
      classified_at: new Date().toISOString(),
    })
    .eq("id", act.id);
  if (error) {
    console.error("classify-act update failed", act.id, error);
    return false;
  }

  // Recount badges for the owner (progress is always counted, never incremented).
  const { data: owner } = await supabase
    .from("acts_of_kindness")
    .select("user_id, status")
    .eq("id", act.id)
    .maybeSingle();
  if (owner?.user_id && owner.status === "published") {
    await supabase.rpc("award_badges_for_user", { _user_id: owner.user_id });
  }
  return true;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");

  // Internal-only: caller must present the service role key, or the backfill secret.
  const auth = req.headers.get("Authorization") ?? "";
  const backfillSecret = Deno.env.get("CLASSIFY_BACKFILL_SECRET");
  const presentedSecret = req.headers.get("x-backfill-secret") ?? "";
  const authorized =
    auth === `Bearer ${SERVICE_ROLE}` ||
    (!!backfillSecret && presentedSecret === backfillSecret);
  if (!authorized) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (!GEMINI_API_KEY) {
    return new Response(JSON.stringify({ error: "Classifier unavailable" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

  try {
    const body = await req.json().catch(() => ({}));

    // Backfill mode: page through unclassified published acts.
    if (body?.backfill) {
      const limit = Math.min(Math.max(Number(body.limit) || 25, 1), 100);
      const { data: acts } = await supabase
        .from("acts_of_kindness")
        .select("id, description")
        .eq("status", "published")
        .is("classified_at", null)
        .order("created_at", { ascending: true })
        .limit(limit);

      let done = 0;
      for (const act of (acts || []) as Array<{ id: string; description: string | null }>) {
        const ok = await classifyOne(supabase, act, GEMINI_API_KEY);
        if (ok) done++;
        await new Promise((r) => setTimeout(r, 400)); // gentle pacing
      }
      return new Response(JSON.stringify({ processed: (acts || []).length, classified: done }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const actId = typeof body?.act_id === "string" ? body.act_id : null;
    if (!actId) {
      return new Response(JSON.stringify({ error: "act_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: act } = await supabase
      .from("acts_of_kindness")
      .select("id, description")
      .eq("id", actId)
      .maybeSingle();
    if (!act) {
      return new Response(JSON.stringify({ error: "Not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ok = await classifyOne(supabase, act as { id: string; description: string | null }, GEMINI_API_KEY);
    return new Response(JSON.stringify({ classified: ok }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    // Fail open, always.
    console.error("classify-act error", e);
    return new Response(JSON.stringify({ classified: false }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
