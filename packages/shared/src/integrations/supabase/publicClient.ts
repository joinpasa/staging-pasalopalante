import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL ||
  "https://tipfbleltjexofsjffwb.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRpcGZibGVsdGpleG9mc2pmZndiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc1ODk3ODAsImV4cCI6MjEwMzE2NTc4MH0.tWyXhh5CS85RMvYuRFVPem4Oc-q5CBXcACHvlVYvtY8";

/**
 * A second client, deliberately kept session-free (no cookie storage, no
 * auto-refresh), for reads that must work for a logged-out visitor and
 * should never be affected by whatever the session-aware `supabase` client
 * is doing with auth state. Always sends just the anon key — nothing else
 * — as both `apikey` and `Authorization`.
 *
 * Use this for public, unauthenticated reads (homepage feeds, legal
 * document versions, etc.), not for anything that needs the signed-in
 * user's session.
 */
export const supabasePublic = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});
