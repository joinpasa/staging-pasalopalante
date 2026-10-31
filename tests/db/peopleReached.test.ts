import fs from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { beforeEach, describe, expect, it } from "vitest";

/**
 * Runs the real people-reached SQL (supabase/migrations/…_people_reached.sql
 * and …_people_reached_two_way.sql, in order) against an in-process Postgres
 * (PGlite), on minimal stand-ins for the two tables it reads:
 * profiles.referred_by (attributed signups, dated by profiles.created_at) and
 * pass_handoffs (QR scans by registered members; from = QR owner, to =
 * scanner).
 */
const MIGRATIONS = ["20261029120000_people_reached.sql", "20261031180000_people_reached_two_way.sql"].map((f) =>
  fs.readFileSync(path.resolve(__dirname, "../../supabase/migrations", f), "utf8"),
);

const SCHEMA = `
  CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
  CREATE SCHEMA auth;
  CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
    $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
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
`;

// Readable names → stable uuids.
const ids = new Map<string, string>();
const id = (name: string) => {
  if (!ids.has(name)) ids.set(name, `00000000-0000-0000-0000-${String(ids.size + 1).padStart(12, "0")}`);
  return ids.get(name)!;
};

// Every signup and scan happens one day after the previous one, so the
// order of the calls in a test is the order things happened in.
let day = 0;
const nextDay = () => new Date(Date.UTC(2026, 0, 1 + day++)).toISOString();

let db: PGlite;

beforeEach(async () => {
  ids.clear();
  day = 0;
  db = new PGlite();
  await db.exec(SCHEMA);
  for (const sql of MIGRATIONS) await db.exec(sql);
});

/** member(name) or member(name, invitedBy) — an attributed signup. */
async function member(name: string, invitedBy?: string) {
  await db.query("INSERT INTO public.profiles (user_id, referred_by, created_at) VALUES ($1, $2, $3)", [
    id(name),
    invitedBy ? id(invitedBy) : null,
    nextDay(),
  ]);
}

/** A registered member `scanner` scans `owner`'s personal Pass QR. */
async function scan(scanner: string, owner: string) {
  await db.query("INSERT INTO public.pass_handoffs (from_user_id, to_user_id, created_at) VALUES ($1, $2, $3)", [
    id(owner),
    id(scanner),
    nextDay(),
  ]);
}

/** Removes everything a deleted account leaves behind (see delete_account). */
async function deleteAccount(name: string) {
  await db.query("DELETE FROM public.pass_handoffs WHERE from_user_id = $1 OR to_user_id = $1", [id(name)]);
  await db.query("UPDATE public.profiles SET referred_by = NULL WHERE referred_by = $1", [id(name)]);
  await db.query("DELETE FROM public.profiles WHERE user_id = $1", [id(name)]);
}

async function stats(name: string) {
  const { rows } = await db.query<{
    people_reached: number;
    direct_joins: number;
    ripple_counts: number[];
    direct_connections: number;
    connection_ripples: number[];
  }>("SELECT * FROM public.reach_stats_for($1)", [id(name)]);
  const r = rows[0];
  return {
    reached: Number(r.people_reached),
    direct: Number(r.direct_connections),
    ripples: r.connection_ripples.map(Number),
  };
}

/** The Pass screen's "joined with your code" breakdown — signups only. */
async function codeJoins(name: string) {
  const { rows } = await db.query<{ direct_joins: number; ripple_counts: number[] }>(
    "SELECT * FROM public.reach_stats_for($1)",
    [id(name)],
  );
  return { direct: Number(rows[0].direct_joins), ripples: rows[0].ripple_counts.map(Number) };
}

/** A invites B, B invites C, C invites D and E — in that order. */
async function exampleChain() {
  await member("A");
  await member("B", "A");
  await member("C", "B");
  await member("D", "C");
  await member("E", "C");
}

