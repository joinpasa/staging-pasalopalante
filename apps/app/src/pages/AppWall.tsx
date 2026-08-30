import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

import ReactionButton from "@/components/app/ReactionButton";
import { useAuth } from "@shared/contexts/AuthContext";
import { useActReactions, useMyRecentActs, useWallActs } from "@/hooks/useAppData";
import { actEmoji, modeLabel, timeAgo } from "@shared/lib/appActs";
import { cn } from "@shared/lib/utils";

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
  const [filter, setFilter] = useState<Filter>("Worldwide");

  const worldwide = useWallActs();
  const mine = useMyRecentActs(20);

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

  return (
    <div className="px-5 pt-6">
      <h1 className="font-sans text-3xl font-extrabold tracking-tight text-foreground">
        Wall of Kindness
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">Every act shared, from everywhere.</p>

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
          {posts.map((post) => (
            <article key={post.id} className="overflow-hidden rounded-3xl bg-app-surface">
              {post.photoUrl ? (
                <img
                  src={post.photoUrl}
                  alt={`Act of kindness shared by ${post.name}`}
                  loading="lazy"
                  className="h-44 w-full object-cover"
                />
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
          ))}
        </div>
      )}
    </div>
  );
}
