import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
      // Lets a visitor's own browser reuse the response for a bit instead of
      // re-fetching on every poll — this is meant to be embedded on partner
      // sites (Heartfulness), so it can see far more traffic than our own.
      "Cache-Control": "public, max-age=30",
    },
  });
}

// Public, read-only, no auth: the live "acts pledged" total shown on our own
// site (packages/shared/src/hooks/useMovementTotals.ts — same table, same
// sum), exposed for an external page to embed. Nothing here is sensitive;
// it's the same number anyone can already see on pasalopalante.com.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "GET") return json({ error: "Method not allowed" }, 405);

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
  const supabase = createClient(SUPABASE_URL, ANON_KEY);

  const { data, error } = await supabase.from("commitments").select("pledge_count").eq("status", "published");
  if (error) {
    console.error("pledge-total: query failed", error);
    return json({ error: "Query failed" }, 500);
  }

  const pledged = (data ?? []).reduce((sum, row) => sum + (row.pledge_count ?? 0), 0);
  return json({ pledged, as_of: new Date().toISOString() });
});
