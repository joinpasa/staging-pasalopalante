import { supabase } from "@shared/integrations/supabase/client";
import type { Translations } from "@shared/i18n/translations";

/**
 * A member's reach, from my_reach_stats() (see the people_reached migration
 * for how it's counted):
 * - peopleReached: everyone in their referral chain, every depth, plus
 *   registered members who scanned their personal Pass QR together with
 *   those members' own referral chains — each person once
 * - directJoins: people who joined with their own code
 * - rippleCounts[0]: 1st ripple (people invited by their direct joins),
 *   [1]: 2nd ripple, … — 0 means that generation is empty
 * Direct joins and ripples only ever come from attributed signups; a QR
 * scan by an existing member only affects peopleReached.
 */
export interface ReachStats {
  peopleReached: number;
  directJoins: number;
  rippleCounts: number[];
}

export const EMPTY_REACH: ReachStats = { peopleReached: 0, directJoins: 0, rippleCounts: [] };

export function parseReachStats(data: unknown): ReachStats {
  const row = (Array.isArray(data) ? data[0] : data) as
    | { people_reached?: unknown; direct_joins?: unknown; ripple_counts?: unknown }
    | null
    | undefined;
  if (!row) return EMPTY_REACH;
  return {
    peopleReached: Number(row.people_reached ?? 0) || 0,
    directJoins: Number(row.direct_joins ?? 0) || 0,
    rippleCounts: Array.isArray(row.ripple_counts) ? row.ripple_counts.map((n) => Number(n) || 0) : [],
  };
}

/** The signed-in member's reach. Throws on a failed call (no silent zeros). */
export async function fetchReachStats(): Promise<ReachStats> {
  const { data, error } = await supabase.rpc("my_reach_stats");
  if (error) throw error;
  return parseReachStats(data);
}

/** Singular wording only for exactly one; zero and anything above one are plural. */
export function countWording(count: number, singular: string, plural: string): string {
  return count === 1 ? singular : plural;
}

/** "1st", "2nd", "3rd", "4th"… in the reader's language (appPass.rippleOrdinal*). */
export function rippleOrdinal(n: number, lang: string, t: Translations): string {
  let category = "other";
  try {
    category = new Intl.PluralRules(lang, { type: "ordinal" }).select(n);
  } catch {
    /* unknown locale — "other" */
  }
  const forms: Record<string, string> = {
    one: t.appPass.rippleOrdinalOne,
    two: t.appPass.rippleOrdinalTwo,
    few: t.appPass.rippleOrdinalFew,
    many: t.appPass.rippleOrdinalMany,
    other: t.appPass.rippleOrdinalOther,
  };
  return (forms[category] ?? forms.other).replace("{n}", String(n));
}

export interface ReachRow {
  key: string;
  count: number;
  /** Text shown after the number, e.g. "people have joined with your code". */
  label: string;
}

/**
 * The direct-join line (always shown, even at 0), then one line per
 * non-empty ripple generation: "2 people joined in your 1st ripple", …
 */
export function reachRows(stats: ReachStats, lang: string, t: Translations): ReachRow[] {
  const rows: ReachRow[] = [
    {
      key: "direct",
      count: stats.directJoins,
      label: countWording(stats.directJoins, t.appPass.personJoinedWithCode, t.appPass.peopleJoinedWithCode),
    },
  ];
  stats.rippleCounts.forEach((count, i) => {
    if (count <= 0) return;
    const ripple = rippleOrdinal(i + 1, lang, t);
    rows.push({
      key: `ripple-${i + 1}`,
      count,
      label: countWording(count, t.appPass.personInRipple, t.appPass.peopleInRipple).replace("{ripple}", ripple),
    });
  });
  return rows;
}
