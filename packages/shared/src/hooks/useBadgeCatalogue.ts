import { useQuery } from "@tanstack/react-query";
import { fetchBadgeCatalogue } from "@shared/lib/badges";

/** The public badge catalogue with its rules. Rarely changes, so cached long. */
export function useBadgeCatalogue() {
  return useQuery({
    queryKey: ["badges", "catalogue"],
    queryFn: fetchBadgeCatalogue,
    staleTime: 60 * 60 * 1000,
  });
}
