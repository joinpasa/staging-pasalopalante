import fs from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { beforeEach, describe, expect, it } from "vitest";

/**
 * Runs the Kindness Hub migration against an in-process Postgres (PGlite), on minimal stand-ins
 * for what it uses from Supabase and from earlier migrations (auth, storage, user_roles,
 * has_role, touch_updated_at). Unlike the other tests here, statements are run as the real
 * `authenticated` and `service_role` roles, because the point is that the access rules hold.
 */
const MIGRATION = fs.readFileSync(path.resolve(__dirname, "../../supabase/migrations/20261115120000_kindness_hub.sql"), "utf8");
const PLEDGE_SOURCES = fs.readFileSync(path.resolve(__dirname, "../../supabase/migrations/20261115130000_pledge_sources.sql"), "utf8");

const SCHEMA = `
  CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
  CREATE SCHEMA auth;
  CREATE TABLE auth.users (id uuid PRIMARY KEY, email text, email_confirmed_at timestamptz);
  CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
    $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS
    $$ SELECT nullif(current_setting('request.jwt.claim.role', true), '') $$;
  CREATE SCHEMA storage;
  CREATE TABLE storage.buckets (id text PRIMARY KEY, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
  CREATE TABLE storage.objects (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), bucket_id text, name text);
  ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
  CREATE TYPE public.app_role AS ENUM ('member', 'leader', 'admin');
  CREATE TABLE public.user_roles (user_id uuid, role public.app_role);
  CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS
    $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $$;
  CREATE FUNCTION public.touch_updated_at() RETURNS trigger LANGUAGE plpgsql AS
    $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
  CREATE TABLE public.commitments (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), created_at timestamptz NOT NULL DEFAULT now(), type text, first_name text, email text, pledge_count integer, language text, status text);
  ALTER TABLE public.commitments ENABLE ROW LEVEL SECURITY;
`;

// what Supabase grants its API roles by default; the access rules are what does the real work
const GRANTS = `
  GRANT USAGE ON SCHEMA public, auth, storage TO anon, authenticated, service_role;
  GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
  GRANT ALL ON storage.objects TO anon, authenticated, service_role;
  GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA auth TO anon, authenticated, service_role;
`;

const ids = new Map<string, string>();
const id = (name: string) => {
  if (!ids.has(name)) ids.set(name, `00000000-0000-0000-0000-${String(ids.size + 1).padStart(12, "0")}`);
  return ids.get(name)!;
};

let db: PGlite;

/** An account on the site. `confirmed: false` is someone who typed an email but never proved it is theirs. */
async function account(name: string, opts: { confirmed?: boolean; siteAdmin?: boolean } = {}) {
  await db.query("INSERT INTO auth.users (id, email, email_confirmed_at) VALUES ($1, $2, $3)", [
    id(name),
    `${name}@example.org`,
    opts.confirmed === false ? null : new Date().toISOString(),
  ]);
  if (opts.siteAdmin) await db.query("INSERT INTO public.user_roles VALUES ($1, 'admin')", [id(name)]);
}

/** Runs `sql` the way the hub's screens would for that person: as the `authenticated` role, under the access rules. */
async function as<T = Record<string, unknown>>(name: string, sql: string, params: unknown[] = []) {
  await db.exec("RESET ROLE");
  await db.query("SELECT set_config('request.jwt.claim.sub', $1, false)", [id(name)]);
  await db.query("SELECT set_config('request.jwt.claim.role', 'authenticated', false)");
  await db.exec("SET ROLE authenticated");
  try {
    return await db.query<T>(sql, params);
  } finally {
    await db.exec("RESET ROLE");
  }
}

/** Runs `sql` the way the hub's edge function would. */
async function asService<T = Record<string, unknown>>(sql: string, params: unknown[] = []) {
  await db.exec("RESET ROLE");
  await db.query("SELECT set_config('request.jwt.claim.sub', '', false)");
  await db.query("SELECT set_config('request.jwt.claim.role', 'service_role', false)");
  await db.exec("SET ROLE service_role");
  try {
    return await db.query<T>(sql, params);
  } finally {
    await db.exec("RESET ROLE");
  }
}

const claim = async (name: string) => (await as<{ role: string | null }>(name, "SELECT public.hub_claim() AS role")).rows[0].role;

