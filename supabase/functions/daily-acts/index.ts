// Daily Acts of Kindness — AI-generated, cached per (date, lang) in daily_suggestions.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function todayInTZ(tz = "America/Puerto_Rico"): string {
  const now = new Date();
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(now); // YYYY-MM-DD
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const lang = (body?.lang === "es" ? "es" : "en") as "en" | "es";
    // Only allow cache bypass for callers presenting the service-role key.
    // Prevents unauthenticated abuse that would exhaust AI credits.
    const authHeader = req.headers.get("Authorization") || "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const isServiceRole =
      !!serviceRoleKey && authHeader === `Bearer ${serviceRoleKey}`;
    const force = !!body?.force && isServiceRole;
    const date = todayInTZ();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    if (!force) {
      const { data: cached } = await supabase
        .from("daily_suggestions")
        .select("acts")
        .eq("date", date)
        .eq("lang", lang)
        .maybeSingle();
      if (cached?.acts) {
        return new Response(JSON.stringify({ date, lang, acts: cached.acts, cached: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const sys =
      lang === "es"
        ? "Eres una guía cálida que sugiere pequeños actos de bondad para hoy. Tono amable, concreto, accesible. Cada acto debe poderse hacer hoy en menos de 15 minutos."
        : "You are a warm guide suggesting small, doable acts of kindness for today. Tone: warm, concrete, low-barrier. Each act should be doable today in under 15 minutes.";

    const user =
      lang === "es"
        ? "Genera 5 actos sencillos para hoy. Variedad: para un ser querido, un desconocido, una comunidad, en línea y uno bite-sized de 10 minutos. Evita repetir ideas comunes."
        : "Generate 5 simple acts for today. Mix: for a loved one, a stranger, a community, online, and one bite-sized 10-minute task. Avoid clichés.";

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: sys },
          { role: "user", content: user },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "suggest_acts",
              description: "Return exactly 5 daily acts of kindness.",
              parameters: {
                type: "object",
                properties: {
                  acts: {
                    type: "array",
                    minItems: 5,
                    maxItems: 5,
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string", description: "Short imperative title, ~6 words." },
                        why: { type: "string", description: "One sentence on why it matters." },
                        time_minutes: { type: "integer", minimum: 1, maximum: 30 },
                      },
                      required: ["title", "why", "time_minutes"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["acts"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "suggest_acts" } },
      }),
    });

    if (!aiResp.ok) {
      if (aiResp.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit. Try again shortly." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResp.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await aiResp.text();
      console.error("AI gateway error", aiResp.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiJson = await aiResp.json();
    const call = aiJson?.choices?.[0]?.message?.tool_calls?.[0];
    const args = call?.function?.arguments;
    const parsed = typeof args === "string" ? JSON.parse(args) : args;
    const acts = parsed?.acts;
    if (!Array.isArray(acts) || acts.length !== 5) throw new Error("Invalid AI response");

    await supabase
      .from("daily_suggestions")
      .upsert({ date, lang, acts }, { onConflict: "date,lang" });

    return new Response(JSON.stringify({ date, lang, acts, cached: false }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("daily-acts error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
