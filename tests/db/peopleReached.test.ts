import fs from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { beforeEach, describe, expect, it } from "vitest";

/**
 * Runs the real people-reached SQL (supabase/migrations/…_people_reached.sql)
 * against an in-process Postgres (PGlite), on minimal stand-ins for the two
 * tables it reads: profiles.referred_by (attributed signups) and
 * pass_handoffs (QR scans by registered members; from = QR owner, to =
 * scanner).
 */
const MIGRATION = fs.readFileSync(
  path.resolve(__dirname, "../../supabase/migrations/20261029120000_people_reached.sql"),
  "utf8",
);

const SCHEMA = `
  CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
  CREATE SCHEMA auth;
  CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
    $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  CREATE TABLE public.profiles (user_id uuid PRIMARY KEY, referred_by uuid);
  CREATE TABLE public.pass_handoffs (
    id serial PRIMARY KEY,
    from_user_id uuid NOT NULL,
    to_user_id uuid NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
  );
`;

// Readable names → stable uuids.
const ids = new Map<string, string>();
const id = (name: string) => {
  if (!ids.has(name)) ids.set(name, `00000000-0000-0000-0000-${String(ids.size + 1).padStart(12, "0")}`);
  return ids.get(name)!;
};

let db: PGlite;

beforeEach(async () => {
  ids.clear();
  db = new PGlite();
  await db.exec(SCHEMA);
  await db.exec(MIGRATION);
});

/** member(name) or member(name, invitedBy) — an attributed signup. */
async function member(name: string, invitedBy?: string) {
  await db.query("INSERT INTO public.profiles (user_id, referred_by) VALUES ($1, $2)", [
    id(name),
    invitedBy ? id(invitedBy) : null,
  ]);
}

/** A registered member `scanner` scans `owner`'s personal Pass QR. */
async function scan(scanner: string, owner: string) {
  await db.query("INSERT INTO public.pass_handoffs (from_user_id, to_user_id) VALUES ($1, $2)", [
    id(owner),
    id(scanner),
  ]);
}

async function stats(name: string) {
  const { rows } = await db.query<{ people_reached: number; direct_joins: number; ripple_counts: number[] }>(
    "SELECT * FROM public.reach_stats_for($1)",
    [id(name)],
  );
  const r = rows[0];
  return {
    reached: Number(r.people_reached),
    direct: Number(r.direct_joins),
    ripples: r.ripple_counts.map(Number),
  };
}

/** The example: A invites B, B invites C, C invites D and E. */
async function exampleChain() {
  await member("A");
  await member("B", "A");
  await member("C", "B");
  await member("D", "C");
  await member("E", "C");
}

