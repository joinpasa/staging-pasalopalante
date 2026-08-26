import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const ALLOWED_EXT = ["jpg", "jpeg", "png", "webp", "gif"];

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
