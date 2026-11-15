import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { type ApiStore, handle, type ListQuery, type Row } from "./core.ts";

// The Kindness Hub's API: lets a trusted tool (Claude, a script) read and change the hub's own
// data with a key, instead of clicking through the screens. The rules live in core.ts.
//
// Turned on by the HUB_API_KEY secret (copied from GitHub's secrets on deploy). Without it, every
// request gets "switched off". Callers send the key as `Authorization: Bearer <key>` or
// `x-hub-key: <key>`, and may say who they are in `x-hub-actor` for the change log.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-hub-key, x-hub-actor",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
};

function supabaseStore(): ApiStore {
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const check = <T,>(r: { data: T; error: { message: string; code?: string } | null }): T => {
    if (r.error) throw new Error(r.error.code === "23505" ? "That is already in the hub." : r.error.message);
    return r.data;
  };
  return {
    async list(table: string, q: ListQuery) {
      let s = db.from(table).select("*");
      for (const [c, v] of q.eq ?? []) s = v === null ? s.is(c, null) : s.eq(c, v as string);
      for (const [c, v] of q.gte ?? []) s = s.gte(c, v);
      for (const [c, v] of q.lt ?? []) s = s.lt(c, v);
      if (q.search) {
        const [cols, words] = q.search;
        const safe = words.replace(/[%,()*]/g, " ").trim();
        if (safe) s = s.or(cols.map((c) => `${c}.ilike.*${safe}*`).join(","));
      }
      for (const [c, asc] of q.order ?? []) s = s.order(c, { ascending: asc, nullsFirst: false });
      if (q.limit) s = s.limit(q.limit);
      return (check(await s) ?? []) as Row[];
    },
    async get(table: string, key: string, value: string) {
      return (check(await db.from(table).select("*").eq(key, value).maybeSingle()) ?? null) as Row | null;
    },
    async insert(table: string, row: Row) {
      return check(await db.from(table).insert(row).select().single()) as Row;
    },
    async update(table: string, key: string, value: string, row: Row) {
      return (check(await db.from(table).update(row).eq(key, value).select().maybeSingle()) ?? null) as Row | null;
    },
    async remove(table: string, key: string, value: string) {
      check(await db.from(table).delete().eq(key, value));
      return true;
    },
    async log(entry) {
      // the log is a record, not a gate: a failed log line never undoes the change
      await db.from("hub_api_log").insert(entry);
    },
    async signedUpload(path: string) {
      const { data, error } = await db.storage.from("hub-media").createSignedUploadUrl(path);
      if (error || !data) throw new Error(error?.message ?? "The file store did not give an upload link.");
      return { uploadUrl: data.signedUrl };
    },
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const url = new URL(req.url);
  const path = url.pathname.replace(/^.*?\/hub-api/, "") || "/";
  const auth = req.headers.get("authorization") ?? "";
  const key = req.headers.get("x-hub-key") ?? (auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : null);
  let body: unknown = undefined;
  if (req.method !== "GET" && req.method !== "DELETE") {
    const text = await req.text();
    if (text.length > 2_000_000) return new Response(JSON.stringify({ error: "That is too much in one go. Send it in parts." }), { status: 413, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    try {
      body = text ? JSON.parse(text) : undefined;
    } catch {
      return new Response(JSON.stringify({ error: "The body is not valid JSON." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
  }
  const res = await handle(
    { method: req.method, path, query: url.searchParams, body, key, actor: req.headers.get("x-hub-actor") ?? "API" },
    { store: supabaseStore(), apiKey: Deno.env.get("HUB_API_KEY") ?? undefined },
  );
  return new Response(JSON.stringify(res.body, null, 2), { status: res.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
