import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GHL_BASE_URL = "https://services.leadconnectorhq.com";
const GHL_DELETED_TAG = "account-deleted";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Lets a signed-in user permanently delete their own account and all data
// tied to it. The user is identified only from their JWT — never from the
// request body — so nobody can delete someone else's account.
//
// Order matters: the account's data is wiped first (delete_user_data, one
// transaction) and the auth user last. If anything fails part-way, the
// login still exists and the user can simply try again — every step is
// safe to re-run. The reverse order could leave orphaned data with no
// account left to retry from.
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
  const email = userRes.user.email ?? "";

  // 1. Database rows (acts, commitments, reactions, logs, sole-member groups…).
  const { data: photoPaths, error: dataErr } = await supabase.rpc("delete_user_data", {
    _user_id: userId,
    _email: email,
  });
  if (dataErr) {
    console.error("delete-account: delete_user_data failed", dataErr);
    return json({ error: "Delete failed" }, 500);
  }

  // 2. Act photos. The bucket is public, so these must actually go — a
  // leftover file stays reachable by URL. Non-fatal: the rows pointing at
  // them are already gone, so a failure here is logged for manual cleanup
  // rather than blocking the user's deletion.
  const paths = (photoPaths as string[] | null) ?? [];
  if (paths.length > 0) {
    const { error: storageErr } = await supabase.storage.from("kindness-photos").remove(paths);
    if (storageErr) {
      console.error("delete-account: photo removal failed", { userId, paths, storageErr });
    }
  }

  // 3. CRM: tag the GHL contact so the team knows this person deleted their
  // account (the contact itself is kept — it may also belong to newsletter
  // or volunteer lists joined separately). Best-effort, like every other
  // GHL sync in this codebase.
  if (email) {
    try {
      await ghlTagDeleted(email);
    } catch (err) {
      console.error("delete-account: GHL tagging failed (non-fatal)", err);
    }
  }

  // 4. The login itself. Cascades the remaining rows (profile, roles,
  // badges, reminders, push subscriptions, memberships, hand-offs, thanks).
  const { error: authDelErr } = await supabase.auth.admin.deleteUser(userId);
  if (authDelErr) {
    console.error("delete-account: auth user delete failed", authDelErr);
    return json({ error: "Delete failed" }, 500);
  }

  return json({ success: true });
});

async function ghlTagDeleted(email: string) {
  const apiKey = Deno.env.get("GHL_API_KEY");
  const locationId = Deno.env.get("GHL_LOCATION_ID");
  if (!apiKey || !locationId) return;

  const headers = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    Version: "2021-07-28",
  };

  const searchRes = await fetch(
    `${GHL_BASE_URL}/contacts/search?email=${encodeURIComponent(email)}&locationId=${locationId}`,
    { headers },
  );
  const searchData = await searchRes.json();
  const contactId = searchData.contacts?.[0]?.id;
  // No contact means nothing to flag — don't create one just to tag it.
  if (!contactId) return;

  const res = await fetch(`${GHL_BASE_URL}/contacts/${contactId}/tags`, {
    method: "POST",
    headers,
    body: JSON.stringify({ tags: [GHL_DELETED_TAG] }),
  });
  if (!res.ok) throw new Error(`GHL tag failed: ${res.status} ${await res.text()}`);
}
