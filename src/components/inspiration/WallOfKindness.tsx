import { useEffect, useMemo, useRef, useState } from "react";
import { Heart, Loader2 } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { pickCardGradient } from "@/lib/cardGradients";
import WallCard, { WallMode } from "./WallCard";
import WallDialogBody from "./WallDialogBody";

import {
  parseYouTubeId,
  getYouTubeThumbnail,
  getYouTubeEmbedUrl,
} from "@/lib/youtube";

type TabValue = "all" | WallMode;
type SortValue = "liked" | "recent";

interface ActRow {
  id: string;
  description: string | null;
  first_name: string | null;
  photo_paths: string[] | null;
  video_url: string | null;
  created_at: string;
  mode: string;
  language: string | null;
}


interface ActWithCount extends ActRow {
  reaction_count: number;
  reacted: boolean;
}

const PUBLIC_BUCKET = "kindness-photos";
const PAGE_SIZE = 9;
const LIKED_CANDIDATE_BATCH = 120;

function publicPhotoUrl(path: string) {
  return supabase.storage.from(PUBLIC_BUCKET).getPublicUrl(path).data.publicUrl;
}

export default function WallOfKindness() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [tab, setTab] = useState<TabValue>("all");
  const [sort, setSort] = useState<SortValue>("liked");
  const [items, setItems] = useState<ActWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [openAct, setOpenAct] = useState<ActWithCount | null>(null);

  // For "recent" sort we use a DB offset.
  // For "liked" sort we hold a buffer of merged candidates sorted by hearts
  // and slice 9 at a time, fetching another batch when buffer runs low.
  const recentOffsetRef = useRef(0);
  const likedBufferRef = useRef<ActWithCount[]>([]);
  const likedFetchedOffsetRef = useRef(0);
  const likedDoneRef = useRef(false);

  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Reset state whenever tab or sort changes
  useEffect(() => {
    setItems([]);
    setHasMore(true);
    recentOffsetRef.current = 0;
    likedBufferRef.current = [];
    likedFetchedOffsetRef.current = 0;
    likedDoneRef.current = false;
    loadMore(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, sort, user]);

  function applyModeFilter<T extends { from: any }>(qb: any) {
    if (tab !== "all") qb = qb.eq("mode", tab);
    return qb;
  }

  async function attachCounts(rows: ActRow[]): Promise<ActWithCount[]> {
    const ids = rows.map((r) => r.id);
    let counts: Record<string, number> = {};
    let myReactions = new Set<string>();
    if (ids.length) {
      const { data: rx } = await supabase.rpc("reaction_counts", { _act_ids: ids });
      (rx ?? []).forEach((r: { act_id: string; count: number }) => {
        counts[r.act_id] = Number(r.count) || 0;
      });
      if (user) {
        const { data: mine } = await supabase.rpc("my_reactions", { _act_ids: ids });
        (mine ?? []).forEach((r: { act_id: string }) => myReactions.add(r.act_id));
      }
    }
    return rows.map((a) => ({
      ...a,
      reaction_count: counts[a.id] ?? 0,
      reacted: myReactions.has(a.id),
    }));
  }

  async function loadMore(initial = false) {
    if (initial) {
      setLoading(true);
    } else {
      if (loadingMore || !hasMore) return;
      setLoadingMore(true);
    }
    try {
      if (sort === "recent") {
        const from = recentOffsetRef.current;
        const to = from + PAGE_SIZE - 1;
        let q = supabase
          .from("acts_of_kindness")
          .select("id, description, first_name, photo_paths, video_url, created_at, mode, language")
          .eq("status", "published")
          .not("description", "is", null)
          .neq("description", "");
        q = applyModeFilter(q);
        const { data, error } = await q
          .order("created_at", { ascending: false })
          .range(from, to);
        if (error) throw error;
        const merged = await attachCounts((data as ActRow[]) ?? []);
        recentOffsetRef.current += merged.length;
        setItems((prev) => dedupe([...prev, ...merged]));
        if (!data || data.length < PAGE_SIZE) setHasMore(false);
      } else {
        // liked sort — fill buffer until we have ≥ PAGE_SIZE or source exhausted
        while (likedBufferRef.current.length < PAGE_SIZE && !likedDoneRef.current) {
          const from = likedFetchedOffsetRef.current;
          const to = from + LIKED_CANDIDATE_BATCH - 1;
          let q = supabase
            .from("acts_of_kindness")
            .select("id, description, first_name, photo_paths, video_url, created_at, mode, language")
            .eq("status", "published")
            .not("description", "is", null)
            .neq("description", "");
          q = applyModeFilter(q);
          const { data, error } = await q
            .order("created_at", { ascending: false })
            .range(from, to);
          if (error) throw error;
          const rows = (data as ActRow[]) ?? [];
          likedFetchedOffsetRef.current += rows.length;
          if (rows.length < LIKED_CANDIDATE_BATCH) likedDoneRef.current = true;
          const merged = await attachCounts(rows);
          likedBufferRef.current = [...likedBufferRef.current, ...merged];
        }
        // Sort full buffer by hearts desc, then recent desc
        likedBufferRef.current.sort(
          (a, b) =>
            b.reaction_count - a.reaction_count ||
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        );
        const next = likedBufferRef.current.splice(0, PAGE_SIZE);
        setItems((prev) => dedupe([...prev, ...next]));
        if (next.length < PAGE_SIZE && likedDoneRef.current) setHasMore(false);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }

  function dedupe(arr: ActWithCount[]) {
    const seen = new Set<string>();
    return arr.filter((a) => (seen.has(a.id) ? false : (seen.add(a.id), true)));
  }

  // Infinite scroll
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore(false);
      },
      { rootMargin: "400px" },
    );
    io.observe(el);
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, hasMore, loadingMore, sort, tab]);

  async function toggleReaction(act: ActWithCount) {
    if (!user) {
      toast(t.inspiration.signInToReact);
      return;
    }
    const wasReacted = act.reacted;
    setItems((prev) =>
      prev.map((p) =>
        p.id === act.id
          ? { ...p, reacted: !wasReacted, reaction_count: p.reaction_count + (wasReacted ? -1 : 1) }
          : p,
      ),
    );
    if (wasReacted) {
      await supabase
        .from("act_reactions")
        .delete()
        .eq("act_id", act.id)
        .eq("user_id", user.id)
        .eq("reaction", "heart");
    } else {
      const { error } = await supabase
        .from("act_reactions")
        .insert({ act_id: act.id, user_id: user.id, reaction: "heart" });
      if (error && !String(error.message).includes("duplicate")) {
        setItems((prev) =>
          prev.map((p) =>
            p.id === act.id
              ? { ...p, reacted: wasReacted, reaction_count: p.reaction_count + (wasReacted ? 1 : -1) }
              : p,
          ),
        );
      }
    }
  }

  const dialogYouTubeId = useMemo(
    () => parseYouTubeId(openAct?.video_url),
    [openAct],
  );

  return (
    <section className="section-padding pt-0 pb-20 md:pb-28 lg:pb-36">
      <div className="max-w-6xl mx-auto">
        {/* Sticky control bar */}
        <div className="sticky top-20 z-30 -mx-4 px-4 py-2 sm:py-3 mb-6 bg-warm-cream/95 backdrop-blur-md border-b border-foreground/5">
          <div className="max-w-5xl mx-auto">
            {/* Mobile: 2 rows */}
            <div className="sm:hidden space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold tracking-wide uppercase text-warm-terracotta">
                  {t.inspiration.wallHeading}
                </span>
                <Select value={sort} onValueChange={(v) => setSort(v as SortValue)}>
                  <SelectTrigger className="h-8 w-36 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="liked">{t.inspiration.sortMostLiked}</SelectItem>
                    <SelectItem value="recent">{t.inspiration.sortMostRecent}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Tabs value={tab} onValueChange={(v) => setTab(v as TabValue)} className="w-full">
                <TabsList className="grid w-full grid-cols-4 h-9 items-center">
                  <TabsTrigger value="all" className="text-[11px] px-1 h-7">{t.inspiration.tabAll}</TabsTrigger>
                  <TabsTrigger value="performed" className="text-[11px] px-1 h-7">{t.inspiration.tabGiven}</TabsTrigger>
                  <TabsTrigger value="received" className="text-[11px] px-1 h-7">{t.inspiration.tabReceived}</TabsTrigger>
                  <TabsTrigger value="witnessed" className="text-[11px] px-1 h-7">{t.inspiration.tabSeen}</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* Desktop: 1 row */}
            <div className="hidden sm:flex items-center gap-4">
              <span className="text-base font-bold tracking-wide uppercase text-warm-terracotta shrink-0">
                {t.inspiration.wallHeading}
              </span>
              <div className="flex-1 flex justify-center">
                <Tabs value={tab} onValueChange={(v) => setTab(v as TabValue)} className="w-auto">
                  <TabsList className="grid grid-cols-4 h-10 items-center">
                    <TabsTrigger value="all" className="text-sm px-3 h-8">{t.inspiration.tabAll}</TabsTrigger>
                    <TabsTrigger value="performed" className="text-sm px-3 h-8">{t.inspiration.tabGiven}</TabsTrigger>
                    <TabsTrigger value="received" className="text-sm px-3 h-8">{t.inspiration.tabReceived}</TabsTrigger>
                    <TabsTrigger value="witnessed" className="text-sm px-3 h-8">{t.inspiration.tabSeen}</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              <Select value={sort} onValueChange={(v) => setSort(v as SortValue)}>
                <SelectTrigger className="h-9 w-44 text-sm shrink-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="liked">{t.inspiration.sortMostLiked}</SelectItem>
                  <SelectItem value="recent">{t.inspiration.sortMostRecent}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="animate-spin text-primary" size={28} />
          </div>
        ) : items.length === 0 ? (
          <p className="text-center text-muted-foreground py-12">{t.inspiration.wallEmpty}</p>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {items.map((a) => {
                const photoUrl =
                  a.photo_paths && a.photo_paths.length > 0
                    ? publicPhotoUrl(a.photo_paths[0])
                    : null;
                const ytId = parseYouTubeId(a.video_url);
                const videoThumbUrl = ytId ? getYouTubeThumbnail(ytId) : null;
                return (
                  <WallCard
                    key={a.id}
                    id={a.id}
                    description={a.description}
                    firstName={a.first_name}
                    mode={(a.mode as WallMode) ?? "performed"}
                    language={a.language}
                    photoUrl={photoUrl}
                    videoThumbUrl={videoThumbUrl}
                    reactionCount={a.reaction_count}
                    reacted={a.reacted}
                    onToggleReact={() => toggleReaction(a)}
                    onOpen={() => setOpenAct(a)}
                  />

                );
              })}
            </div>
            <div ref={sentinelRef} className="h-10" />
            {loadingMore && (
              <div className="flex justify-center py-6">
                <Loader2 className="animate-spin text-primary" size={22} />
              </div>
            )}
            {!hasMore && items.length > 0 && (
              <p className="text-center text-xs text-muted-foreground py-6">
                {t.inspiration.wallEnd}
              </p>
            )}
          </>
        )}
      </div>

      <Dialog open={!!openAct} onOpenChange={(o) => !o && setOpenAct(null)}>
        <DialogContent
          className="max-w-2xl p-0 overflow-hidden border-0"
          style={{ background: pickCardGradient(openAct?.id) }}
        >
          {openAct && (() => {
            const live = items.find((i) => i.id === openAct.id) ?? openAct;
            const photo =
              live.photo_paths && live.photo_paths.length > 0
                ? publicPhotoUrl(live.photo_paths[0])
                : null;
            return (
              <div className="flex flex-col max-h-[85vh]">
                {dialogYouTubeId ? (
                  <div className="w-full aspect-video bg-black">
                    <iframe
                      src={getYouTubeEmbedUrl(dialogYouTubeId)}
                      className="w-full h-full"
                      title="Video"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                ) : photo ? (
                  <div className="w-full flex items-center justify-center bg-black/5" style={{ maxHeight: "55vh" }}>
                    <img
                      src={photo}
                      alt=""
                      className="max-w-full max-h-[55vh] w-auto h-auto object-contain"
                    />
                  </div>
                ) : null}
                <WallDialogBody
                  id={live.id}
                  description={live.description}
                  firstName={live.first_name}
                  language={live.language}
                  reactionCount={live.reaction_count}
                  reacted={live.reacted}
                  anonymousLabel={t.inspiration.anonymous}
                  onToggleReact={() => toggleReaction(live)}
                />

              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </section>
  );
}
