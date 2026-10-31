import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ExternalLink, Heart, Hourglass, MoreVertical, Trash2 } from "lucide-react";

import ReactionButton from "@/components/app/ReactionButton";
import DeleteActDialog from "@/components/app/DeleteActDialog";
import TranslateButton from "@/components/app/TranslateButton";
import ActBadgeTags from "@shared/components/badges/ActBadgeTags";
import { useActTranslations } from "@/hooks/useActTranslations";
import { useAuth } from "@shared/contexts/AuthContext";
import { supabase } from "@shared/integrations/supabase/client";
import { useLanguage } from "@shared/contexts/LanguageContext";
import {
  useActReactions,
  useAppMe,
  useCountryWallActs,
  useMovementTotals,
  useMyRecentActs,
  useWallActs,
} from "@/hooks/useAppData";
import { actEmoji, modeLabel, timeAgo } from "@shared/lib/appActs";
import { cn } from "@shared/lib/utils";
import { parseYouTubeId, getYouTubeThumbnail } from "@shared/lib/youtube";
import { detectSocialLink } from "@shared/lib/socialLinks";
import { SOCIAL_LINK_ICONS } from "@shared/components/share/SocialLinkChip";
import { statFontSizeClass } from "@shared/lib/statFontSize";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@shared/components/ui/dropdown-menu";

const FILTERS = ["Worldwide", "My country", "My chain"] as const;
type Filter = (typeof FILTERS)[number];
type Sort = "recent" | "liked";

