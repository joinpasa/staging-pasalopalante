// One-time sweep over every contact already in GHL to patch in the base
// PPL2026 + platform (ppl-website/ppl-app) tags that a bug in ppl-signup's
// password-set/email-verified lifecycle sync was letting fall through —
// see that function's comment for the root cause. Those two events fire on
// every verified session on every platform, so for a lot of contacts they
// were the *first* GHL touch, and the old code sent only the one lifecycle
// tag with nothing else: no PPL2026, no ppl-website/ppl-app.
//
// This never removes or overwrites a tag — only adds, via the same
// additive POST /contacts/{id}/tags used by ghlAddTags in ppl-signup. A
// contact with no PPL-related tag at all (never touched this campaign) is
// left completely alone.
//
// Call: { mode: "backfill", startAfterId?, startAfter? } — loops internally
// page by page until done or MAX_PAGES is hit; pass back the returned
// nextCursor to resume a run that hit the cap.
//
// Privileged (touches every contact in GHL) — gated the same way
// ghl-sync-totals is: exact match against this function's own service_role
// key, since --no-verify-jwt means the gateway itself doesn't check the
// caller's JWT.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GHL_API_KEY = Deno.env.get("GHL_API_KEY");
const GHL_LOCATION_ID = Deno.env.get("GHL_LOCATION_ID");
const GHL_BASE_URL = "https://services.leadconnectorhq.com";

const PAGE_SIZE = 100;
const MAX_PAGES = 200; // safety cap: up to 20,000 contacts scanned in one run
const DELAY_MS = 150;

// Any tag that marks a contact as part of this campaign at all — if a
// contact has none of these (and no PPL2026 already), it's not ours to
// touch. Kept in sync with buildGHLTags/getInvolvedCategoryTags/ghlAddTags
// call sites in ppl-signup/index.ts.
const PPL_SIGNAL_TAGS = new Set([
  "ppl2026", "ppl-website", "ppl-app", "password-set", "email-verified",
  "website-signup", "app-join", "pledged", "get-involved", "get-involved-lead",
  "get-involved-individual", "get-involved-group", "get-involved-ambassador",
  "get-involved-school", "get-involved-company", "get-involved-nonprofit",
  "get-involved-municipality", "get-involved-faith", "get-involved-other",
  "course-creator", "puerto-rico",
]);

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function secretsMatch(a: string, b: string): Promise<boolean> {
  const [da, db] = await Promise.all([sha256(a), sha256(b)]);
  let diff = 0;
  for (let i = 0; i < da.length; i++) diff |= da[i] ^ db[i];
  return diff === 0;
}
async function sha256(s: string): Promise<Uint8Array> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return new Uint8Array(buf);
}

// GHL lowercases tags on the way back out, so compare case-insensitively.
// contact.source ("PPL Website"/"PPL App", set by ghlUpsertContact) decides
// which platform tag to backfill when neither is already present; falls
// back to "ppl-app" only when an app-join tag is the sole signal we have.
function missingBaseTags(tags: string[], source: string): string[] {
  const lower = new Set(tags.map((t) => t.toLowerCase()));
  const isPplContact = lower.has("ppl2026") || [...lower].some((t) => PPL_SIGNAL_TAGS.has(t));
  if (!isPplContact) return [];

  const missing: string[] = [];
  if (!lower.has("ppl2026")) missing.push("PPL2026");
  if (!lower.has("ppl-website") && !lower.has("ppl-app")) {
    missing.push(source === "PPL App" || lower.has("app-join") ? "ppl-app" : "ppl-website");
  }
  return missing;
}

async function addTags(contactId: string, tags: string[]) {
  const res = await fetch(`${GHL_BASE_URL}/contacts/${contactId}/tags`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${GHL_API_KEY}`,
      "Content-Type": "application/json",
      Version: "2021-07-28",
    },
    body: JSON.stringify({ tags }),
  });
  if (!res.ok) throw new Error(`GHL add-tags failed: ${await res.text()}`);
}

interface GhlContact {
  id: string;
  tags?: string[];
  source?: string;
}

async function fetchContactPage(startAfterId?: string, startAfter?: string) {
  const params = new URLSearchParams({ locationId: GHL_LOCATION_ID!, limit: String(PAGE_SIZE) });
  if (startAfterId) params.set("startAfterId", startAfterId);
  if (startAfter) params.set("startAfter", startAfter);

  const res = await fetch(`${GHL_BASE_URL}/contacts/?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${GHL_API_KEY}`,
      Version: "2021-07-28",
    },
  });
  if (!res.ok) throw new Error(`GHL contacts list failed: ${await res.text()}`);
  const data = await res.json();
  return {
    contacts: (data.contacts ?? []) as GhlContact[],
    nextStartAfterId: data.meta?.startAfterId as string | undefined,
    nextStartAfter: data.meta?.startAfter as string | undefined,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  if (!GHL_API_KEY || !GHL_LOCATION_ID) {
    return json({ error: "GHL not configured" }, 500);
  }

  const authHeader = req.headers.get("Authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  if (!(await secretsMatch(token, SERVICE_ROLE))) {
    return json({ error: "Forbidden" }, 403);
  }

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    // no body is fine — starts from the beginning
  }

  let startAfterId = typeof body.startAfterId === "string" ? body.startAfterId : undefined;
  let startAfter = typeof body.startAfter === "string" ? body.startAfter : undefined;

  let scanned = 0;
  let fixed = 0;
  let pages = 0;

  try {
    while (pages < MAX_PAGES) {
      const page = await fetchContactPage(startAfterId, startAfter);
      if (page.contacts.length === 0) break;

      for (const contact of page.contacts) {
        scanned++;
        const missing = missingBaseTags(contact.tags ?? [], contact.source ?? "");
        if (missing.length > 0) {
          try {
            await addTags(contact.id, missing);
            fixed++;
          } catch (e) {
            console.error("Tag backfill failed (non-fatal)", contact.id, e);
          }
        }
        await sleep(DELAY_MS);
      }

      pages++;
      if (page.contacts.length < PAGE_SIZE || !page.nextStartAfterId) break;
      startAfterId = page.nextStartAfterId;
      startAfter = page.nextStartAfter;
    }

    const done = pages < MAX_PAGES;
    return json({
      scanned,
      fixed,
      done,
      // Pass these back in as { mode: "backfill", startAfterId, startAfter }
      // to resume when the safety cap was hit before finishing.
      nextCursor: done ? null : { startAfterId, startAfter },
    });
  } catch (e) {
    console.error("ghl-backfill-tags failed", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error", scanned, fixed }, 500);
  }
});