describe("people reached: connecting", () => {
  it("counts a scan for both people, whoever scanned whom", async () => {
    await member("A");
    await member("B");
    await scan("B", "A");
    expect(await stats("A")).toEqual({ reached: 1, direct: 1, ripples: [] });
    expect(await stats("B")).toEqual({ reached: 1, direct: 1, ripples: [] });
  });

  it("counts a signup for both the inviter and the person who joined", async () => {
    await member("A");
    await member("B", "A");
    expect(await stats("A")).toEqual({ reached: 1, direct: 1, ripples: [] });
    expect(await stats("B")).toEqual({ reached: 1, direct: 1, ripples: [] });
  });

  it("doesn't need a second scan the other way", async () => {
    await member("A");
    await member("B");
    await scan("B", "A");
    await scan("A", "B");
    expect((await stats("A")).reached).toBe(1);
    expect((await stats("B")).reached).toBe(1);
  });

  it("does not count repeat scans by the same person again", async () => {
    await member("A");
    await member("F");
    await scan("F", "A");
    await scan("F", "A");
    await scan("F", "A");
    expect((await stats("A")).reached).toBe(1);
  });

  it("gives neither person the other's network from before they connected", async () => {
    await member("A");
    await member("X", "A"); // A's earlier network
    await member("B");
    await member("Y", "B"); // B's earlier network
    await member("Z", "Y");
    await scan("B", "A");
    expect(await stats("A")).toEqual({ reached: 2, direct: 2, ripples: [] }); // X, B
    // Y, A — and Z, who joined Y after B and Y connected.
    expect(await stats("B")).toEqual({ reached: 3, direct: 2, ripples: [1] });
  });

  it("gives someone who joins with a code nobody from their inviter's earlier network", async () => {
    await member("A");
    await member("X", "A");
    await member("B", "A");
    expect((await stats("B")).reached).toBe(1); // only A
  });
});

