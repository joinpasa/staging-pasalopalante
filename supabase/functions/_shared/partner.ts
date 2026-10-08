import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";

/** Shared bits for the partner portal's edge functions (partner-auth,
 *  partner-submit, partner-sheet). */

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-sheet-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
export const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

export function adminClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface PartnerRow {
  id: string;
  name: string;
  city: string | null;
  account_user_id: string | null;
}

/** Resolves the partner whose school account made this request, or null. */
export async function partnerFromRequest(req: Request, admin: SupabaseClient): Promise<PartnerRow | null> {
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) return null;
  const { data: partner } = await admin
    .from("partners")
    .select("id, name, city, account_user_id")
    .eq("account_user_id", data.user.id)
    .maybeSingle();
  return (partner as PartnerRow | null) ?? null;
}
