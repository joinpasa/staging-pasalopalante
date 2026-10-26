import { useQuery } from "@tanstack/react-query";
import { supabasePublic } from "@shared/integrations/supabase/publicClient";
import {
  articles,
  broadcastOutlets,
  digitalNews,
  featuredUrls,
  otherOutletsReached,
  socialCoverage,
  videoAndPodcast,
  type MediaItem,
  type MediaLinkType,
} from "@/data/mediaCoverage";

export interface MediaCoverage {
  featured: MediaItem[];
  articles: MediaItem[];
  digitalNews: MediaItem[];
  videoAndPodcast: MediaItem[];
  socialCoverage: MediaItem[];
  broadcastOutlets: string[];
  otherOutletsReached: string[];
}

/** The hardcoded lists in data/mediaCoverage.ts — shown while the live read
 * is loading, and kept as the page's fallback if it fails or comes back
 * empty (e.g. before the PKF_Media sheet's first sync). */
export const staticMediaCoverage: MediaCoverage = {
  featured: [...videoAndPodcast, ...socialCoverage].filter((item) => featuredUrls.includes(item.url)),
  articles,
  digitalNews,
  videoAndPodcast,
  socialCoverage,
  broadcastOutlets,
  otherOutletsReached,
};

const TYPES: MediaLinkType[] = ["article", "youtube", "spotify", "facebook", "instagram", "x", "linkedin"];

type SectionKey = Exclude<keyof MediaCoverage, "featured">;

/** Sheet's Section column → page section. Matched loosely (case, spaces,
 * "&" ignored) so "Digital Press" / "digital news" / "Video & Podcast"
 * all land in the right place. */
const SECTION_ALIASES: Record<string, SectionKey> = {
  articles: "articles",
  article: "articles",
  digitalpress: "digitalNews",
  digitalnews: "digitalNews",
  digitalnewspress: "digitalNews",
  videos: "videoAndPodcast",
  video: "videoAndPodcast",
  videopodcast: "videoAndPodcast",
  social: "socialCoverage",
  socialmedia: "socialCoverage",
  broadcast: "broadcastOutlets",
  broadcastradio: "broadcastOutlets",
  otheroutlets: "otherOutletsReached",
  otheroutletsreached: "otherOutletsReached",
};

function sectionKey(section: string): SectionKey | undefined {
  return SECTION_ALIASES[section.toLowerCase().replace(/[^a-z]/g, "")];
}

/**
 * Live read of /media's press coverage — mirrored from the PKF_Media Google
 * Sheet by the sync-media edge function (only Approved rows are readable).
 * Public, session-free read since this must work for signed-out visitors.
 */
export function useMediaCoverage() {
  return useQuery({
    queryKey: ["media-entries"],
    queryFn: async (): Promise<MediaCoverage | null> => {
      const { data, error } = await supabasePublic
        .from("media_entries")
        .select("*")
        .order("sort_order", { ascending: true, nullsFirst: false })
        .order("id", { ascending: true });
      if (error) throw error;
      if (!data || data.length === 0) return null;

      const out: MediaCoverage = {
        featured: [],
        articles: [],
        digitalNews: [],
        videoAndPodcast: [],
        socialCoverage: [],
        broadcastOutlets: [],
        otherOutletsReached: [],
      };
      for (const e of data) {
        const key = sectionKey(e.section);
        if (!key) continue;
        if (key === "broadcastOutlets" || key === "otherOutletsReached") {
          out[key].push(e.outlet);
          continue;
        }
        // Cards need somewhere to link to; a row without a URL is skipped
        // rather than rendered as a dead card.
        if (!e.url) continue;
        const en = e.description_en ?? e.description_es;
        const es = e.description_es ?? e.description_en;
        const item: MediaItem = {
          outlet: e.outlet,
          title: e.title ?? undefined,
          note: e.note ?? undefined,
          description: en && es ? { en, es } : undefined,
          url: e.url,
          type: TYPES.includes(e.type as MediaLinkType) ? (e.type as MediaLinkType) : "article",
          imageUrl: e.image_url ?? undefined,
        };
        out[key].push(item);
        if (e.featured) out.featured.push(item);
      }
      return out;
    },
  });
}
