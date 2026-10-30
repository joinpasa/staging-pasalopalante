import { useQuery } from "@tanstack/react-query";
import { fetchReachStats } from "@shared/lib/reach";

/** The signed-in member's people reached + direct-join / ripple breakdown.
 *  Shared query key, so several components on one page fetch it once. */
export function useReachStats(userId: string | undefined) {
  return useQuery({
    queryKey: ["reach", userId],
    enabled: !!userId,
    queryFn: fetchReachStats,
  });
}
