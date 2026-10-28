import { useEffect, useMemo, useState } from "react";
import { supabase } from "@shared/integrations/supabase/client";
import { useLanguage } from "@shared/contexts/LanguageContext";
import { Skeleton } from "@shared/components/ui/skeleton";
import { badgeText, fetchBadgeCatalogue, type BadgeDef } from "@shared/lib/badges";
import BadgeHint from "@shared/components/badges/BadgeHint";
import { Flame } from "lucide-react";

interface Progress {
  badge_id: string;
  current_count: number;
  target: number;
  stage: number;
  max_stage: number;
}

const StreaksBadges = ({ userId }: { userId: string }) => {
  const { t, lang } = useLanguage();
  const [streak, setStreak] = useState<{ current_streak: number; longest_streak: number; total_acts: number } | null>(null);
  const [badges, setBadges] = useState<BadgeDef[] | null>(null);
  const [stages, setStages] = useState<Record<string, number>>({});
  const [progress, setProgress] = useState<Record<string, Progress>>({});
  const [justEarned, setJustEarned] = useState<Set<string>>(new Set());

  useEffect(() => {
    (async () => {
      const { data: s } = await supabase.rpc("user_streak", { _user_id: userId });
      if (s && s[0]) setStreak(s[0]);
      else setStreak({ current_streak: 0, longest_streak: 0, total_acts: 0 });

      try {
        setBadges(await fetchBadgeCatalogue());
      } catch {
        setBadges([]);
      }

      const { data: p } = await supabase.rpc("act_badge_progress", { _user_id: userId });
      const byId: Record<string, Progress> = {};
      for (const row of (p as Progress[]) || []) byId[row.badge_id] = row;
      setProgress(byId);

      // Stages never go down (user_badges keeps the highest), but live
      // progress can be ahead of it for a moment right after logging.
      const { data: ub } = await supabase
        .from("user_badges")
        .select("badge_id, stage")
        .eq("user_id", userId);
      const reached: Record<string, number> = {};
      for (const row of ub || []) reached[row.badge_id] = row.stage;
      for (const row of Object.values(byId)) {
        reached[row.badge_id] = Math.max(reached[row.badge_id] ?? 0, row.stage);
      }
      setStages(reached);

      // One-time "new stage" celebration, tracked locally per user.
      const key = `ppl_seen_badge_stages_${userId}`;
      let seen: Record<string, number> | null = null;
      try { seen = JSON.parse(localStorage.getItem(key) || "null"); } catch { /* ignore */ }
      const fresh = Object.keys(reached).filter((id) => reached[id] > (seen?.[id] ?? 0));
      localStorage.setItem(key, JSON.stringify(reached));
      // First visit after this ships: don't fire on everything at once.
      if (seen && fresh.length > 0) {
        setJustEarned(new Set(fresh));
        setTimeout(() => setJustEarned(new Set()), 2200);
      }
    })();
  }, [userId]);

  const streakBadge = (badges || []).find((b) => b.kind === "streak");

  // "What's next" ordering: badges with a stage first, then closest to
  // their next stage, then table order.
  const actBadges = useMemo(() => {
    const list = (badges || []).filter((b) => b.kind !== "streak");
    const ratio = (b: BadgeDef) => {
      const p = progress[b.id];
      return p ? Math.min(p.current_count, p.target) / (p.target || 1) : 0;
    };
    return list.sort((a, b) => {
      const ea = (stages[a.id] ?? 0) > 0;
      const eb = (stages[b.id] ?? 0) > 0;
      if (ea !== eb) return ea ? -1 : 1;
      const d = ratio(b) - ratio(a);
      if (Math.abs(d) > 1e-9) return d;
      return (a.sort_order || 0) - (b.sort_order || 0);
    });
  }, [badges, stages, progress]);

  const stageLabel = (stage: number) => t.appBadges.stage.replace("{stage}", String(stage));

  return (
    <section className="bg-background border border-border rounded-2xl p-6 md:p-8">
      <h2 className="font-serif text-2xl mb-6">{t.account.streaksHeading}</h2>

      {streak === null ? (
        <Skeleton className="h-20 mb-6 rounded-xl" />
      ) : (
        <div className="flex flex-wrap items-center gap-x-6 gap-y-4 mb-8">
          <div className="flex items-center gap-2 px-4 py-3 bg-warm-cream rounded-xl">
            <Flame size={28} className="text-terracotta" />
            <div>
              <div className="text-2xl font-serif">{streak.current_streak}</div>
              <div className="text-xs text-foreground/60 uppercase tracking-wide">
                {t.account.dayStreak}
              </div>
            </div>
          </div>
          <div className="text-sm text-foreground/60">
            {t.account.longest}: <strong>{streak.longest_streak}</strong>
            <br />
            {t.account.totalActs}: <strong>{streak.total_acts}</strong>
          </div>

          {streakBadge && (() => {
            const stage = stages[streakBadge.id] ?? 0;
            const p = progress[streakBadge.id];
            return (
              <BadgeHint
                text={badgeText(streakBadge, lang, "description")}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs leading-none transition-opacity ${
                  stage > 0 ? "bg-warm-cream text-foreground" : "bg-muted/50 text-foreground/40"
                } ${justEarned.has(streakBadge.id) ? "badge-pop" : ""}`}
              >
                <span className={`text-base ${stage > 0 ? "" : "grayscale opacity-60"}`}>{streakBadge.icon || "🏅"}</span>
                <span className="font-medium">{badgeText(streakBadge, lang, "name")}</span>
                {stage > 0 && <span className="text-foreground/60">· {stageLabel(stage)}</span>}
                {p && <span className="tabular-nums text-foreground/60">· {p.current_count}/{p.target}</span>}
              </BadgeHint>
            );
          })()}
        </div>
      )}

      {badges === null ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {actBadges.map((b) => {
            const p = progress[b.id];
            const stage = stages[b.id] ?? 0;
            const got = stage > 0;
            return (
              <BadgeHint
                key={b.id}
                text={badgeText(b, lang, "description")}
                className={`p-4 rounded-xl text-center border transition-all flex flex-col ${
                  got ? "bg-warm-cream border-terracotta/30" : "border-border"
                } ${justEarned.has(b.id) ? "badge-pop" : ""}`}
              >
                <span className={`block text-3xl mb-1 ${got ? "" : "grayscale opacity-50"}`}>
                  {b.icon || "🏅"}
                </span>
                <span className={`block text-xs font-medium leading-tight ${got ? "" : "text-foreground/60"}`}>
                  {badgeText(b, lang, "name")}
                </span>
                {got && (
                  <span className="mt-1 block text-[11px] font-semibold text-terracotta">{stageLabel(stage)}</span>
                )}
                {p && (
                  <span className="mt-auto block pt-1.5 text-[11px] tabular-nums text-foreground/60">
                    {p.current_count}/{p.target}
                  </span>
                )}
              </BadgeHint>
            );
          })}
        </div>
      )}
    </section>
  );
};

export default StreaksBadges;
