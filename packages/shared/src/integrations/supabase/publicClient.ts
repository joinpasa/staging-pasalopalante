import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL ||
  "https://tipfbleltjexofsjffwb.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  "sb_publishable_oxT-cBeoofKTcaUhDBhghQ_Ne-swHDi";

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
