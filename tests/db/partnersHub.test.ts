import { describe, it, expect, beforeEach } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import fs from "node:fs";
import path from "node:path";

/**
 * Runs the Partners Hub migration (supabase/migrations/20261125120000_partners_hub.sql) on an
 * in-memory Postgres, with small stand-ins for the partner portal and the Kindness Hub tables it
 * builds on, and checks the access rules as the `authenticated` role.
 */
const HUB = fs.readFileSync(path.resolve(__dirname, "../../supabase/migrations/20261115120000_kindness_hub.sql"), "utf8");
const MIGRATION = fs.readFileSync(path.resolve(__dirname, "../../supabase/migrations/20261125120000_partners_hub.sql"), "utf8");

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
  CREATE FUNCTION storage.foldername(name text) RETURNS text[] LANGUAGE sql IMMUTABLE AS
    $$ SELECT (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1] $$;
  CREATE TYPE public.app_role AS ENUM ('member', 'leader', 'admin');
  CREATE TABLE public.user_roles (user_id uuid, role public.app_role);
  CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS
    $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $$;
  CREATE FUNCTION public.touch_updated_at() RETURNS trigger LANGUAGE plpgsql AS
    $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
  CREATE TABLE public.commitments (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), created_at timestamptz NOT NULL DEFAULT now(),
    type text, first_name text, email text, pledge_count integer, language text, status text, country text, partner_sheet_id text, org_name text);
  ALTER TABLE public.commitments ENABLE ROW LEVEL SECURITY;

  -- the partner portal, as far as this migration uses it
  CREATE TABLE public.partner_entries (id text PRIMARY KEY, category text, status text, name text, logo_url text, website text, facebook text);
  CREATE TABLE public.partners (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 160),
    city text, pledge_goal integer NOT NULL DEFAULT 0, invite_token text NOT NULL UNIQUE DEFAULT replace(gen_random_uuid()::text, '-', ''),
    account_user_id uuid UNIQUE, created_at timestamptz NOT NULL DEFAULT now(),
    org_type text CONSTRAINT partners_org_type_check CHECK (org_type IS NULL OR org_type IN ('school', 'ngo', 'company', 'faith', 'government', 'community', 'other')),
    contact_email text, sheet_entry_id text, ghl_invite_pushed_at timestamptz);
  CREATE TABLE public.partner_staff (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), partner_id uuid NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
    name text NOT NULL, code_hash text NOT NULL DEFAULT '', active boolean NOT NULL DEFAULT true, last_login_at timestamptz, created_at timestamptz NOT NULL DEFAULT now());
  CREATE TABLE public.partner_submissions (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), partner_id uuid NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
    people_count integer NOT NULL DEFAULT 1, status text NOT NULL DEFAULT 'pending');
  CREATE FUNCTION public.is_partner_account(_user_id uuid, _partner_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS
    $$ SELECT EXISTS (SELECT 1 FROM public.partners WHERE id = _partner_id AND account_user_id = _user_id) $$;
  ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "own" ON public.partners FOR SELECT TO authenticated USING (account_user_id = auth.uid());
`;

const GRANTS = `
  GRANT USAGE ON SCHEMA public, auth, storage TO anon, authenticated, service_role;
  GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
  GRANT SELECT, INSERT, UPDATE, DELETE ON public.hub_members, public.hub_items, public.hub_stories TO authenticated;
  GRANT ALL ON storage.objects TO anon, authenticated, service_role;
  GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA auth, storage TO anon, authenticated, service_role;
`;

const ids = new Map<string, string>();
const id = (name: string) => {
  if (!ids.has(name)) ids.set(name, `00000000-0000-0000-0000-${String(ids.size + 1).padStart(12, "0")}`);
  return ids.get(name)!;
};

let db: PGlite;

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

/** An organisation with its one account and one person. */
async function member(key: string, orgType = "school") {
  await db.query("INSERT INTO auth.users (id, email, email_confirmed_at) VALUES ($1, $2, now())", [id(key), `${key}@partners.example.org`]);
  await db.query("INSERT INTO public.partners (id, name, org_type, account_user_id, pledge_goal) VALUES ($1, $2, $3, $4, 1000)", [
    id(`${key}-org`),
    `${key} org`,
    orgType,
    id(key),
  ]);
  await db.query("INSERT INTO public.partner_staff (id, partner_id, name) VALUES ($1, $2, $3)", [id(`${key}-ana`), id(`${key}-org`), `Ana of ${key}`]);
  return { org: id(`${key}-org`), staff: id(`${key}-ana`) };
}

async function teamMember(name: string) {
  await db.query("INSERT INTO auth.users (id, email, email_confirmed_at) VALUES ($1, $2, now())", [id(name), `${name}@example.org`]);
  await db.query("INSERT INTO public.user_roles VALUES ($1, 'admin')", [id(name)]);
  await as(name, "SELECT public.hub_claim()");
  await db.query("UPDATE public.hub_members SET name = $1 WHERE user_id = $2", [name[0].toUpperCase() + name.slice(1), id(name)]);
}

const post = (who: string, staff: string, extra: Partial<Record<string, unknown>> = {}) =>
  as<{ id: string }>(
    who,
    `SELECT public.partner_post_create($1, $2, 'post', $3, $4::jsonb, null, $5, $6, false, 'consent v1') AS id`,
    [staff, extra.audience ?? "community", extra.body ?? "We cleaned the beach", JSON.stringify(extra.media ?? []), extra.share ?? true, extra.people ?? true],
  ).then((r) => r.rows[0].id);

beforeEach(async () => {
  ids.clear();
  db = new PGlite();
  await db.exec(SCHEMA);
  await db.exec(HUB);
  await db.exec(MIGRATION);
  await db.exec(GRANTS);
});

describe("Partners Hub: members and profile", () => {
  it("accepts ambassadors as a kind of member and sorts members into three kinds", async () => {
    await member("amb", "ambassador");
    const { rows } = await db.query<{ k: string }>(
      "SELECT string_agg(public.member_kind(t), ',' ORDER BY t) AS k FROM unnest(ARRAY['ambassador','company','school']) t",
    );
    expect(rows[0].k).toBe("ambassador,company,organisation");
  });

  it("lets an organisation fill in its profile, and only its own", async () => {
    const a = await member("a");
    await as("a", "SELECT public.partner_update_profile('Bayamón', 'Puerto Rico', 'North', null, 'teenchallengepr.org', '@tc', null, null, 'About us', 'Ana', $1)", [
      `${a.org}/profile/logo.png`,
    ]);
    const me = (await as<{ country: string; website: string; logo_path: string; pledge_total: number }>("a", "SELECT * FROM public.partner_me()")).rows[0];
    expect(me.country).toBe("Puerto Rico");
    expect(me.website).toBe("https://teenchallengepr.org");
    expect(me.logo_path).toBe(`${a.org}/profile/logo.png`);
    await member("b");
    await expect(as("a", "SELECT public.partner_update_profile(null,null,null,null,null,null,null,null,null,null,$1)", [`${id("b-org")}/profile/x.png`])).rejects.toThrow(/folder/);
  });

  it("adds to a pledge without touching the sheet's number, until the team counts it", async () => {
    const a = await member("a");
    const total = (await as<{ t: number }>("a", "SELECT public.partner_add_pledge($1, 250, 'staff week') AS t", [a.staff])).rows[0].t;
    expect(Number(total)).toBe(1250);
    expect((await db.query<{ pledge_goal: number }>("SELECT pledge_goal FROM public.partners WHERE id = $1", [a.org])).rows[0].pledge_goal).toBe(1000);
    await expect(as("a", "SELECT public.partner_add_pledge($1, 0)", [a.staff])).rejects.toThrow(/between/);
    const b = await member("b");
    await expect(as("a", "SELECT public.partner_add_pledge($1, 5)", [b.staff])).rejects.toThrow(/unknown person/);
  });
});

describe("Partners Hub: posts", () => {
  it("needs the consent boxes, and only takes files from the organisation's own folder", async () => {
    const a = await member("a");
    await expect(post("a", a.staff, { share: false })).rejects.toThrow(/share/);
    await expect(post("a", a.staff, { media: [{ path: `${a.org}/2026-11/x.jpg`, type: "image" }], people: false })).rejects.toThrow(/everyone shown/);
    await expect(post("a", a.staff, { media: [{ path: `someone-else/x.jpg`, type: "image" }] })).rejects.toThrow(/not from this organisation/);
    expect(await post("a", a.staff, { media: [{ path: `${a.org}/2026-11/x.jpg`, type: "image" }] })).toBeTruthy();
  });

  it("shows community posts to every member, keeps 'Share with us' for the team, and drops hidden posts", async () => {
    const a = await member("a");
    const b = await member("b", "company");
    await teamMember("simone");
    const open = await post("a", a.staff);
    const toTeam = await post("a", a.staff, { audience: "team", body: "A testimonial for you" });
    const feedB = (await as<{ id: string }>("b", "SELECT id FROM public.partner_feed($1)", [b.staff])).rows.map((r) => r.id);
    expect(feedB).toEqual([open]);
    const feedA = (await as<{ id: string; mine: boolean }>("a", "SELECT id, mine FROM public.partner_feed($1)", [a.staff])).rows;
    expect(feedA.map((r) => r.id).sort()).toEqual([open, toTeam].sort());
    const team = (await as<{ id: string }>("simone", "SELECT id FROM public.partner_feed(null, 50, null, null, null, null, null, true)")).rows.map((r) => r.id);
    expect(team.sort()).toEqual([open, toTeam].sort());

    await as("simone", "UPDATE public.partner_posts SET hidden_at = now(), hidden_note = 'off topic' WHERE id = $1", [open]);
    expect((await as("b", "SELECT id FROM public.partner_feed($1)", [b.staff])).rows).toHaveLength(0);
    // a partner can't hide posts
    await as("b", "UPDATE public.partner_posts SET hidden_at = null WHERE id = $1", [open]).catch(() => undefined);
    expect((await db.query<{ h: string | null }>("SELECT hidden_at AS h FROM public.partner_posts WHERE id = $1", [open])).rows[0].h).not.toBeNull();
  });

  it("counts hearts and comments, and lets people remove only their own", async () => {
    const a = await member("a");
    const b = await member("b");
    await teamMember("simone");
    const p = await post("a", a.staff);
    const h1 = (await as<{ hearted: boolean; hearts: number }>("b", "SELECT * FROM public.partner_post_heart($1, $2)", [p, b.staff])).rows[0];
    expect(h1).toEqual({ hearted: true, hearts: 1 });
    const h2 = (await as<{ hearted: boolean; hearts: number }>("b", "SELECT * FROM public.partner_post_heart($1, $2)", [p, b.staff])).rows[0];
    expect(h2).toEqual({ hearted: false, hearts: 0 });

    const c = (await as<{ id: string }>("b", "SELECT public.partner_comment_create($1, $2, 'Lovely') AS id", [p, b.staff])).rows[0].id;
    const me = (await as<{ id: string }>("simone", "SELECT public.hub_me() AS id")).rows[0].id;
    await as("simone", "INSERT INTO public.partner_post_comments (post_id, team_member_id, body) VALUES ($1, $2, 'Thank you')", [p, me]);
    const list = (await as<{ author: string; team: boolean; mine: boolean }>("a", "SELECT author, team, mine FROM public.partner_comments($1)", [p])).rows;
    expect(list).toEqual([
      { author: "Ana of b", team: false, mine: false },
      { author: "Simone", team: true, mine: false },
    ]);
    await expect(as("a", "SELECT public.partner_comment_delete($1)", [c])).rejects.toThrow(/not yours/);
    await as("b", "SELECT public.partner_comment_delete($1)", [c]);
    const feed = (await as<{ comments: number }>("a", "SELECT comments FROM public.partner_feed($1)", [a.staff])).rows[0];
    expect(feed.comments).toBe(1);
  });

  it("lets every member see logos and community photos, but not photos sent only to the team", async () => {
    const a = await member("a");
    await member("b");
    await post("a", a.staff, { media: [{ path: `${a.org}/2026-11/open.jpg`, type: "image" }] });
    await post("a", a.staff, { audience: "team", media: [{ path: `${a.org}/2026-11/private.jpg`, type: "image" }] });
    const can = async (name: string) =>
      (await as<{ ok: boolean }>("b", "SELECT public.partner_media_visible($1, auth.uid()) AS ok", [name])).rows[0].ok;
    expect(await can(`${a.org}/2026-11/open.jpg`)).toBe(true);
    expect(await can(`${a.org}/profile/logo.png`)).toBe(true);
    expect(await can(`${a.org}/2026-11/private.jpg`)).toBe(false);
  });
});

describe("Partners Hub: updates, kit and the team", () => {
  it("shows a weekly update to members only once it is published", async () => {
    await member("a");
    await teamMember("simone");
    await as("simone", "INSERT INTO public.partner_updates (week_start, title) VALUES ('2026-11-30', 'Draft')");
    expect((await as("a", "SELECT id FROM public.partner_updates")).rows).toHaveLength(0);
    await as("simone", "UPDATE public.partner_updates SET published_at = now() - interval '1 minute'");
    expect((await as("a", "SELECT title FROM public.partner_updates")).rows).toEqual([{ title: "Draft" }]);
    await expect(as("a", "INSERT INTO public.partner_updates (week_start, title) VALUES ('2026-11-30', 'Mine')")).rejects.toThrow();
  });

  it("lets members see the kit but only the team change it", async () => {
    await member("a");
    await teamMember("simone");
    await as("simone", "INSERT INTO public.partner_kit_items (title, audience, url) VALUES ('Badge', 'organisation', 'https://example.org/b.png'), ('Hidden', 'all', 'https://example.org/h.png')");
    await as("simone", "UPDATE public.partner_kit_items SET hidden = true WHERE title = 'Hidden'");
    expect((await as("a", "SELECT title FROM public.partner_kit_items")).rows).toEqual([{ title: "Badge" }]);
    await expect(as("a", "INSERT INTO public.partner_kit_items (title, url) VALUES ('Mine', 'https://example.org')")).rejects.toThrow();
  });

  it("gives the team every member with an invite link, and lets it add an ambassador", async () => {
    await member("a");
    await teamMember("simone");
    const added = (await as<{ id: string; invite_url: string }>("simone", "SELECT * FROM public.hub_add_member('Maya Cruz', 'ambassador', 'maya@example.org', 'Maya', 'Philippines', 100)")).rows[0];
    expect(added.invite_url).toMatch(/^https:\/\/partners\.passkindnessforward\.com\/join\/[0-9a-f]{32}$/);
    const list = (await as<{ name: string; org_type: string; joined: boolean }>("simone", "SELECT name, org_type, joined FROM public.hub_partners()")).rows;
    expect(list).toEqual([
      { name: "a org", org_type: "school", joined: true },
      { name: "Maya Cruz", org_type: "ambassador", joined: false },
    ]);
    await expect(as("a", "SELECT * FROM public.hub_partners()")).rejects.toThrow(/hub members only/);
    await expect(as("a", "SELECT * FROM public.hub_add_member('X', 'ambassador', null, null, null, 0)")).rejects.toThrow(/hub members only/);
  });

  it("hands members the map figures without anyone's personal details", async () => {
    await member("a");
    await db.query("INSERT INTO public.commitments (type, first_name, email, country, status) VALUES ('individual', 'Jo', 'jo@x.org', 'Germany', 'published'), ('individual', 'Al', 'al@x.org', 'Germany', 'published')");
    const stats = (await as<{ s: { pledgers: { country: string; people: number }[] } }>("a", "SELECT public.partner_hub_stats() AS s")).rows[0].s;
    expect(stats.pledgers).toEqual([{ country: "Germany", people: 2 }]);
    expect(JSON.stringify(stats)).not.toMatch(/jo@x\.org|Jo\b/);
  });

  it("lists the newest pledges by country, naming only listed partners", async () => {
    await member("a");
    await db.query(`INSERT INTO public.commitments (type, first_name, email, country, status, pledge_count, org_name, partner_sheet_id, created_at) VALUES
      ('individual', 'Jo', 'jo@x.org', 'Germany', 'published', 5, null, null, now() - interval '1 hour'),
      ('organization', null, 'ceo@acme.org', 'Kenya', 'published', 300, 'Acme Ltd', null, now() - interval '30 minutes'),
      ('organization', null, null, 'Puerto Rico', 'published', 5000, 'Teen Challenge Puerto Rico', 'NGO-9', now())`);
    const rows = (await as<{ country: string; kind: string; org_name: string | null; acts: number }>("a", "SELECT country, kind, org_name, acts FROM public.partner_recent_pledges(10)")).rows;
    expect(rows).toEqual([
      { country: "Puerto Rico", kind: "organisation", org_name: "Teen Challenge Puerto Rico", acts: 5000 },
      { country: "Kenya", kind: "organisation", org_name: null, acts: 300 },
      { country: "Germany", kind: "person", org_name: null, acts: 5 },
    ]);
    expect(JSON.stringify(rows)).not.toMatch(/Jo\b|jo@x|Acme|ceo@/);
  });
});
