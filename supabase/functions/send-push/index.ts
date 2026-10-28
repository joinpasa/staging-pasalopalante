import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

/**
 * Sends a Web Push notification when a member reaches a new stage of a badge
 * (the streak badge included). Invoked by the `notify_badge_unlocked`
 * database trigger on `user_badges`. Only members who turned alerts on in
 * the app have a push subscription — it's off by default.
 */

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!;
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") ?? "mailto:hello@pasalopalante.com";

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

// Same wording as the in-app message (appBadges.newStage), in the languages
// badge names exist in; everyone else gets English.
const NEW_STAGE_COPY: Record<string, string> = {
  en: "Reached a new stage of “{badge}” (stage {stage})",
  es: "Alcanzaste una nueva etapa de “{badge}” (etapa {stage})",
  fr: "Nouveau palier atteint pour « {badge} » (palier {stage})",
  de: "Neue Stufe von „{badge}“ erreicht (Stufe {stage})",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    // Only the database trigger (service role) may fan out notifications.
    const auth = req.headers.get("Authorization") ?? "";
    if (auth !== `Bearer ${SERVICE_ROLE_KEY}`) return json({ error: "Unauthorized" }, 401);

    const payload = await req.json().catch(() => null);
    const userId = payload?.user_id;
    const badgeId = payload?.badge_id;
    const stage = Number(payload?.stage ?? 1);
    if (typeof userId !== "string" || typeof badgeId !== "string") {
      return json({ error: "user_id and badge_id are required" }, 400);
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const [{ data: badge }, { data: subs, error: subsError }, { data: profile }] = await Promise.all([
      supabase
        .from("badges")
        .select("name, name_es, name_fr, name_de, description, description_es, description_fr, description_de, icon")
        .eq("id", badgeId)
        .maybeSingle(),
      supabase.from("push_subscriptions").select("id, endpoint, p256dh, auth").eq("user_id", userId),
      supabase.from("profiles").select("language").eq("user_id", userId).maybeSingle(),
    ]);
    if (subsError) return json({ error: subsError.message }, 500);
    if (!subs?.length) return json({ sent: 0, reason: "no subscriptions" });

    const lang = NEW_STAGE_COPY[profile?.language ?? ""] ? (profile!.language as string) : "en";
    const localized = (field: "name" | "description") =>
      (lang !== "en" && badge?.[`${field}_${lang}` as keyof typeof badge]) || badge?.[field] || "";
    const notification = {
      title: `${badge?.icon ?? "🏅"} ${NEW_STAGE_COPY[lang]
        .replace("{badge}", localized("name") || badgeId)
        .replace("{stage}", String(stage))}`,
      body: localized("description"),
      url: "/app/badges",
      tag: `badge-${badgeId}`,
    };

    let sent = 0;
    const stale: string[] = [];

    await Promise.all(
      subs.map(async (sub) => {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            JSON.stringify(notification),
          );
          sent++;
        } catch (err) {
          const status = (err as { statusCode?: number }).statusCode;
          console.error(`push failed [${status}] for ${sub.id}:`, (err as Error).message);
          if (status === 404 || status === 410) stale.push(sub.id);
        }
      }),
    );

    if (stale.length) await supabase.from("push_subscriptions").delete().in("id", stale);
    if (sent) {
      await supabase
        .from("push_subscriptions")
        .update({ last_used_at: new Date().toISOString() })
        .eq("user_id", userId);
    }

    return json({ sent, removed: stale.length });
  } catch (err) {
    console.error("send-push error:", err);
    return json({ error: (err as Error).message }, 500);
  }
});
