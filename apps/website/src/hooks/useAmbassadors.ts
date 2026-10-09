import { useQuery } from "@tanstack/react-query";
import { supabasePublic } from "@shared/integrations/supabase/publicClient";

export interface Ambassador {
  id: string;
  name: string;
  country: string;
  region: string | null;
  role: string;
  photoUrl: string | null;
  instagram: string | null;
  facebook: string | null;
  tiktok: string | null;
  otherSocial: string | null;
  website: string | null;
  badgeUrl: string | null;
}

/**
 * Live read of the Global Ambassadors directory — synced from the
 * Ambassador Kit Google Sheet by the sync-ambassador edge function. Public,
 * session-free read since this must work the same for a signed-out visitor.
 */
export function useAmbassadors() {
  return useQuery({
    queryKey: ["ambassadors"],
    queryFn: async () => {
      const { data, error } = await supabasePublic
        .from("ambassadors")
        .select("id, name, country, region, role, photo_url, instagram, facebook, tiktok, other_social, website, badge_url")
        .eq("status", "published")
        .order("name", { ascending: true });
      if (error) throw error;
      return (data ?? []).map(
        (a): Ambassador => ({
          id: a.id,
          name: a.name,
          country: a.country,
          region: a.region,
          role: a.role,
          photoUrl: a.photo_url,
          instagram: a.instagram,
          facebook: a.facebook,
          tiktok: a.tiktok,
          otherSocial: a.other_social,
          website: a.website,
          badgeUrl: a.badge_url,
        }),
      );
    },
  });
}