const PAGE_SIZE = 20;
// "Most liked" ranks the most recent acts by hearts — same idea as the
// website's Wall, which also picks from a recent candidate batch.
const LIKED_CANDIDATES = 100;

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export default function AppWall() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { t, lang } = useLanguage();
  const nf = new Intl.NumberFormat(lang);
  const [filter, setFilter] = useState<Filter>("Worldwide");
  const [sort, setSort] = useState<Sort>("recent");
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const limit = sort === "liked" ? LIKED_CANDIDATES : PAGE_SIZE;
  const worldwide = useWallActs(limit);
  const mine = useMyRecentActs(limit);
  const { data: me, isLoading: meLoading } = useAppMe();
  const country = me?.country ?? null;
  const inCountry = useCountryWallActs(filter === "My country" ? country : null, limit);
  const { data: totals } = useMovementTotals();

  const showingMine = filter === "My chain";
  const showingCountry = filter === "My country";
  const candidates = showingMine
    ? (mine.data ?? []).map((act) => ({ ...act, name: t.appWall.you, photoUrl: null as string | null }))
    : showingCountry
    ? (inCountry.data ?? [])
    : (worldwide.data ?? []);
  const { reactions, ready: reactionsReady, toggle } = useActReactions(candidates.map((p) => p.id));

  // The liked order is fixed once per candidate list, so tapping a heart
  // doesn't make the card jump to a new position under the user's finger.
  const candidateKey = candidates.map((p) => p.id).join(",");
  const [likedOrder, setLikedOrder] = useState<{ key: string; ids: string[] } | null>(null);
  useEffect(() => {
    if (sort !== "liked" || !reactionsReady || likedOrder?.key === candidateKey) return;
    const ids = [...candidates]
      .sort(
        (a, b) =>
          (reactions[b.id]?.count ?? 0) - (reactions[a.id]?.count ?? 0) ||
          Date.parse(b.createdAt) - Date.parse(a.createdAt),
      )
      .slice(0, PAGE_SIZE)
      .map((p) => p.id);
    setLikedOrder({ key: candidateKey, ids });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sort, reactionsReady, candidateKey]);
  const likedReady = likedOrder?.key === candidateKey;

  const byId = new Map(candidates.map((p) => [p.id, p] as const));
  const posts =
    sort === "liked"
      ? likedReady
        ? likedOrder.ids.map((id) => byId.get(id)).filter((p): p is (typeof candidates)[number] => !!p)
        : []
      : candidates.slice(0, PAGE_SIZE);
  const listLoading = showingMine
    ? mine.isLoading
    : showingCountry
    ? meLoading || (!!country && inCountry.isLoading)
    : worldwide.isLoading;
  const loading = listLoading || (sort === "liked" && candidates.length > 0 && !likedReady);
  const translations = useActTranslations();
  const onToggleReact = (actId: string) => {
    if (!user) {
      toast(t.appWall.joinToReact);
      return;
    }
    void toggle(actId);
  };

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const { data, error } = await supabase.functions.invoke("delete-act", {
        body: { act_id: deleteTarget },
      });
      const failure = (data as { error?: string } | null)?.error ?? error?.message;
      if (failure) {
        toast.error(failure);
        return;
      }
      toast.success("Act deleted.");
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ["app", "my-acts"] });
      queryClient.invalidateQueries({ queryKey: ["app", "me"] });
      queryClient.invalidateQueries({ queryKey: ["app", "wall"] });
      queryClient.invalidateQueries({ queryKey: ["app", "badges"] });
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="px-5 pt-6">
      <h1 className="font-sans text-3xl font-extrabold tracking-tight text-foreground">
      {t.appWall.title}
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">{t.appWall.subtitle}</p>

      {/* The worldwide movement totals — otherwise only visible on Home to
          a signed-out visitor, and replaced there by personal stats once
          someone's signed in. The Wall is where anyone, logged in or not,
          comes to see the movement as a whole, so it belongs here too. */}
      <div className="mt-5 flex items-center gap-1.5">
        <img
          src="/logo-PKF-icon.png"
          srcSet="/logo-PKF-icon.png 1x, /logo-PKF-icon@2x.png 2x"
          alt=""
          className="h-4 w-4 object-contain"
        />
        <p className="text-xs font-semibold tracking-wide text-muted-foreground">
          {t.appWall.movementLabel}
        </p>
      </div>
      <section className="mt-2 grid grid-cols-3 gap-3">
        {[
          { value: totals?.pledged ?? 0, label: t.appCommon.actsPledged },
          { value: totals?.actsToday ?? 0, label: t.appCommon.loggedToday },
          { value: totals?.actsAllTime ?? 0, label: t.appCommon.actsAllTime },
        ].map((stat) => (
          <div key={stat.label} className="overflow-hidden rounded-2xl bg-app-surface p-4">
            <p className={cn("break-all font-sans font-bold leading-tight text-foreground", statFontSizeClass(stat.value))}>
              {nf.format(stat.value)}
            </p>
            <p className="mt-2 text-xs leading-snug text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </section>

      {/* Three filter chips + the sort toggle share one row, even on small phones. */}
      <div className="mt-5 flex items-center gap-1.5">
        <div className="flex min-w-0 flex-1 gap-1.5" role="tablist" aria-label={t.appWall.filterAria}>
          {FILTERS.map((option) => {
            const active = option === filter;
            return (
              <button
                key={option}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setFilter(option)}
                className={cn(
                  "min-w-0 flex-auto truncate rounded-full border px-2 py-2 text-xs font-medium transition-colors",
                  active
                    ? "border-app-ink bg-app-ink text-app-surface"
                    : "border-border bg-app-surface text-foreground",
                )}
              >
                {option === "Worldwide"
                  ? t.appWall.worldwide
                  : option === "My country"
                  ? t.appWall.myCountry
                  : t.appWall.myChain}
              </button>
            );
          })}
        </div>
        {/* Sort toggle — icon-only chip; the icon shows the active order
            (hourglass = most recent, heart = most liked) and a short toast
            names it on each tap. */}
        <button
          type="button"
          onClick={() => {
            const next: Sort = sort === "recent" ? "liked" : "recent";
            setSort(next);
            toast(next === "liked" ? t.appWall.sortLikedToast : t.appWall.sortRecentToast, {
              id: "wall-sort",
              duration: 1500,
            });
          }}
          aria-label={sort === "recent" ? t.inspiration.sortMostRecent : t.inspiration.sortMostLiked}
          title={sort === "recent" ? t.inspiration.sortMostRecent : t.inspiration.sortMostLiked}
          className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full border border-app-gold bg-app-gold/35 text-foreground transition-colors"
        >
          {sort === "recent" ? (
            <Hourglass size={16} aria-hidden="true" />
          ) : (
            <Heart size={16} className="fill-current" aria-hidden="true" />
          )}
        </button>
      </div>

      {(showingMine || showingCountry) && !user ? (
        <div className="mt-5 rounded-3xl bg-app-surface p-5 text-sm leading-relaxed text-muted-foreground">
          {showingMine ? t.appWall.yourChainAppears : t.appWall.yourCountryAppears}{" "}
          <Link to="/join" className="font-semibold text-app-coral">
            {t.appWall.joinOrLogin}
          </Link>
        </div>
      ) : showingCountry && !meLoading && !country ? (
        <div className="mt-5 rounded-3xl bg-app-surface p-5 text-sm leading-relaxed text-muted-foreground">
          {t.appWall.noCountrySet}{" "}
          <Link to="/account" className="font-semibold text-app-coral">
            {t.appWall.addCountry}
          </Link>
        </div>
      ) : loading ? (
        <div className="mt-5 space-y-4" aria-busy="true">
          {[0, 1].map((i) => (
            <div key={i} className="h-40 animate-pulse rounded-3xl bg-app-surface" />
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="mt-5 rounded-3xl bg-app-surface p-5 text-sm leading-relaxed text-muted-foreground">
          {showingMine
            ? t.appWall.noPersonalActs
            : showingCountry
            ? t.appWall.noCountryActs.replace("{country}", country ?? "")
            : t.appWall.noSharedActs}
        </div>
      ) : (
        <div className="mt-5 space-y-5">
          {posts.map((post) => {
            const ytId = parseYouTubeId(post.videoUrl);
            const socialLink = ytId ? null : detectSocialLink(post.videoUrl);
            // YouTube always has a thumbnail (hotlinked from img.youtube.com);
            // the other platforms only have one when fetch-link-preview
            // managed to scrape an og:image from the post — a private post
            // or a platform that blocked the fetch just falls back to the
            // icon tile below instead.
            const linkPreviewImage = ytId ? getYouTubeThumbnail(ytId) : socialLink ? post.linkPreviewImage : null;
            const linkUrl = ytId ? post.videoUrl : socialLink?.url ?? null;
            const SocialIcon = ytId ? null : socialLink ? SOCIAL_LINK_ICONS[socialLink.platform] : null;
            const linkLabel = ytId ? "YouTube" : socialLink?.label ?? null;

            return (
            <article key={post.id} className="overflow-hidden rounded-3xl bg-app-surface">
              {post.photoUrl ? (
                <img
                  src={post.photoUrl}
                  alt={t.appWall.photoAlt.replace("{name}", post.name)}
                  loading="lazy"
                  className="h-44 w-full object-cover"
                />
              ) : linkUrl && linkPreviewImage ? (
                <a href={linkUrl} target="_blank" rel="noopener noreferrer" className="relative block">
                  <img
                    src={linkPreviewImage}
                    alt=""
                    loading="lazy"
                    className="h-44 w-full object-cover"
                  />
                  {SocialIcon && (
                    <span className="absolute end-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-app-surface shadow">
                      <SocialIcon size={14} className="text-app-coral" />
                    </span>
                  )}
                </a>
              ) : linkUrl ? (
                <a
                  href={linkUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-28 flex-col items-center justify-center gap-1.5 bg-gradient-to-br from-app-coral-tint to-app-teal-tint"
                >
                  {SocialIcon && <SocialIcon size={24} className="text-app-coral" />}
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-foreground">
                    View on {linkLabel}
                    <ExternalLink size={11} />
                  </span>
                </a>
              ) : (
                <div className="relative flex h-28 items-center justify-center bg-gradient-to-br from-app-coral-tint to-app-teal-tint">
                  <span className="text-4xl" aria-hidden="true">
                    {actEmoji(post.actType, post.mode)}
                  </span>
                  <span className="absolute start-4 top-4 rounded-full bg-app-surface/85 px-3 py-1 text-xs font-semibold text-foreground">
                    {modeLabel(post.mode, t.appCommon)}
                  </span>
                </div>
              )}

              <div className="p-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-app-coral-tint text-[11px] font-bold text-app-coral">
                    {initials(post.name) || "PP"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-foreground">{post.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {t.appWall.modeOfKindness.replace("{mode}", modeLabel(post.mode, t.appCommon))}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-0.5">
                    <span className="text-xs text-muted-foreground">
                      {timeAgo(post.createdAt, t.appCommon, lang)}
                    </span>
                    {translations.canTranslate(post) && (
                      <TranslateButton
                        translated={translations.isTranslated(post.id)}
                        loading={translations.isLoading(post.id)}
                        onClick={() => translations.toggle(post)}
                      />
                    )}
                  </div>
                  {showingMine && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          aria-label="Act options"
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted-foreground"
                        >
                          <MoreVertical size={16} />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => setDeleteTarget(post.id)}
                        >
                          <Trash2 className="me-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>

                <p className="mt-3 text-sm leading-relaxed text-foreground">{translations.textFor(post)}</p>

                <ActBadgeTags
                  mode={post.mode}
                  actType={post.actType}
                  className="mt-4"
                  tagClassName="bg-app-coral-tint text-app-coral"
                />

                <div className="mt-4 flex items-center border-t border-border pt-3.5">
                  <ReactionButton
                    count={reactions[post.id]?.count ?? 0}
                    reacted={reactions[post.id]?.reacted ?? false}
                    onToggle={() => onToggleReact(post.id)}
                  />
                </div>
              </div>
            </article>
            );
          })}
        </div>
      )}

      <DeleteActDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        onConfirm={handleDelete}
        busy={deleting}
      />
    </div>
  );
}
