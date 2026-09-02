import { useQuery } from "@tanstack/react-query";
import { supabasePublic } from "@shared/integrations/supabase/publicClient";

/**
 * Sitewide movement totals — acts pledged (sum of pledge_count across all
 * published commitments), acts logged today, and acts logged all-time.
 * Fully live, computed straight from the database on every fetch — not
 * Airtable, not GHL, not a spreadsheet, and needs no manual upkeep.
 * Uses the session-free client since this is a public read that must work
 * the same for a signed-out visitor as anyone else.
 */
export function useMovementTotals() {
  return useQuery({
    queryKey: ["movementTotals"],
    queryFn: async () => {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const [all, today, pledges] = await Promise.all([
        supabasePublic
          .from("acts_of_kindness")
          .select("id", { count: "exact", head: true })
          .eq("status", "published"),
        supabasePublic
          .from("acts_of_kindness")
          .select("id", { count: "exact", head: true })
          .eq("status", "published")
          .gte("created_at", startOfDay.toISOString()),
        supabasePublic.from("commitments").select("pledge_count").eq("status", "published"),
      ]);

      return {
        actsAllTime: all.count ?? 0,
        actsToday: today.count ?? 0,
        pledged: (pledges.data ?? []).reduce((sum, row) => sum + (row.pledge_count ?? 0), 0),
      };
    },
  });
}
