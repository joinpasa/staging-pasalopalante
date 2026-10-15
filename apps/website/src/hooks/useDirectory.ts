import { useQuery } from "@tanstack/react-query";
import { supabasePublic } from "@shared/integrations/supabase/publicClient";

export interface DirectoryEntry {
  id: string;
  category: string;
  name: string;
  handle: string | null;
  designation: string | null;
  subcategory: string | null;
  country: string | null;
  region: string | null;
  imageUrl: string | null;
  bio: string | null;
  socialLink: string | null;
  sortOrder: number | null;
}

/**
 * Live read of the Ambassadors & Champions directory — mirrored from the
 * PKF_Directory Google Sheet by the sync-directory edge function. The sheet
 * itself gates visibility (RLS only exposes status = 'Approved' rows), so
 * this is a public, session-free read: a signed-out visitor sees the same
 * thing.
 */
export function useDirectory() {
  return useQuery({
    queryKey: ["directory-entries"],
    queryFn: async () => {
      const { data, error } = await supabasePublic
        .from("directory_entries")
        .select(
          "id, category, name, handle, designation, subcategory, country, region, image_url, bio, social_link, sort_order",
        )
        .order("sort_order", { ascending: true, nullsFirst: false })
        .order("name", { ascending: true });
      if (error) throw error;
      return (data ?? []).map(
        (e): DirectoryEntry => ({
          id: e.id,
          category: e.category,
          name: e.name,
          handle: e.handle,
          designation: e.designation,
          subcategory: e.subcategory,
          country: e.country,
          region: e.region,
          imageUrl: e.image_url,
          bio: e.bio,
          socialLink: e.social_link,
          sortOrder: e.sort_order,
        }),
      );
    },
  });
}