/** A team with one admin (through the site's own admin role), one approver and two members. */
async function team() {
  await account("dee", { siteAdmin: true });
  await account("edith");
  await account("simone");
  await account("rohini");
  expect(await claim("dee")).toBe("admin");
  await as("dee", "INSERT INTO public.hub_members (email, name, role) VALUES ('edith@example.org', 'Edith', 'approver'), ('simone@example.org', 'Simone', 'member'), ('rohini@example.org', 'Rohini', 'approver')");
  expect(await claim("edith")).toBe("approver");
  expect(await claim("simone")).toBe("member");
  expect(await claim("rohini")).toBe("approver");
}

const memberId = async (name: string) => (await db.query<{ id: string }>("SELECT id FROM public.hub_members WHERE user_id = $1", [id(name)])).rows[0].id;

async function card(owner: string, stage = "review") {
  const me = await memberId(owner);
  const { rows } = await as<{ id: string }>(owner, "INSERT INTO public.hub_items (title, stage, owner_id) VALUES ('A card', $1, $2) RETURNING id", [stage, me]);
  return rows[0].id;
}

beforeEach(async () => {
  ids.clear();
  db = new PGlite();
  await db.exec(SCHEMA);
  await db.exec(MIGRATION);
  await db.exec(PLEDGE_SOURCES);
  await db.exec(GRANTS);
});

describe("who is in the hub", () => {
  it("lets a site admin in, and gives them a row of their own", async () => {
    await account("dee", { siteAdmin: true });
    expect(await claim("dee")).toBe("admin");
    const { rows } = await db.query("SELECT role, email FROM public.hub_members");
    expect(rows).toEqual([{ role: "admin", email: "dee@example.org" }]);
  });

  it("keeps out someone nobody added", async () => {
    await team();
    await account("stranger");
    expect(await claim("stranger")).toBeNull();
    expect((await as("stranger", "SELECT * FROM public.hub_members")).rows).toHaveLength(0);
    expect((await as("stranger", "SELECT * FROM public.hub_items")).rows).toHaveLength(0);
    await expect(as("stranger", "INSERT INTO public.hub_items (title) VALUES ('sneaky')")).rejects.toThrow(/row-level security/);
  });

  it("does not link an account whose email was never confirmed", async () => {
    await account("dee", { siteAdmin: true });
    await claim("dee");
    await as("dee", "INSERT INTO public.hub_members (email, role) VALUES ('edith@example.org', 'approver')");
    await account("edith", { confirmed: false });
    expect(await claim("edith")).toBeNull();
  });

  it("only lets an admin add people or change roles", async () => {
    await team();
    await expect(as("simone", "INSERT INTO public.hub_members (email, role) VALUES ('friend@example.org', 'admin')")).rejects.toThrow(/row-level security/);
    await as("simone", "UPDATE public.hub_members SET role = 'admin' WHERE email = 'simone@example.org'");
    expect(await claim("simone")).toBe("member");
    await as("dee", "UPDATE public.hub_members SET role = 'approver' WHERE email = 'simone@example.org'");
    expect(await claim("simone")).toBe("approver");
  });
});

describe("approving a card", () => {
  it("is refused for a member", async () => {
    await team();
    const c = await card("rohini");
    await expect(as("simone", "UPDATE public.hub_items SET stage = 'approved' WHERE id = $1", [c])).rejects.toThrow(/Only an approver/);
  });

  it("is refused for the card's own owner, unless they are an admin", async () => {
    await team();
    const c = await card("edith");
    await expect(as("edith", "UPDATE public.hub_items SET stage = 'approved' WHERE id = $1", [c])).rejects.toThrow(/second pair of eyes/);
  });

  it("records who approved it, and cannot be written in by hand", async () => {
    await team();
    const c = await card("simone");
    // a member tries to fake an approval without changing the stage
    await as("simone", "UPDATE public.hub_items SET approved_by = owner_id, approved_at = now() WHERE id = $1", [c]);
    expect((await db.query("SELECT approved_by FROM public.hub_items WHERE id = $1", [c])).rows[0]).toEqual({ approved_by: null });
    await as("edith", "UPDATE public.hub_items SET stage = 'approved' WHERE id = $1", [c]);
    const { rows } = await db.query<{ stage: string; approved_by: string }>("SELECT stage, approved_by FROM public.hub_items WHERE id = $1", [c]);
    expect(rows[0]).toEqual({ stage: "approved", approved_by: await memberId("edith") });
  });

  it("is cleared when the card is sent back", async () => {
    await team();
    const c = await card("simone");
    await as("edith", "UPDATE public.hub_items SET stage = 'approved' WHERE id = $1", [c]);
    await as("rohini", "UPDATE public.hub_items SET stage = 'creating', needs_changes = 'Cover is missing' WHERE id = $1", [c]);
    const { rows } = await db.query("SELECT stage, approved_by, needs_changes FROM public.hub_items WHERE id = $1", [c]);
    expect(rows[0]).toEqual({ stage: "creating", approved_by: null, needs_changes: "Cover is missing" });
  });
});

