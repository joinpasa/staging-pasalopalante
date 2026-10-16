import { useQuery } from "@tanstack/react-query";
import { supabasePublic } from "@shared/integrations/supabase/publicClient";

export interface PartnerEntry {
  id: string;
  category: string;
  name: string;
  logoUrl: string | null;
  website: string | null;
  facebook: string | null;
  role: string | null;
  dark: boolean;
}

/**
 * Live read of the Partners directory — mirrored from the PKF_Partners
 * Google Sheet by the sync-partners edge function. Public, session-free
 * read since this must work the same for a signed-out visitor.
 */
export function usePartnerDirectory() {
  return useQuery({
    queryKey: ["partner-entries"],
    queryFn: async () => {
      const { data, error } = await supabasePublic
        .from("partner_entries")
        .select("id, category, name, logo_url, website, facebook, role, dark")
        .order("sort_order", { ascending: true, nullsFirst: false })
        .order("name", { ascending: true });
      if (error) throw error;
      return (data ?? []).map(
        (e): PartnerEntry => ({
          id: e.id,
          category: e.category,
          name: e.name,
          logoUrl: e.logo_url,
          website: e.website,
          facebook: e.facebook,
          role: e.role,
          dark: e.dark,
        }),
      );
    },
  });
}
