import JoinGate from "@/components/app/JoinGate";
import PushToggle from "@/components/app/PushToggle";
import { useAuth } from "@shared/contexts/AuthContext";
import { useAppBadges, useAppMe } from "@/hooks/useAppData";
import { cn } from "@shared/lib/utils";

export default function AppBadges() {
  const { user } = useAuth();
  const { data: badges, isLoading } = useAppBadges();
  const { data: me } = useAppMe();

  const list = badges ?? [];
  const next = list.find((b) => !b.earned && b.target && b.target > 0);
  const nextCurrent = next?.current ?? me?.actsPassedForward ?? 0;
  const nextTarget = next?.target ?? 1;
  const progress = Math.min((nextCurrent / nextTarget) * 100, 100);

  return (
    <div className="px-5 pt-6">
      <h1 className="font-sans text-3xl font-extrabold tracking-tight text-foreground">
        Milestones
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Earned by showing up, not by competing.
      </p>

      {!user && (
        <div className="mt-5">
          <JoinGate
            title="Start earning badges"
            body="Join with a commitment to acts of kindness and your milestones start filling in."
          />
        </div>
      )}

      {user && next && (
        <section className="mt-5 rounded-2xl bg-app-surface p-4">
          <div className="flex items-baseline justify-between gap-3">
            <p className="truncate text-sm font-semibold text-foreground">
              Next milestone · {next.name}
            </p>
            <p className="shrink-0 text-sm font-bold text-app-coral">
              {nextCurrent} / {nextTarget}
            </p>
          </div>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-app-coral" style={{ width: `${progress}%` }} />
          </div>
        </section>
      )}

      {user && <PushToggle />}

      {isLoading ? (
        <div className="mt-4 grid grid-cols-3 gap-3" aria-busy="true">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-2xl bg-app-surface" />
          ))}
        </div>
      ) : (
        <ul className="mt-4 grid grid-cols-3 gap-3">
          {list.map((badge) => (
            <li
              key={badge.id}
              className={cn(
                "rounded-2xl p-3 text-center",
                badge.earned ? "bg-app-surface" : "bg-app-surface/50",
              )}
            >
              <div
                className={cn(
                  "mx-auto flex h-14 w-14 items-center justify-center rounded-full font-sans text-lg font-bold",
                  badge.earned ? "bg-app-gold-tint text-app-gold" : "bg-muted text-app-hush",
                )}
              >
                {badge.name.slice(0, 1).toUpperCase()}
              </div>
              <p
                className={cn(
                  "mt-2.5 text-xs font-bold leading-tight",
                  badge.earned ? "text-foreground" : "text-app-hush",
                )}
              >
                {badge.name}
              </p>
              <p
                className={cn(
                  "mt-1.5 line-clamp-3 text-[11px]",
                  badge.earned ? "text-muted-foreground" : "text-app-hush",
                )}
              >
                {badge.target
                  ? `${badge.current ?? 0} / ${badge.target}`
                  : (badge.description ?? "")}
              </p>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-5 pb-2 text-center text-xs text-muted-foreground">
        Your badges also appear on{" "}
        <a href="https://pasalopalante.com/wall" className="underline">
          pasalopalante.com/wall
        </a>
      </p>
    </div>
  );
}
