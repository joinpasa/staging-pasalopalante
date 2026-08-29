import { useEffect, useMemo, useState } from "react";
import { supabase } from "@shared/integrations/supabase/client";
import { useLanguage } from "@shared/contexts/LanguageContext";
import { Skeleton } from "@shared/components/ui/skeleton";
import { Flame, Check } from "lucide-react";

interface Badge {
  id: string;
  kind: string | null;
  sort_order: number | null;
  name: string;
  name_es: string | null;
  name_fr: string | null;
  name_de: string | null;
  description: string | null;
  description_es: string | null;
  description_fr: string | null;
  description_de: string | null;
  icon: string | null;
}

interface Progress {
  badge_id: string;
  current_count: number;
  target: number;
}

const localized = (b: Badge, lang: string, field: "name" | "description") => {
  const map: Record<string, string | null | undefined> = {
    es: field === "name" ? b.name_es : b.description_es,
    fr: field === "name" ? b.name_fr : b.description_fr,
    de: field === "name" ? b.name_de : b.description_de,
  };
  return map[lang] || (field === "name" ? b.name : b.description) || "";
};

const StreaksBadges = ({ userId }: { userId: string }) => {
  const { t, lang } = useLanguage();
  const [streak, setStreak] = useState<{ current_streak: number; longest_streak: number; total_acts: number } | null>(null);
  const [badges, setBadges] = useState<Badge[] | null>(null);
  const [earned, setEarned] = useState<Set<string>>(new Set());
  const [progress, setProgress] = useState<Record<string, Progress>>({});
  const [justEarned, setJustEarned] = useState<Set<string>>(new Set());

  useEffect(() => {
    (async () => {
      const { data: s } = await supabase.rpc("user_streak", { _user_id: userId });
      if (s && s[0]) setStreak(s[0]);
      else setStreak({ current_streak: 0, longest_streak: 0, total_acts: 0 });

      const { data: b } = await supabase.from("badges").select("*");
      setBadges((b as Badge[]) || []);

      const { data: ub } = await supabase
        .from("user_badges")
        .select("badge_id")
        .eq("user_id", userId);
      const earnedIds = new Set((ub || []).map((x: any) => x.badge_id as string));
      setEarned(earnedIds);

      const { data: p } = await supabase.rpc("act_badge_progress", { _user_id: userId });
      const byId: Record<string, Progress> = {};
      for (const row of (p as Progress[]) || []) byId[row.badge_id] = row;
      setProgress(byId);

      // One-time "just earned" celebration, tracked locally per user.
      const key = `ppl_seen_badges_${userId}`;
      let seen: string[] = [];
      try { seen = JSON.parse(localStorage.getItem(key) || "[]"); } catch { /* ignore */ }
      const fresh = [...earnedIds].filter((id) => !seen.includes(id));
      if (seen.length === 0 && fresh.length > 0) {
        // First visit after this feature ships: don't fire on everything at once.
        localStorage.setItem(key, JSON.stringify([...earnedIds]));
      } else if (fresh.length > 0) {
        setJustEarned(new Set(fresh));
        localStorage.setItem(key, JSON.stringify([...earnedIds]));
        setTimeout(() => setJustEarned(new Set()), 2200);
      }
    })();
  }, [userId]);

  const streakBadges = useMemo(
    () =>
      (badges || [])
        .filter((b) => b.kind !== "act_type")
        .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)),
    [badges],
  );

  // "What's next" ordering: earned first, then by progress ratio, then table order.
  const actBadges = useMemo(() => {
    const list = (badges || []).filter((b) => b.kind === "act_type");
    const ratio = (b: Badge) => {
      const p = progress[b.id];
      const target = p?.target ?? 10;
      return Math.min(p?.current_count ?? 0, target) / target;
    };
    return list.sort((a, b) => {
      const ea = earned.has(a.id) || ratio(a) >= 1;
      const eb = earned.has(b.id) || ratio(b) >= 1;
      if (ea !== eb) return ea ? -1 : 1;
      if (!ea) {
        const d = ratio(b) - ratio(a);
        if (Math.abs(d) > 1e-9) return d;
      }
      return (a.sort_order || 0) - (b.sort_order || 0);
    });
  }, [badges, earned, progress]);

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

          {streakBadges.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              {streakBadges.map((b) => {
                const got = earned.has(b.id);
                return (
                  <span
                    key={b.id}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs leading-none transition-opacity ${
                      got ? "bg-warm-cream text-foreground" : "bg-muted/50 text-foreground/40"
                    } ${justEarned.has(b.id) ? "badge-pop" : ""}`}
                    title={localized(b, lang, "description")}
                  >
                    <span className={`text-base ${got ? "" : "grayscale opacity-60"}`}>{b.icon || "🏅"}</span>
                    <span className="font-medium">{localized(b, lang, "name")}</span>
                  </span>
                );
              })}
            </div>
          )}
        </div>
      )}

      {badges === null ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {actBadges.map((b) => {
            const p = progress[b.id];
            const target = p?.target ?? 10;
            const current = Math.min(p?.current_count ?? 0, target);
            const got = earned.has(b.id) || current >= target;
            return (
              <div
                key={b.id}
                className={`p-4 rounded-xl text-center border transition-all ${
                  got ? "bg-warm-cream border-terracotta/30" : "border-border"
                } ${justEarned.has(b.id) ? "badge-pop" : ""}`}
                title={localized(b, lang, "description")}
              >
                <div className={`text-3xl mb-1 ${got ? "" : "grayscale opacity-50"}`}>
                  {b.icon || "🏅"}
                </div>
                <div className={`text-xs font-medium leading-tight ${got ? "" : "text-foreground/60"}`}>
                  {localized(b, lang, "name")}
                </div>
                <div className="mt-1.5 text-[11px] tabular-nums text-foreground/60 flex items-center justify-center gap-1">
                  {got && <Check size={11} className="text-terracotta" />}
                  {current}/{target}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};

export default StreaksBadges;
