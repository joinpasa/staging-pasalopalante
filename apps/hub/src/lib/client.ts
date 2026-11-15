import { createClient } from "@supabase/supabase-js";

export const SUPABASE_URL: string = import.meta.env.VITE_SUPABASE_URL || "https://tipfbleltjexofsjffwb.supabase.co";

export const SUPABASE_KEY: string =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || "sb_publishable_oxT-cBeoofKTcaUhDBhghQ_Ne-swHDi";

/**
 * The hub's own Supabase client, for the same reason the partner portal has one: the shared
 * client keeps its session in a .pasalopalante.com cookie so the website and app share a login,
 * and the hub should neither read that nor replace it. A separate key in this origin's own
 * storage keeps a team member's hub session apart from whatever they are signed in to elsewhere.
 */
export const hubDb = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    storageKey: "kindness-hub-auth",
    storage: typeof window !== "undefined" ? window.localStorage : undefined,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});

/** Calls one of the hub's edge functions. Problems come back as a plain sentence, the way the function wrote it. */
export async function callHub<T>(name: "hub-ghl" | "hub-public", body: Record<string, unknown>): Promise<T> {
  const { data } = await hubDb.auth.getSession();
  let res: Response;
  try {
    res = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: SUPABASE_KEY, Authorization: `Bearer ${data.session?.access_token ?? SUPABASE_KEY}` },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error("The hub could not reach its server. Check your connection and try again.");
  }
  const out = await res.json().catch(() => ({}));
  if (res.status === 429) throw new Error("That was a lot in a short time. Give it a few minutes and try again.");
  if (!res.ok) throw new Error(typeof out?.error === "string" ? out.error : "Something went wrong. Please try again.");
  return out as T;
}

/** live: real accounts, real data, real posts. demo: everything stays in this browser. */
export const HUB_LIVE: boolean = import.meta.env.VITE_HUB_DEMO === "1" ? false : import.meta.env.VITE_HUB_LIVE === "1" || import.meta.env.PROD;