describe("scheduling", () => {
  it("cannot be done from the screens, by anyone", async () => {
    await team();
    const c = await card("simone");
    await as("edith", "UPDATE public.hub_items SET stage = 'approved' WHERE id = $1", [c]);
    for (const who of ["simone", "edith", "dee"]) {
      await expect(as(who, "UPDATE public.hub_items SET stage = 'scheduled' WHERE id = $1", [c])).rejects.toThrow(/by itself/);
    }
    await expect(as("simone", "INSERT INTO public.hub_items (title, stage) VALUES ('skip the queue', 'scheduled')")).rejects.toThrow(/before approval/);
    // and the link to a HighLevel post cannot be planted either
    await as("edith", "UPDATE public.hub_items SET ghl_post_id = 'made-up' WHERE id = $1", [c]);
    expect((await db.query("SELECT ghl_post_id FROM public.hub_items WHERE id = $1", [c])).rows[0]).toEqual({ ghl_post_id: null });
  });

  it("is done by the hub's own function, and then the card is protected", async () => {
    await team();
    const c = await card("simone");
    await as("edith", "UPDATE public.hub_items SET stage = 'approved' WHERE id = $1", [c]);
    await asService("UPDATE public.hub_items SET stage = 'scheduled', ghl_post_id = 'ghl-123' WHERE id = $1", [c]);
    const { rows } = await db.query("SELECT stage, ghl_post_id, approved_by IS NOT NULL AS approved FROM public.hub_items WHERE id = $1", [c]);
    expect(rows[0]).toEqual({ stage: "scheduled", ghl_post_id: "ghl-123", approved: true });
    await expect(as("simone", "UPDATE public.hub_items SET stage = 'idea' WHERE id = $1", [c])).rejects.toThrow(/by itself/);
    await expect(as("dee", "DELETE FROM public.hub_items WHERE id = $1", [c])).rejects.toThrow(/off the schedule/);
    // a caption fix is still allowed
    await as("simone", "UPDATE public.hub_items SET caption_en = 'Fixed a typo' WHERE id = $1", [c]);
    expect((await db.query("SELECT caption_en, stage FROM public.hub_items WHERE id = $1", [c])).rows[0]).toEqual({ caption_en: "Fixed a typo", stage: "scheduled" });
  });
});

