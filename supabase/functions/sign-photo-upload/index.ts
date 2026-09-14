import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const ALLOWED_EXT = ["jpg", "jpeg", "png", "webp", "gif"];

// This endpoint is public (verify_jwt=false — guests share acts without an
// account), so without a limit here a script could loop it indefinitely to
// run up storage costs and host unmoderated images under a public URL.
// Generous enough for anyone actually sharing several acts with photos in
// one sitting; nowhere near what a tight abuse loop would need.
const RATE_LIMIT_WINDOW_MINUTES = 10;
const RATE_LIMIT_MAX_REQUESTS = 20;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { ext } = await req.json();
    const safeExt = (ext || "jpg").toString().toLowerCase().replace(/[^a-z0-9]/g, "");
    if (!ALLOWED_EXT.includes(safeExt)) {
      return new Response(JSON.stringify({ error: "Unsupported file type" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    const fwd = req.headers.get("x-forwarded-for") || "";
    const ipAddress =
      req.headers.get("cf-connecting-ip") ||
      (fwd ? fwd.split(",")[0].trim() : null) ||
      req.headers.get("x-real-ip") ||
      "unknown";

    const { data: allowed, error: rateLimitError } = await supabase.rpc(
      "check_and_log_photo_upload",
      { _ip_address: ipAddress, _window_minutes: RATE_LIMIT_WINDOW_MINUTES, _max_requests: RATE_LIMIT_MAX_REQUESTS },
    );
    if (rateLimitError) {
      console.error("rate limit check failed", rateLimitError);
      // Fail open on our own error (not the caller's fault), same as every
      // other best-effort check in this codebase — a DB hiccup here must
      // never block someone from sharing an act.
    } else if (!allowed) {
      return new Response(JSON.stringify({ error: "Too many upload requests. Please try again shortly." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const path = `${crypto.randomUUID()}.${safeExt}`;
    const { data, error } = await supabase.storage
      .from("kindness-photos")
      .createSignedUploadUrl(path);

    if (error || !data) {
      console.error("sign error", error);
      return new Response(JSON.stringify({ error: "Could not create upload URL" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: pub } = supabase.storage.from("kindness-photos").getPublicUrl(path);

    return new Response(
      JSON.stringify({ path, token: data.token, signed_url: data.signedUrl, public_url: pub.publicUrl }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: "Unexpected error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
