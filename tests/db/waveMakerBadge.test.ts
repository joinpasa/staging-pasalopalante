import fs from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { beforeEach, describe, expect, it } from "vitest";

/**
 * Runs the people-reached migrations and the Wave Maker badge migration
 * against an in-process Postgres (PGlite), on minimal stand-ins for the
 * tables and functions they use from earlier migrations (badges,
 * user_badges, acts, user_streak, the push trigger).
 */
const MIGRATIONS = [
  "20261029120000_people_reached.sql",
  "20261031180000_people_reached_two_way.sql",
  "20261031200000_wave_maker_badge.sql",
].map((f) => fs.readFileSync(path.resolve(__dirname, "../../supabase/migrations", f), "utf8"));

const SCHEMA = `
  CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
  CREATE SCHEMA auth;
  CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
    $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS
    $$ SELECT nullif(current_setting('request.jwt.claim.role', true), '') $$;
  CREATE TABLE public.profiles (
    user_id uuid PRIMARY KEY,
    referred_by uuid,
    created_at timestamptz NOT NULL DEFAULT now()
  );
  CREATE TABLE public.pass_handoffs (
    id serial PRIMARY KEY,
    from_user_id uuid NOT NULL,
    to_user_id uuid NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
  );
  CREATE TABLE public.acts_of_kindness (user_id uuid, status text, mode text, act_type text);
  CREATE FUNCTION public.user_streak(_user_id uuid) RETURNS TABLE(longest_streak integer)
    LANGUAGE sql STABLE AS $$ SELECT 0 $$;
  CREATE TABLE public.badges (
    id text PRIMARY KEY, kind text, sort_order integer, icon text, criteria jsonb,
    name text, name_es text, name_fr text, name_de text,
    description text, description_es text, description_fr text, description_de text
  );
  CREATE TABLE public.user_badges (
    user_id uuid NOT NULL, badge_id text NOT NULL, stage integer NOT NULL DEFAULT 1,
    earned_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (user_id, badge_id)
  );
  CREATE TABLE public.notified (user_id uuid, stage integer);
  CREATE FUNCTION public.notify_badge_unlocked() RETURNS trigger LANGUAGE plpgsql AS
    $$ BEGIN INSERT INTO public.notified VALUES (NEW.user_id, NEW.stage); RETURN NEW; END; $$;
  CREATE TRIGGER notify_badge_unlocked_trg AFTER INSERT OR UPDATE OF stage ON public.user_badges
    FOR EACH ROW EXECUTE FUNCTION public.notify_badge_unlocked();
`;

const ids = new Map<string, string>();
const id = (name: string) => {
  if (!ids.has(name)) ids.set(name, `00000000-0000-0000-0000-${String(ids.size + 1).padStart(12, "0")}`);
  return ids.get(name)!;
};
let day = 0;
const nextDay = () => new Date(Date.UTC(2026, 0, 1 + day++)).toISOString();

let db: PGlite;

/** Runs the next statements as `name` signed in through the app (or signed out). */
async function signIn(name: string | null) {
  await db.query("SELECT set_config('request.jwt.claim.sub', $1, false)", [name ? id(name) : ""]);
  await db.query("SELECT set_config('request.jwt.claim.role', $1, false)", [name ? "authenticated" : ""]);
}

async function member(name: string, invitedBy?: string) {
  await db.query("INSERT INTO public.profiles (user_id, referred_by, created_at) VALUES ($1, $2, $3)", [
    id(name),
    invitedBy ? id(invitedBy) : null,
    nextDay(),
  ]);
}

async function scan(scanner: string, owner: string) {
  await db.query("INSERT INTO public.pass_handoffs (from_user_id, to_user_id, created_at) VALUES ($1, $2, $3)", [
    id(owner),
    id(scanner),
    nextDay(),
  ]);
}

async function savedStage(name: string) {
  const { rows } = await db.query<{ stage: number }>(
    "SELECT stage FROM public.user_badges WHERE user_id = $1 AND badge_id = 'wave_maker'",
    [id(name)],
  );
  return rows[0]?.stage ?? 0;
}

async function progress(name: string) {
  const { rows } = await db.query<{ current_count: number; target: number; stage: number; max_stage: number }>(
    "SELECT * FROM public.act_badge_progress($1) WHERE badge_id = 'wave_maker'",
    [id(name)],
  );
  const r = rows[0];
  return { current: Number(r.current_count), target: r.target, stage: r.stage, maxStage: r.max_stage };
}

beforeEach(async () => {
  ids.clear();
  day = 0;
  db = new PGlite();
  await db.exec(SCHEMA);
  for (const sql of MIGRATIONS) await db.exec(sql);
});

describe("Wave Maker badge", () => {
  it("is in the catalogue with the act badges' stages and a bold “QR code”", async () => {
    const { rows } = await db.query<{ name: string; description: string; criteria: unknown }>(
      "SELECT name, description, criteria FROM public.badges WHERE id = 'wave_maker'",
    );
    expect(rows[0]).toEqual({
      name: "Wave Maker",
      description: "Share or scan a “QR code”",
      criteria: { type: "reach", stages: [3, 7, 12, 18, 25, 33, 42, 50] },
    });
  });

  it("shows people reached as progress toward the next stage", async () => {
    await member("A");
    for (const n of ["B", "C", "D", "E"]) await member(n, "A");
    await signIn("A");
    expect(await progress("A")).toEqual({ current: 4, target: 7, stage: 1, maxStage: 8 });
  });

  it("awards both people when one scans the other's QR code", async () => {
    for (const n of ["A", "X1", "X2", "B", "Y1", "Y2"]) await member(n);
    await scan("X1", "A");
    await scan("X2", "A");
    await scan("Y1", "B");
    await scan("Y2", "B");
    expect(await savedStage("A")).toBe(0); // 2 people reached
    // B scans A's code while signed in as B — A is awarded too.
    await signIn("B");
    await scan("B", "A");
    expect(await savedStage("A")).toBe(1);
    expect(await savedStage("B")).toBe(1);
  });

  it("awards both people when someone joins with a code", async () => {
    await member("A");
    await member("X1", "A");
    await member("X2", "A");
    await member("B", "A");
    expect(await savedStage("A")).toBe(1);
  });

  it("keeps everyone else's people reached private", async () => {
    await member("A");
    for (const n of ["B", "C", "D"]) await member(n, "A");
    await signIn("B");
    expect((await progress("A")).current).toBe(0);
    expect((await progress("B")).current).toBe(3); // A — and C, D, who joined A after B
  });

  it("doesn't let a client award someone else", async () => {
    await member("A");
    for (const n of ["B", "C", "D"]) await member(n, "A");
    await db.query("DELETE FROM public.user_badges");
    await signIn("B");
    await db.query("SELECT public.award_badges_for_user($1)", [id("A")]);
    expect(await savedStage("A")).toBe(0);
  });

  it("never lowers a saved stage when people reached goes down", async () => {
    await member("A");
    for (const n of ["B", "C", "D"]) await member(n, "A");
    expect(await savedStage("A")).toBe(1);
    await db.query("UPDATE public.profiles SET referred_by = NULL WHERE referred_by = $1", [id("A")]);
    await db.query("SELECT public.award_badges_for_user($1)", [id("A")]);
    expect(await savedStage("A")).toBe(1);
  });
});
