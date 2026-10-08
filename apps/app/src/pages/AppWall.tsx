import { useState } from "react";
import { Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ExternalLink, MoreVertical, Trash2 } from "lucide-react";

import ReactionButton from "@/components/app/ReactionButton";
import DeleteActDialog from "@/components/app/DeleteActDialog";
import { useAuth } from "@shared/contexts/AuthContext";
import { supabase } from "@shared/integrations/supabase/client";
import { useActReactions, useMovementTotals, useMyRecentActs, useWallActs } from "@/hooks/useAppData";
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

const nf = new Intl.NumberFormat("en-US");
const FILTERS = ["Worldwide", "My chain"] as const;
type Filter = (typeof FILTERS)[number];

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
  const [filter, setFilter] = useState<Filter>("Worldwide");
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const worldwide = useWallActs();
  const mine = useMyRecentActs(20);
  const { data: totals } = useMovementTotals();

  const showingMine = filter === "My chain";
  const posts = showingMine
    ? (mine.data ?? []).map((act) => ({ ...act, name: "You", photoUrl: null as string | null }))
    : (worldwide.data ?? []);
  const loading = showingMine ? mine.isLoading : worldwide.isLoading;

  const { reactions, toggle } = useActReactions(posts.map((p) => p.id));
  const onToggleReact = (actId: string) => {
    if (!user) {
      toast("Join to react to acts of kindness.");
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
        Wall of Kindness
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">Every act shared, from everywhere.</p>

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
          Pass Kindness Forward — the global movement
        </p>
      </div>
      <section className="mt-2 grid grid-cols-3 gap-3">
        {[
          { value: totals?.pledged ?? 0, label: "Acts pledged" },
          { value: totals?.actsToday ?? 0, label: "Logged today" },
          { value: totals?.actsAllTime ?? 0, label: "Acts all time" },
        ].map((stat) => (
          <div key={stat.label} className="overflow-hidden rounded-2xl bg-app-surface p-4">
            <p className={cn("break-all font-sans font-bold leading-tight text-foreground", statFontSizeClass(stat.value))}>
              {nf.format(stat.value)}
            </p>
            <p className="mt-2 text-xs leading-snug text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </section>

      <div className="mt-5 flex gap-2" role="tablist" aria-label="Wall filter">
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
                "rounded-full border px-4 py-2 text-sm font-medium transition-colors",
                active
                  ? "border-app-ink bg-app-ink text-app-surface"
                  : "border-border bg-app-surface text-foreground",
              )}
            >
              {option}
            </button>
          );
        })}
      </div>

      {showingMine && !user ? (
        <div className="mt-5 rounded-3xl bg-app-surface p-5 text-sm leading-relaxed text-muted-foreground">
          Your chain appears once you join.{" "}
          <Link to="/join" className="font-semibold text-app-coral">
            Join or log in →
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
            ? "You haven't logged an act yet. Your first one shows up here."
            : "No acts have been shared yet. Be the first to pass it forward."}
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
                  alt={`Act of kindness shared by ${post.name}`}
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
                    <span className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-app-surface shadow">
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
                    {actEmoji(post.tags, post.mode)}
                  </span>
                  <span className="absolute left-4 top-4 rounded-full bg-app-surface/85 px-3 py-1 text-xs font-semibold text-foreground">
                    {modeLabel(post.mode)}
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
                      {modeLabel(post.mode)} an act of kindness
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {timeAgo(post.createdAt)}
                  </span>
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
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>

                <p className="mt-3 text-sm leading-relaxed text-foreground">{post.description}</p>

                {post.tags.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {post.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-app-coral-tint px-2.5 py-1 text-xs font-bold text-app-coral"
                      >
                        {tag.replace(/_/g, " ")}
                      </span>
                    ))}
                  </div>
                )}

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
