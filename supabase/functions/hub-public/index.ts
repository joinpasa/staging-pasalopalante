import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { checkRateLimit, getClientIp, rateLimitedResponse, rateLimitIpKey, rateLimitMultiplier } from "../_shared/rateLimit.ts";

// The Kindness Hub's two pages for people without an account:
//   /kit      what partners and ambassadors are asked to share this week, and a form to send
//             a story, a date or an idea back
//   /suggest  the team's open suggestion box
//
// Nobody outside the team can read or write the hub's tables directly, so these pages come
// through here: a narrow, rate-limited window that only ever hands out what the team has marked
// for the kit, and only ever takes in a suggestion.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const BUCKET = "hub-media";

const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const clean = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "");

/** The Monday of this week, in Puerto Rico (UTC-4, no daylight saving), as YYYY-MM-DD. */
function weekStart(now = new Date()) {
  const pr = new Date(now.getTime() - 4 * 3_600_000);
  const day = (pr.getUTCDay() + 6) % 7;
  return new Date(Date.UTC(pr.getUTCFullYear(), pr.getUTCMonth(), pr.getUTCDate() - day)).toISOString().slice(0, 10);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Use POST." }, 405);
  try {
    const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
    const body = await req.json().catch(() => ({}));
    const action = String(body.action ?? "");
    const ip = rateLimitIpKey(getClientIp(req));
    const limit = async (bucket: string, max: number, seconds: number) => {
      const out = await checkRateLimit(db, bucket, ip, max * rateLimitMultiplier(), seconds);
      // if the counter itself is broken, let people through rather than lock partners out
      return out.error || out.allowed ? null : rateLimitedResponse(out.windowSeconds, corsHeaders);
    };

    if (action === "kit") {
      const stop = await limit("hub_kit_view", 120, 600);
      if (stop) return stop;
      const { data: kit } = await db.from("hub_kit").select("week_start, ask_en, ask_es, shares").lte("week_start", weekStart()).order("week_start", { ascending: false }).limit(1).maybeSingle();
      // only what the team ticked "offer in the kit", and only once it is approved or out
      const { data: cards } = await db.from("hub_items").select("id, title, format, caption_en, caption_es, publish_at, assets, stage").eq("in_kit", true).in("stage", ["approved", "scheduled", "posted"]).order("publish_at", { ascending: true }).limit(12);
      const items = [];
      for (const c of cards ?? []) {
        const assets = [];
        for (const a of Array.isArray(c.assets) ? c.assets : []) {
          // a child's picture never leaves the hub through this page, whatever was ticked
          if (a.minors) continue;
          let url = a.url ?? "";
          if (a.path) url = (await db.storage.from(BUCKET).createSignedUrl(a.path, 3600)).data?.signedUrl ?? "";
          if (url) assets.push({ id: a.id, kind: a.kind, url, mime: a.mime, name: a.name });
        }
        items.push({ id: c.id, title: c.title, format: c.format, captionEn: c.caption_en, captionEs: c.caption_es, publishAt: c.publish_at, stage: c.stage, assets });
      }
      return json({ kit: kit ? { weekStart: kit.week_start, askEn: kit.ask_en, askEs: kit.ask_es, shares: kit.shares } : { weekStart: weekStart(), askEn: "", askEs: "", shares: 0 }, items });
    }

    if (action === "shared") {
      const stop = await limit("hub_kit_shared", 6, 3600);
      if (stop) return stop;
      const { data: kit } = await db.from("hub_kit").select("week_start, shares").lte("week_start", weekStart()).order("week_start", { ascending: false }).limit(1).maybeSingle();
      if (!kit) return json({ shares: 0 });
      const { data } = await db.from("hub_kit").update({ shares: kit.shares + 1 }).eq("week_start", kit.week_start).select("shares").single();
      return json({ shares: data?.shares ?? kit.shares + 1 });
    }

    if (action === "suggest") {
      const stop = await limit("hub_suggest", 8, 3600);
      if (stop) return stop;
      // a field people cannot see: only a script fills it in
      if (clean(body.website, 200)) return json({ ok: true });
      const text = typeof body.text === "string" ? body.text.trim().slice(0, 4000) : "";
      if (text.length < 3) return json({ error: "Write a few words first." }, 400);
      const link = clean(body.link, 600);
      const group = body.group === "partner" || body.group === "ambassador" ? body.group : null;
      const kind = body.kind === "story" || body.kind === "date" || body.kind === "idea" ? body.kind : null;
      const fallback = group === "ambassador" ? "An ambassador" : group === "partner" ? "A partner" : "Someone on the team";
      const { error } = await db.from("hub_suggestions").insert({
        from_name: clean(body.from, 120) || fallback,
        body: text,
        link: /^https?:\/\//i.test(link) ? link : null,
        grp: group,
        kind,
        consent: typeof body.consent === "boolean" ? body.consent : null,
      });
      if (error) throw error;
      return json({ ok: true });
    }

    return json({ error: "Unknown action." }, 400);
  } catch (e) {
    console.error("hub-public failed", e);
    return json({ error: "Something went wrong. Please try again in a minute." }, 500);
  }
});
