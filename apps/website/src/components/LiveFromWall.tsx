import { useEffect, useRef, useState } from "react";
import { Heart } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useLanguage } from "@shared/contexts/LanguageContext";
import { supabase } from "@shared/integrations/supabase/client";

interface Act {
  id: string;
  description: string | null;
  first_name: string | null;
  mode: string | null;
  created_at: string;
}

const ROTATE_MS = 7000;
const POOL_LIMIT = 15;
const VISIBLE = 3;

function timeAgo(iso: string, t: ReturnType<typeof useLanguage>["t"]): string {
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return t.liveWall.justNow;
  if (minutes < 60) return t.liveWall.minutesAgo.replace("{n}", String(minutes));
  const hours = Math.floor(minutes / 60);
  if (hours === 1) return t.liveWall.hourAgo;
  if (hours < 24) return t.liveWall.hoursAgo.replace("{n}", String(hours));
  const days = Math.floor(hours / 24);
  if (days === 1) return t.liveWall.dayAgo;
  return t.liveWall.daysAgo.replace("{n}", String(days));
}

// Subtle, distinct tints pulled from the existing warm.* palette - no new colors.
const MODE_STYLES: Record<string, string> = {
  performed: "bg-warm-terracotta/15 text-warm-terracotta",
  received: "bg-warm-gold/20 text-warm-earth",
  witnessed: "bg-warm-sage/20 text-warm-sage",
};

const LiveFromWall = () => {
  const { t } = useLanguage();
  const [pool, setPool] = useState<Act[] | null>(null);
  const [offset, setOffset] = useState(0);
  const [todayCount, setTodayCount] = useState<number | null>(null);
  const seenIds = useRef(new Set<string>());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("acts_of_kindness")
        .select("id, description, first_name, mode, created_at")
        .eq("status", "published")
        .not("description", "is", null)
        .order("created_at", { ascending: false })
        .limit(POOL_LIMIT);
      if (cancelled) return;
      const rows = (data as Act[]) || [];
      rows.forEach((r) => seenIds.current.add(r.id));
      setPool(rows);

      const startOfDay = new Date();
      startOfDay.setUTCHours(0, 0, 0, 0);
      const { count } = await supabase
        .from("acts_of_kindness")
        .select("id", { count: "exact", head: true })
        .eq("status", "published")
        .gte("created_at", startOfDay.toISOString());
      if (!cancelled) setTodayCount(count ?? 0);
    })();
    return () => { cancelled = true; };
  }, []);

  // Best-effort: if Realtime is enabled for this table, a freshly published
  // act joins the rotation immediately. Silent no-op otherwise - the
  // interval-based rotation below is what keeps the section feeling alive
  // regardless of whether Realtime is on.
  useEffect(() => {
    const channel = supabase
      .channel("live-from-wall")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "acts_of_kindness" },
        (payload) => {
          const row = payload.new as Act & { status: string };
          if (row.status !== "published" || !row.description || seenIds.current.has(row.id)) return;
          seenIds.current.add(row.id);
          setPool((prev) => [row, ...(prev ?? [])].slice(0, POOL_LIMIT));
          setOffset(0);
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  // Rotates which 3 cards show so the section doesn't sit static between
  // real submissions.
  useEffect(() => {
    if (!pool || pool.length <= VISIBLE) return;
    const id = setInterval(() => {
      setOffset((o) => (o + VISIBLE) % pool.length);
    }, ROTATE_MS);
    return () => clearInterval(id);
  }, [pool]);

  if (pool && pool.length === 0) return null;

  const visible = pool
    ? Array.from({ length: Math.min(VISIBLE, pool.length) }, (_, i) => pool[(offset + i) % pool.length])
    : null;

  return (
    <section className="bg-white section-padding py-14 md:py-20">
      <div className="max-w-6xl mx-auto">
        {todayCount !== null && todayCount > 0 && (
          <p className="text-sm text-foreground/60 mb-2">
            {t.liveWall.statLine.replace("{n}", String(todayCount))}
          </p>
        )}
        <p className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-primary font-semibold mb-7">
          <span className="relative flex h-2 w-2" aria-hidden="true">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
          </span>
          {t.liveWall.eyebrow}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <AnimatePresence mode="popLayout">
            {(visible ?? [0, 1, 2]).map((entry, i) => {
              const act = visible ? (entry as Act) : null;
              const key = act ? `${act.id}-${offset}` : `skeleton-${i}`;
              const modeStyle = act?.mode ? MODE_STYLES[act.mode] : undefined;
              const modeLabel =
                act?.mode === "performed"
                  ? t.inspiration.tagGiven
                  : act?.mode === "received"
                    ? t.inspiration.tagReceived
                    : act?.mode === "witnessed"
                      ? t.inspiration.tagSeen
                      : null;

              return (
                <motion.div
                  key={key}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.4, delay: act ? i * 0.08 : 0, ease: "easeOut" }}
                  className="flex gap-3.5 bg-warm-cream border border-border rounded-2xl p-6"
                >
                  <div className="shrink-0 w-[38px] h-[38px] rounded-full bg-warm-blush grid place-items-center">
                    <Heart size={17} className="text-primary fill-current" />
                  </div>
                  <div className="min-w-0">
                    {act ? (
                      <>
                        {modeStyle && modeLabel && (
                          <span className={`inline-block text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full mb-2 ${modeStyle}`}>
                            {modeLabel}
                          </span>
                        )}
                        <p className="text-[15px] leading-snug text-foreground">{act.description}</p>
                        <p className="mt-1.5 text-xs text-muted-foreground">
                          {timeAgo(act.created_at, t)}
                        </p>
                        {act.first_name && (
                          <p className="text-xs text-foreground/50 mt-0.5">{act.first_name}</p>
                        )}
                      </>
                    ) : (
                      <>
                        <div className="h-3.5 bg-border/60 rounded animate-pulse mb-2 w-full" />
                        <div className="h-3.5 bg-border/60 rounded animate-pulse w-2/3" />
                      </>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
};

export default LiveFromWall;
