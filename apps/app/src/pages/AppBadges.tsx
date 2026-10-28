import { useMemo } from "react";
import { Flame } from "lucide-react";
import JoinGate from "@/components/app/JoinGate";
import PushToggle from "@/components/app/PushToggle";
import { useAuth } from "@shared/contexts/AuthContext";
import { useLanguage } from "@shared/contexts/LanguageContext";
import { badgeText } from "@shared/lib/badges";
import BadgeHint from "@shared/components/badges/BadgeHint";
import { useAppBadges, useAppMe, type AppBadge } from "@/hooks/useAppData";
import { cn } from "@shared/lib/utils";

/**
 * Same badge catalogue, stages and progress as the website's account page
 * (StreaksBadges.tsx). Every badge says exactly how to earn it — its
 * description is the rule ("Log “Gave” + “Compliment”"), shown in a bubble
 * on tap (or hover) — and climbs through stages instead of unlocking once.
 */
export default function AppBadges() {
  const { user } = useAuth();
  const { t, lang } = useLanguage();
  const { data: badges, isLoading } = useAppBadges();
  const { data: me } = useAppMe();

  const list = useMemo(() => badges ?? [], [badges]);
  const streakBadge = list.find((b) => b.kind === "streak");
  const actBadges = useMemo(() => list.filter((b) => b.kind !== "streak"), [list]);

  // The act badge closest to its next stage.
  const next = useMemo(() => {
    const ratio = (b: AppBadge) => (b.current ?? 0) / (b.target || 1);
    return actBadges
      .filter((b) => b.stage < b.maxStage && b.target)
      .sort((a, b) => ratio(b) - ratio(a))[0];
  }, [actBadges]);
  const progress = next ? Math.min(((next.current ?? 0) / (next.target || 1)) * 100, 100) : 0;
  const stageLabel = (stage: number) => t.appBadges.stage.replace("{stage}", String(stage));

  return (
    <div className="px-5 pt-6">
      <h1 className="font-sans text-3xl font-extrabold tracking-tight text-foreground">
        {t.account.streaksHeading}
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {t.appBadges.subtitle}
      </p>

      {!user && (
        <div className="mt-5">
          <JoinGate
            title={t.appBadges.startEarning}
            body={t.appBadges.startEarningBody}
          />
        </div>
      )}

      {user && me && (
        <section className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-4 rounded-2xl bg-app-surface p-4">
          <div className="flex items-center gap-2 rounded-xl bg-app-coral-tint px-4 py-3">
            <Flame size={24} className="text-app-coral" />
            <div>
              <div className="font-sans text-xl font-extrabold text-foreground">{me.dayStreak}</div>
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                {t.account.dayStreak}
              </div>
            </div>
          </div>
          <div className="text-sm text-muted-foreground">
            {t.account.longest}: <strong className="text-foreground">{me.longestStreak}</strong>
            <br />
            {t.account.totalActs}: <strong className="text-foreground">{me.actsPassedForward}</strong>
          </div>

          {streakBadge && (
            <BadgeHint
              text={badgeText(streakBadge, lang, "description")}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs leading-none",
                streakBadge.earned ? "bg-app-gold-tint text-foreground" : "bg-muted/50 text-app-hush",
              )}
            >
              <span className={cn("text-base", !streakBadge.earned && "grayscale opacity-60")}>
                {streakBadge.icon || "🏅"}
              </span>
              <span className="font-medium">{badgeText(streakBadge, lang, "name")}</span>
              {streakBadge.earned && (
                <span className="text-muted-foreground">· {stageLabel(streakBadge.stage)}</span>
              )}
              <span className="tabular-nums text-muted-foreground">
                · {streakBadge.current ?? 0} / {streakBadge.target}
              </span>
            </BadgeHint>
          )}
        </section>
      )}

      {user && next && (
        <section className="mt-4 rounded-2xl bg-app-surface p-4">
          <div className="flex items-baseline justify-between gap-3">
            <BadgeHint
              text={badgeText(next, lang, "description")}
              className="min-w-0 truncate text-start text-sm font-semibold text-foreground"
            >
              {t.appBadges.nextMilestone} · {next.icon} {badgeText(next, lang, "name")} · {stageLabel(next.stage + 1)}
            </BadgeHint>
            <p className="shrink-0 text-sm font-bold text-app-coral">
              {next.current ?? 0} / {next.target}
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
            <div key={i} className="h-36 animate-pulse rounded-2xl bg-app-surface" />
          ))}
        </div>
      ) : (
        <ul className="mt-4 grid grid-cols-3 gap-3">
          {actBadges.map((badge) => (
            <li key={badge.id}>
              <BadgeHint
                text={badgeText(badge, lang, "description")}
                className={cn(
                  "flex h-full w-full flex-col rounded-2xl p-3 text-center",
                  badge.earned ? "bg-app-surface" : "bg-app-surface/50",
                )}
              >
                <span
                  className={cn(
                    "mx-auto flex h-14 w-14 items-center justify-center rounded-full text-2xl",
                    !badge.earned && "grayscale opacity-50",
                  )}
                >
                  {badge.icon || "🏅"}
                </span>
                <span
                  className={cn(
                    "mt-2 block text-xs font-bold leading-tight",
                    badge.earned ? "text-foreground" : "text-app-hush",
                  )}
                >
                  {badgeText(badge, lang, "name")}
                </span>
                {badge.earned && (
                  <span className="mt-1 block text-[10.5px] font-semibold text-app-coral">
                    {stageLabel(badge.stage)}
                  </span>
                )}
                {user && badge.target ? (
                  <span className="mt-auto block pt-1.5 text-[11px] tabular-nums text-muted-foreground">
                    {badge.current ?? 0} / {badge.target}
                  </span>
                ) : null}
              </BadgeHint>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-5 pb-2 text-center text-xs text-muted-foreground">
        {t.appBadges.onWebsite}{" "}
        <a href="https://pasalopalante.com/wall" className="underline">
          pasalopalante.com/wall
        </a>
      </p>
    </div>
  );
}