describe("the rest of the hub's data", () => {
  it("is open to members and closed to everyone else", async () => {
    await team();
    await account("stranger");
    await as("simone", "INSERT INTO public.hub_stories (kind, title, consent) VALUES ('words', 'A thank-you note', 'partner')");
    await as("simone", "INSERT INTO public.hub_suggestions (from_name, body) VALUES ('Simone', 'Film the volunteers on Saturday')");
    await as("simone", "INSERT INTO public.hub_kit (week_start, ask_en) VALUES ('2026-11-16', 'Share one kind thing you saw')");
    await as("simone", "INSERT INTO public.hub_briefs (week_start, headline) VALUES ('2026-11-16', 'After World Kindness Day')");
    await as("simone", "INSERT INTO public.hub_tasks (week_start, day, title, lever, steps) VALUES ('2026-11-16', '2026-11-20', 'Reply to every comment', 'engage', '[{\"text\": \"Open the post\"}]')");
    await as("simone", "INSERT INTO public.hub_videos (title, url, kind, grp, rights) VALUES ('The 13 or B film', 'https://files.example.org/film.mp4', 'file', 'ours', 'ours')");
    for (const table of ["hub_stories", "hub_suggestions", "hub_kit", "hub_briefs", "hub_tasks", "hub_videos"]) {
      expect((await as("edith", `SELECT * FROM public.${table}`)).rows, table).toHaveLength(1);
      expect((await as("stranger", `SELECT * FROM public.${table}`)).rows, table).toHaveLength(0);
    }
    await expect(as("stranger", "INSERT INTO public.hub_suggestions (body) VALUES ('spam')")).rejects.toThrow(/row-level security/);
  });

  it("keeps each video once, and only with a real link", async () => {
    await team();
    await as("simone", "INSERT INTO public.hub_videos (title, url) VALUES ('A clip', 'https://example.org/a.mp4')");
    await expect(as("edith", "INSERT INTO public.hub_videos (title, url) VALUES ('The same clip', 'https://example.org/a.mp4')")).rejects.toThrow(/duplicate key/);
    await expect(as("edith", "INSERT INTO public.hub_videos (title, url) VALUES ('Not a link', 'javascript:alert(1)')")).rejects.toThrow(/check constraint/);
    await expect(as("edith", "INSERT INTO public.hub_videos (title, url, rights) VALUES ('Odd', 'https://example.org/b.mp4', 'maybe')")).rejects.toThrow(/check constraint/);
  });

  it("shows members the API's change log, which only the edge function can write", async () => {
    await team();
    await asService("INSERT INTO public.hub_api_log (actor, action, resource, record_id, summary) VALUES ('Claude', 'create', 'tasks', 't1', 'Added a task')");
    expect((await as("edith", "SELECT summary FROM public.hub_api_log")).rows).toEqual([{ summary: "Added a task" }]);
    await expect(as("simone", "INSERT INTO public.hub_api_log (action, resource) VALUES ('create', 'tasks')")).rejects.toThrow(/row-level security/);
  });

  it("keeps its files to members", async () => {
    await team();
    await account("stranger");
    expect((await db.query("SELECT public FROM storage.buckets WHERE id = 'hub-media'")).rows).toEqual([{ public: false }]);
    await as("simone", "INSERT INTO storage.objects (bucket_id, name) VALUES ('hub-media', 'cards/1/film.mp4')");
    expect((await as("edith", "SELECT name FROM storage.objects")).rows).toHaveLength(1);
    expect((await as("stranger", "SELECT name FROM storage.objects")).rows).toHaveLength(0);
    await expect(as("stranger", "INSERT INTO storage.objects (bucket_id, name) VALUES ('hub-media', 'cards/1/other.mp4')")).rejects.toThrow(/row-level security/);
  });
});

describe("pledges in the hub", () => {
  it("shows members totals by day and by source, never a name or email, and shows strangers nothing", async () => {
    await team();
    await account("stranger");
    await db.exec(`INSERT INTO public.commitments (created_at, type, first_name, email, pledge_count, language, status, utm_source, utm_medium, utm_campaign) VALUES
      ('2026-11-13T15:30:00Z', 'individual', 'Ana', 'ana@example.org', 100, 'es', 'published', 'instagram', 'bio', NULL),
      ('2026-11-13T16:00:00Z', 'individual', 'Ben', 'ben@example.org', 50, 'en', 'published', 'newsletter', 'email', 'weekly-2026-11-19'),
      ('2026-11-13T17:00:00Z', 'organization', 'Org', 'org@example.org', 1000000, 'en', 'published', NULL, NULL, NULL),
      ('2026-11-13T18:00:00Z', 'individual', 'Held', 'held@example.org', 99999, 'en', 'pending', NULL, NULL, NULL)`);
    await db.exec("UPDATE public.commitments SET created_at = now() - interval '2 days'");
    const days = (await as<{ people: number; acts: string; orgs: number; spanish: number }>("simone", "SELECT * FROM public.hub_pledges(30)")).rows;
    expect(days).toHaveLength(1);
    expect(days[0]).toMatchObject({ people: 2, orgs: 1, spanish: 1 });
    expect(Number(days[0].acts)).toBe(150);
    const sources = (await as<{ source: string; medium: string; people: number }>("edith", "SELECT source, medium, people FROM public.hub_pledge_sources(30) ORDER BY source")).rows;
    expect(sources).toEqual([
      { source: "instagram", medium: "bio", people: 1 },
      { source: "newsletter", medium: "email", people: 1 },
    ]);
    expect((await as("stranger", "SELECT * FROM public.hub_pledges(30)")).rows).toHaveLength(0);
    await expect(as("stranger", "SELECT email FROM public.commitments")).resolves.toMatchObject({ rows: [] });
  });
});
