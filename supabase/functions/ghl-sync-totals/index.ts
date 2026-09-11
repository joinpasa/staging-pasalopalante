import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

// Pushes two aggregate totals into GoHighLevel as contact custom fields —
// {{contact.total_acts_of_kindness_submitted}} and
// {{contact.total_of_committed_pledge}} — since those are computed values
// (a count/sum across all of a contact's submissions over time), not a
// single form field GHL can capture directly the way ppl-signup's "pledge"/
// "commitment" fields (one submission's value) already are.
//
// Two ways to call it:
//   { mode: "user", email }     — resync one contact right after they submit
//                                  an act or a pledge (fire-and-forget from
//                                  submit-act / submit-commitment).
//   { mode: "backfill", limit?, offset? } — one-time sweep over every email
//                                  that has ever submitted an act or a
//                                  pledge, to backfill contacts that existed
//                                  before this synced anything. Loops
//                                  internally page by page until done.
//
// Privileged (touches every contact in GHL in backfill mode) — gated the
// same way process-email-queue is: exact match against this function's own
// service_role key, since --no-verify-jwt means the gateway itself doesn't
// check the caller's JWT.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GHL_API_KEY = Deno.env.get("GHL_API_KEY");
const GHL_LOCATION_ID = Deno.env.get("GHL_LOCATION_ID");
const GHL_BASE_URL = "https://services.leadconnectorhq.com";

const PAGE_SIZE = 200;
const MAX_PAGES = 100; // safety cap: up to 20,000 contacts in one backfill run
const DELAY_MS = 150;

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// Finds the GHL contact by email and updates only its customFields — no
// tags/other keys in the payload, so this never touches anything else on
// the contact (unlike ghlUpsertContact in ppl-signup, whose PUT replaces the
// whole tags array; that's fine there because it always sends the full tag
// set, but this call site only ever knows about these two totals).
// Skips silently (returns false) if no contact exists yet for that email —
// this syncs totals onto an existing contact, it doesn't create new ones.
async function pushTotals(email: string, actsCount: number, pledgeTotal: number): Promise<boolean> {
  const headers = {
    Authorization: `Bearer ${GHL_API_KEY}`,
    "Content-Type": "application/json",
    Version: "2021-07-28",
  };

  const searchRes = await fetch(
    `${GHL_BASE_URL}/contacts/search?email=${encodeURIComponent(email)}&locationId=${GHL_LOCATION_ID}`,
    { headers },
  );
  if (!searchRes.ok) throw new Error(`GHL search failed: ${await searchRes.text()}`);
  const searchData = await searchRes.json();
  const existing = searchData.contacts?.[0];
  if (!existing) return false;

  const updateRes = await fetch(`${GHL_BASE_URL}/contacts/${existing.id}`, {
    method: "PUT",
    headers,
    body: JSON.stringify({
      customFields: [
        { key: "total_acts_of_kindness_submitted", field_value: String(actsCount) },
        { key: "total_of_committed_pledge", field_value: String(pledgeTotal) },
      ],
    }),
  });
  if (!updateRes.ok) throw new Error(`GHL update failed: ${await updateRes.text()}`);
  return true;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  if (!GHL_API_KEY || !GHL_LOCATION_ID) {
    return json({ error: "GHL not configured" }, 500);
  }

  const authHeader = req.headers.get("Authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  if (token !== SERVICE_ROLE) {
    return json({ error: "Forbidden" }, 403);
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

  try {
    if (body.mode === "user") {
      const email = (body.email as string || "").trim().toLowerCase();
      if (!email) return json({ error: "email is required" }, 400);

      const { data, error } = await supabase
        .rpc("ghl_totals_for_email", { _email: email })
        .single();
      if (error) throw error;

      const row = data as { acts_count: number; pledge_total: number };
      const synced = await pushTotals(email, Number(row?.acts_count ?? 0), Number(row?.pledge_total ?? 0));
      return json({ email, synced, ...row });
    }

    if (body.mode === "backfill") {
      let offset = Number.isFinite(body.offset) ? Number(body.offset) : 0;
      let totalProcessed = 0;
      let totalSynced = 0;
      let pages = 0;

      while (pages < MAX_PAGES) {
        const { data, error } = await supabase.rpc("ghl_totals_by_email", {
          _limit: PAGE_SIZE,
          _offset: offset,
        });
        if (error) throw error;

        const rows = (data ?? []) as Array<{ email: string; acts_count: number; pledge_total: number }>;
        if (rows.length === 0) break;

        for (const row of rows) {
          try {
            const synced = await pushTotals(row.email, Number(row.acts_count), Number(row.pledge_total));
            totalProcessed++;
            if (synced) totalSynced++;
          } catch (e) {
            console.error("GHL totals push failed (non-fatal)", row.email, e);
          }
          await sleep(DELAY_MS);
        }

        offset += rows.length;
        pages++;
        if (rows.length < PAGE_SIZE) break;
      }

      return json({ processed: totalProcessed, synced: totalSynced, next_offset: offset });
    }

    return json({ error: "mode must be 'user' or 'backfill'" }, 400);
  } catch (e) {
    console.error("ghl-sync-totals failed", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
