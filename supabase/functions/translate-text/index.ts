// Translates short user-submitted text via the Gemini API.
// Public (no JWT) because acts of kindness are publicly readable.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

const LANG_NAMES: Record<string, string> = {
  en: "English",
  zh: "Simplified Chinese (Mandarin)",
  hi: "Hindi",
  es: "Spanish",
  fr: "French",
  ar: "Arabic",
  bn: "Bengali",
  pt: "Portuguese",
  ru: "Russian",
  de: "German",
  sl: "Slovenian",
};

const MAX_LEN = 4000;

interface Body {
  text?: string;
  target_lang?: string;
  source_lang?: string | null;
}

Deno.serve(async (req) => {
  // Fix OPTIONS preflight response for CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  try {
    const body = (await req.json()) as Body;
    const text = (body.text ?? "").toString().trim();
    const target = (body.target_lang ?? "").toString().toLowerCase();

    if (!text) return json({ error: "Missing text" }, 400);
    if (text.length > MAX_LEN) return json({ error: "Text too long" }, 400);
    if (!LANG_NAMES[target]) return json({ error: "Unsupported target_lang" }, 400);

    const sourceName = body.source_lang && LANG_NAMES[body.source_lang]
      ? LANG_NAMES[body.source_lang]
      : "the source language";
    const targetName = LANG_NAMES[target];

    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) return json({ error: "Translation service not configured" }, 500);

    const res = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: Deno.env.get("GEMINI_MODEL_LITE") || "gemini-3.6-flash",
        messages: [
          {
            role: "system",
            content:
              `You are a translator. Translate the user's message from ${sourceName} into ${targetName}. ` +
              "Preserve meaning, tone, line breaks, emoji, and proper nouns. " +
              "Do not add quotes, prefaces, explanations, or any text other than the translation itself. " +
              "If the message is already in the target language, return it unchanged.",
          },
          { role: "user", content: text },
        ],
        temperature: 0.2,
      }),
    });

    if (res.status === 429) return json({ error: "Rate limited" }, 429);
    if (res.status === 402) return json({ error: "Translation credits exhausted" }, 402);
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      console.error("translate-text gateway error", res.status, t);
      return json({ error: "Translation failed" }, 502);
    }

    const data = await res.json();
    const translation: string =
      data?.choices?.[0]?.message?.content?.toString().trim() ?? "";

    if (!translation) return json({ error: "Empty translation" }, 502);

    return json({ translation }, 200, {
      "Cache-Control": "public, max-age=86400, s-maxage=604800",
    });
  } catch (e) {
    console.error("translate-text error", e);
    return json({ error: "Bad request" }, 400);
  }
});

function json(body: unknown, status = 200, extra: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", ...extra },
  });
}
