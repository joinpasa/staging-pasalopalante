import { createClient } from "@supabase/supabase-js";

export const SUPABASE_URL: string =
  import.meta.env.VITE_SUPABASE_URL || "https://tipfbleltjexofsjffwb.supabase.co";

export const SUPABASE_KEY: string =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  "sb_publishable_oxT-cBeoofKTcaUhDBhghQ_Ne-swHDi";

/**
 * The portal's OWN Supabase client — deliberately not @shared's. The shared
 * client stores its session in a .pasalopalante.com cookie so the website
 * and app share one login; signing in here as a school's account through
 * that cookie would silently replace a teacher's personal app session (and
 * vice versa). A separate storage key in this origin's localStorage keeps
 * the two completely apart.
 */
export const portal = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    storageKey: "ppl-partner-portal-auth",
    storage: typeof window !== "undefined" ? window.localStorage : undefined,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});

/** POST to one of the partner-* edge functions; throws Error(message) on failure. */
export async function callFunction<T>(name: string, body: unknown, accessToken?: string): Promise<T> {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${accessToken ?? SUPABASE_KEY}`,
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || "Something went wrong. Please try again.");
  return data as T;
}