describe("people reached / direct joins / ripples", () => {
  it("counts the whole referral chain and splits it into direct joins and ripples", async () => {
    await exampleChain();
    expect(await stats("A")).toEqual({ reached: 4, direct: 1, ripples: [1, 2] });
    // Each person only sees their own subtree.
    expect(await stats("B")).toEqual({ reached: 3, direct: 1, ripples: [2] });
    expect(await stats("C")).toEqual({ reached: 2, direct: 2, ripples: [] });
  });

  it("counts several direct joins and several ripple levels", async () => {
    await member("A");
    await member("B1", "A");
    await member("B2", "A");
    await member("B3", "A");
    await member("C1", "B1");
    await member("C2", "B2");
    await member("D1", "C1");
    await member("E1", "D1");
    await member("E2", "D1");
    await member("E3", "D1");
    expect(await stats("A")).toEqual({ reached: 9, direct: 3, ripples: [2, 1, 3] });
  });

  it("reports zero direct joins and no ripples for someone who invited nobody", async () => {
    await member("A");
    expect(await stats("A")).toEqual({ reached: 0, direct: 0, ripples: [] });
  });

  it("adds a registered member's QR scan to people reached only", async () => {
    await exampleChain();
    await member("F");
    await scan("F", "A");
    expect(await stats("A")).toEqual({ reached: 5, direct: 1, ripples: [1, 2] });
  });

  it("also counts the scanner's own ripples, but only in people reached", async () => {
    await exampleChain();
    // F was already a member and had brought in G, who brought in H and I.
    await member("F");
    await member("G", "F");
    await member("H", "G");
    await member("I", "G");
    await scan("F", "A");
    // A's chain (4) + F and F's ripples G, H, I (4) = 8; joins/ripples unchanged.
    expect(await stats("A")).toEqual({ reached: 8, direct: 1, ripples: [1, 2] });
  });

  it("counts people reachable along two routes once", async () => {
    await member("A");
    await member("F");
    await member("G", "F");
    await member("H", "G");
    // F and G both scan A — G and H are reachable via F and directly via G.
    await scan("F", "A");
    await scan("G", "A");
    expect((await stats("A")).reached).toBe(3);
  });

  it("does not add anything when a scanner from inside the chain brings ripples along", async () => {
    await exampleChain();
    await scan("C", "A"); // C and C's ripples D, E are already in A's chain
    expect(await stats("A")).toEqual({ reached: 4, direct: 1, ripples: [1, 2] });
  });

  it("never counts the QR owner as reached by their own ripples", async () => {
    await member("A");
    await member("F");
    await member("G", "F");
    await scan("F", "A");
    // A later joined via G's code too (a loop back to A).
    await db.query("UPDATE public.profiles SET referred_by = $1 WHERE user_id = $2", [id("G"), id("A")]);
    expect((await stats("A")).reached).toBe(2);
  });

  it("credits only the QR owner, never the scanner", async () => {
    await member("A");
    await member("F");
    await scan("F", "A");
    expect((await stats("A")).reached).toBe(1);
    expect((await stats("F")).reached).toBe(0);
  });

  it("does not count repeat scans by the same person again", async () => {
    await member("A");
    await member("F");
    await scan("F", "A");
    await scan("F", "A");
    await scan("F", "A");
    expect((await stats("A")).reached).toBe(1);
  });

  it("does not double-count a scanner who is already in the referral chain", async () => {
    await exampleChain();
    await scan("D", "A"); // D is A's 2nd ripple already
    await scan("B", "A"); // B is A's direct join already
    expect(await stats("A")).toEqual({ reached: 4, direct: 1, ripples: [1, 2] });
  });

  it("ignores scans of other people's QR codes", async () => {
    await exampleChain();
    await member("F");
    await scan("F", "B"); // credits B, not A
    expect(await stats("A")).toEqual({ reached: 4, direct: 1, ripples: [1, 2] });
    expect((await stats("B")).reached).toBe(4);
  });

  it("handles very deep chains without a depth limit", async () => {
    await member("L0");
    for (let i = 1; i <= 150; i++) await member(`L${i}`, `L${i - 1}`);
    const s = await stats("L0");
    expect(s.reached).toBe(150);
    expect(s.direct).toBe(1);
    expect(s.ripples).toHaveLength(149);
    expect(s.ripples.every((n) => n === 1)).toBe(true);
  });

  it("stops at a referral loop and counts everyone once", async () => {
    await member("X");
    await member("Y", "X");
    await db.query("UPDATE public.profiles SET referred_by = $1 WHERE user_id = $2", [id("Y"), id("X")]);
    expect(await stats("X")).toEqual({ reached: 1, direct: 1, ripples: [] });
  });

  it("my_reach_stats() returns the signed-in user's own numbers", async () => {
    await exampleChain();
    await db.query("SELECT set_config('request.jwt.claim.sub', $1, false)", [id("A")]);
    const { rows } = await db.query<{ people_reached: number }>("SELECT * FROM public.my_reach_stats()");
    expect(Number(rows[0].people_reached)).toBe(4);

    await db.query("SELECT set_config('request.jwt.claim.sub', '', false)");
    const signedOut = await db.query("SELECT * FROM public.my_reach_stats()");
    expect(signedOut.rows).toHaveLength(0);
  });
});
