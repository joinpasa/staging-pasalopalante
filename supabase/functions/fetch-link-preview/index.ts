import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FETCH_TIMEOUT_MS = 8000;
const MAX_HTML_BYTES = 500_000; // only the <head> is needed; stop reading well before any real page body

// A plain fetch() with no UA gets a generic/blocked page from most of these
// platforms — a normal browser UA is what gets the real og:image back for a
// public post. This never sees a login wall for a public post; it just
// doesn't get a useful preview for anything that isn't public, which is
// the same thing an unauthenticated browser tab would see.
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";

function extractMetaImage(html: string): string | null {
  // Open Graph first, Twitter card as a fallback — covers every platform
  // this feature supports. Attribute order (property/content vs
  // content/property) and quote style both vary by platform, so this
  // matches either.
  const patterns = [
    /<meta[^>]+property=["']og:image(?::secure_url)?["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image(?::secure_url)?["']/i,
    /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i,
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m?.[1]) return m[1];
  }
  return null;
}

async function fetchPreviewImage(url: string): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": UA, Accept: "text/html" },
      redirect: "follow",
    });
    if (!res.ok || !res.body) return null;

    // Read only up to MAX_HTML_BYTES — og:image lives in <head>, no need to
    // pull down a whole page (some of these can be large).
    const reader = res.body.getReader();
    let received = 0;
    const chunks: Uint8Array[] = [];
    while (received < MAX_HTML_BYTES) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        chunks.push(value);
        received += value.length;
      }
    }
    reader.cancel().catch(() => {});
    const combined = new Uint8Array(received);
    let offset = 0;
    for (const chunk of chunks) {
      combined.set(chunk, offset);
      offset += chunk.length;
    }
    const html = new TextDecoder().decode(combined);

    const image = extractMetaImage(html);
    if (!image) return null;
    // Resolve relative URLs against the final (post-redirect) page URL, and
    // only ever store a real http(s) image URL.
    try {
      const resolved = new URL(image, res.url);
      if (resolved.protocol !== "https:" && resolved.protocol !== "http:") return null;
      return resolved.toString();
    } catch {
      return null;
    }
  } catch (e) {
    console.error("fetch-link-preview: fetch failed", e);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // Internal-only dispatch from submit-act, same convention as classify-act.
  const auth = req.headers.get("Authorization") ?? "";
  if (auth !== `Bearer ${SERVICE_ROLE}`) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const actId = typeof body?.act_id === "string" ? body.act_id : null;
    const url = typeof body?.url === "string" ? body.url : null;
    if (!actId || !url || !/^https?:\/\//i.test(url)) {
      return new Response(JSON.stringify({ error: "act_id and url required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const image = await fetchPreviewImage(url);
    if (image) {
      const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);
      const { error } = await supabase
        .from("acts_of_kindness")
        .update({ link_preview_image: image })
        .eq("id", actId);
      if (error) console.error("fetch-link-preview: update failed", actId, error);
    }

    return new Response(JSON.stringify({ found: !!image }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    // Fail open, always — this is a cosmetic best-effort enhancement.
    console.error("fetch-link-preview error", e);
    return new Response(JSON.stringify({ found: false }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