describe("people reached: after connecting", () => {
  it("credits both people for everyone either of them connects with afterwards, at every depth", async () => {
    await member("A");
    await member("B");
    await scan("B", "A");
    await member("C", "B"); // joins B after A–B
    await member("D", "C"); // C brings in D
    await member("E");
    await scan("E", "A"); // A scans with E after A–B
    expect(await stats("A")).toEqual({ reached: 4, direct: 2, ripples: [1, 1] }); // B, E | C | D
    expect(await stats("B")).toEqual({ reached: 4, direct: 2, ripples: [2] }); // A, C | E, D
  });

  it("January/March/May: someone connected before doesn't count, nor do the people they connect with later", async () => {
    await member("A");
    await member("B");
    await member("C");
    await member("D");
    await scan("C", "B"); // January: B and C
    await scan("B", "A"); // March: A and B
    await scan("D", "C"); // May: C and D
    expect(await stats("A")).toEqual({ reached: 1, direct: 1, ripples: [] }); // B only
    expect(await stats("B")).toEqual({ reached: 3, direct: 2, ripples: [1] }); // C, A | D
    expect(await stats("D")).toEqual({ reached: 1, direct: 1, ripples: [] }); // C only
  });

  it("walks a whole referral chain forwards, but never back to earlier members", async () => {
    await exampleChain();
    expect(await stats("A")).toEqual({ reached: 4, direct: 1, ripples: [1, 2] });
    expect(await stats("B")).toEqual({ reached: 4, direct: 2, ripples: [2] }); // A, C | D, E
    expect(await stats("C")).toEqual({ reached: 3, direct: 3, ripples: [] }); // B, D, E — not A (older)
    // D joined before E, so E (a later connection of C) counts for D.
    expect(await stats("D")).toEqual({ reached: 2, direct: 1, ripples: [1] });
    expect(await stats("E")).toEqual({ reached: 1, direct: 1, ripples: [] });
  });

  it("counts several direct connections and several ripple levels", async () => {
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

  it("reports zero for someone with no connections", async () => {
    await member("A");
    expect(await stats("A")).toEqual({ reached: 0, direct: 0, ripples: [] });
  });

  it("counts people reachable along two routes once, at the closer level", async () => {
    await member("A");
    await member("B");
    await member("C");
    await scan("B", "A");
    await scan("C", "A");
    await member("D", "B");
    await scan("D", "C"); // D is reachable via B and via C
    expect(await stats("A")).toEqual({ reached: 3, direct: 2, ripples: [1] });
  });

  it("moves someone to a direct connection when you later scan with them yourself", async () => {
    await member("A");
    await member("B");
    await scan("B", "A");
    await member("C", "B");
    expect(await stats("A")).toEqual({ reached: 2, direct: 1, ripples: [1] });
    await scan("C", "A");
    expect(await stats("A")).toEqual({ reached: 2, direct: 2, ripples: [] });
  });

  it("a later direct scan doesn't bring in what that person did before it", async () => {
    await member("A");
    await member("C");
    await member("D", "C"); // before A and C ever meet
    await scan("C", "A");
    await member("E", "C"); // after
    expect(await stats("A")).toEqual({ reached: 2, direct: 1, ripples: [1] }); // C | E
  });

  it("dates a connection by the first scan, not a later repeat", async () => {
    await member("A");
    await member("B");
    await scan("B", "A");
    await member("C", "B");
    await scan("B", "A"); // repeat scan after C joined B
    expect((await stats("A")).reached).toBe(2); // C still counts
  });

  it("drops people reached only through an account that's deleted", async () => {
    await exampleChain();
    expect((await stats("A")).reached).toBe(4);
    await deleteAccount("C");
    expect(await stats("A")).toEqual({ reached: 1, direct: 1, ripples: [] }); // D, E were reached via C
  });

  it("never counts you as reached by your own ripples", async () => {
    await member("A");
    await member("F");
    await scan("F", "A");
    await member("G", "F");
    await scan("A", "G"); // loops back to A
    expect((await stats("A")).reached).toBe(2);
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

  it("ignores a referral from an account that no longer exists", async () => {
    await member("A");
    await db.query("UPDATE public.profiles SET referred_by = $1 WHERE user_id = $2", [id("Ghost"), id("A")]);
    expect((await stats("A")).reached).toBe(0);
  });
});

describe("joined with your code (Pass screen)", () => {
  it("still counts attributed signups only, split into direct joins and ripples", async () => {
    await exampleChain();
    await member("F");
    await scan("F", "A");
    expect(await codeJoins("A")).toEqual({ direct: 1, ripples: [1, 2] });
    expect(await codeJoins("B")).toEqual({ direct: 1, ripples: [2] });
    expect(await codeJoins("F")).toEqual({ direct: 0, ripples: [] });
  });
});

describe("access", () => {
  it("my_reach_stats() returns the signed-in user's own numbers", async () => {
    await exampleChain();
    await db.query("SELECT set_config('request.jwt.claim.sub', $1, false)", [id("A")]);
    const { rows } = await db.query<{ people_reached: number; direct_connections: number }>(
      "SELECT * FROM public.my_reach_stats()",
    );
    expect(Number(rows[0].people_reached)).toBe(4);
    expect(Number(rows[0].direct_connections)).toBe(1);

    await db.query("SELECT set_config('request.jwt.claim.sub', '', false)");
    const signedOut = await db.query("SELECT * FROM public.my_reach_stats()");
    expect(signedOut.rows).toHaveLength(0);
  });

  it("keeps everyone's connections and other people's numbers away from clients", async () => {
    const { rows } = await db.query<{ view: boolean; fn: boolean }>(`
      SELECT has_table_privilege('authenticated', 'public.member_connections', 'SELECT') AS view,
             has_function_privilege('authenticated', 'public.reach_stats_for(uuid)', 'EXECUTE') AS fn
    `);
    expect(rows[0]).toEqual({ view: false, fn: false });
  });
});
