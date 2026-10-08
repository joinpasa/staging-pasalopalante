import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Lets a signed-in user permanently delete one of their own acts (e.g. an
// accidental submission from a stray tap). Ownership is re-checked here
// against the real row rather than trusted from the client, since this
// uses the service role to actually perform the delete - there's no RLS
// DELETE policy on acts_of_kindness, matching how every other write to
// this table already goes through an edge function rather than direct
// client access. Related rows (reactions, thanks, translation cache) are
// all declared ON DELETE CASCADE, so a single delete here cleans up
// everything without leaving orphans.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
  const { data: userRes, error: userErr } = await supabase.auth.getUser(authHeader.slice(7));
  if (userErr || !userRes?.user) return json({ error: "Unauthorized" }, 401);
  const userId = userRes.user.id;

  let body: { act_id?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid body" }, 400);
  }
  const actId = (body.act_id ?? "").toString();
  if (!UUID_RE.test(actId)) return json({ error: "Invalid act_id" }, 400);

  const { data: act, error: fetchErr } = await supabase
    .from("acts_of_kindness")
    .select("id, user_id")
    .eq("id", actId)
    .maybeSingle();
  if (fetchErr) {
    console.error("delete-act: lookup failed", fetchErr);
    return json({ error: "Lookup failed" }, 500);
  }
  if (!act) return json({ error: "Not found" }, 404);
  if (act.user_id !== userId) return json({ error: "Forbidden" }, 403);

  const { error: delErr } = await supabase.from("acts_of_kindness").delete().eq("id", actId);
  if (delErr) {
    console.error("delete-act: delete failed", delErr);
    return json({ error: "Delete failed" }, 500);
  }

  return json({ success: true });
});
