import { useMemo } from "react";
import { Flame, Check } from "lucide-react";
import JoinGate from "@/components/app/JoinGate";
import PushToggle from "@/components/app/PushToggle";
import { useAuth } from "@shared/contexts/AuthContext";
import { useLanguage } from "@shared/contexts/LanguageContext";
import { useAppBadges, useAppMe, type AppBadge } from "@/hooks/useAppData";
import { cn } from "@shared/lib/utils";

const localized = (b: AppBadge, lang: string, field: "name" | "description") => {
  const map: Record<string, string | null | undefined> = {
    es: field === "name" ? b.name_es : b.description_es,
    fr: field === "name" ? b.name_fr : b.description_fr,
    de: field === "name" ? b.name_de : b.description_de,
  };
  return map[lang] || (field === "name" ? b.name : b.description) || "";
};

/**
 * Same badge catalogue, categories (streak badges vs. act-type badges), and
 * icons as the website's account page (StreaksBadges.tsx) — previously this
 * showed every badge in one flat grid with a generic letter avatar instead
 * of each badge's real icon, so it looked like a different, less complete
 * feature than the website's version even though the underlying data was
 * the same.
 */
export default function AppBadges() {
  const { user } = useAuth();
  const { t, lang } = useLanguage();
  const { data: badges, isLoading } = useAppBadges();
  const { data: me } = useAppMe();

  const list = badges ?? [];
  const streakBadges = useMemo(() => list.filter((b) => b.kind !== "act_type"), [list]);
  const actBadges = useMemo(() => list.filter((b) => b.kind === "act_type"), [list]);

  const next = actBadges.find((b) => !b.earned && b.target && b.target > 0);
  const nextCurrent = next?.current ?? me?.actsPassedForward ?? 0;
  const nextTarget = next?.target ?? 1;
  const progress = Math.min((nextCurrent / nextTarget) * 100, 100);

  return (
    <div className="px-5 pt-6">
      <h1 className="font-sans text-3xl font-extrabold tracking-tight text-foreground">
        {t.account.streaksHeading}
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

          {streakBadges.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              {streakBadges.map((b) => (
                <span
                  key={b.id}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs leading-none",
                    b.earned ? "bg-app-gold-tint text-foreground" : "bg-muted/50 text-app-hush",
                  )}
                  title={localized(b, lang, "description")}
                >
                  <span className={cn("text-base", !b.earned && "grayscale opacity-60")}>
                    {b.icon || "🏅"}
                  </span>
                  <span className="font-medium">{localized(b, lang, "name")}</span>
                </span>
              ))}
            </div>
          )}
        </section>
      )}

      {user && next && (
        <section className="mt-4 rounded-2xl bg-app-surface p-4">
          <div className="flex items-baseline justify-between gap-3">
            <p className="truncate text-sm font-semibold text-foreground">
              Next milestone · {localized(next, lang, "name")}
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
          {actBadges.map((badge) => (
            <li
              key={badge.id}
              className={cn(
                "rounded-2xl p-3 text-center",
                badge.earned ? "bg-app-surface" : "bg-app-surface/50",
              )}
              title={localized(badge, lang, "description")}
            >
              <div
                className={cn(
                  "mx-auto flex h-14 w-14 items-center justify-center rounded-full text-2xl",
                  !badge.earned && "grayscale opacity-50",
                )}
              >
                {badge.icon || "🏅"}
              </div>
              <p
                className={cn(
                  "mt-2.5 text-xs font-bold leading-tight",
                  badge.earned ? "text-foreground" : "text-app-hush",
                )}
              >
                {localized(badge, lang, "name")}
              </p>
              <p
                className={cn(
                  "mt-1.5 flex items-center justify-center gap-1 text-[11px] tabular-nums",
                  badge.earned ? "text-muted-foreground" : "text-app-hush",
                )}
              >
                {badge.earned && <Check size={11} className="text-app-coral" />}
                {badge.target ? `${badge.current ?? 0} / ${badge.target}` : null}
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
