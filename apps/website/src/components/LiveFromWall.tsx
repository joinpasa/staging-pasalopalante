import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Heart } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useLanguage } from "@shared/contexts/LanguageContext";
import { supabasePublic } from "@shared/integrations/supabase/publicClient";
import { cn } from "@shared/lib/utils";

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
  received: "bg-warm-gold/20 text-foreground",
  witnessed: "bg-warm-sage/20 text-warm-sage",
};

/**
 * Shows as many whole lines of `text` as fit in its card and ends with "…".
 * The space is worked out from the grid cell the card sits in (marked
 * data-fit-grid / data-fit-card) minus the card's padding and its other
 * rows — never from the text's own height, which would only ever shrink.
 */
function FittedText({ text, className }: { text: string; className?: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const [lines, setLines] = useState<number>();

  useLayoutEffect(() => {
    const el = ref.current;
    const card = el?.closest<HTMLElement>("[data-fit-card]");
    const grid = el?.closest<HTMLElement>("[data-fit-grid]");
    if (!el || !card || !grid) return;
    const px = (v: string) => parseFloat(v) || 0;
    const measure = () => {
      const lineHeight = px(getComputedStyle(el).lineHeight);
      const cell = px(getComputedStyle(grid).gridTemplateRows);
      if (!lineHeight || !cell) return;
      const c = getComputedStyle(card);
      let used = px(c.paddingTop) + px(c.paddingBottom) + px(c.borderTopWidth) + px(c.borderBottomWidth);
      for (const sibling of Array.from(el.parentElement?.children ?? [])) {
        if (sibling === el) continue;
        const m = getComputedStyle(sibling);
        used += sibling.getBoundingClientRect().height + px(m.marginTop) + px(m.marginBottom);
      }
      setLines(Math.max(1, Math.floor((cell - used) / lineHeight)));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(grid);
    observer.observe(card);
    return () => observer.disconnect();
  }, []);

  return (
    <p
      ref={ref}
      className={cn("overflow-hidden", className)}
      style={{ display: "-webkit-box", WebkitBoxOrient: "vertical", WebkitLineClamp: lines }}
    >
      {text}
    </p>
  );
}

const LiveFromWall = () => {
  const { t } = useLanguage();
  const [pool, setPool] = useState<Act[] | null>(null);
  const [offset, setOffset] = useState(0);
  const [todayCount, setTodayCount] = useState<number | null>(null);
  const seenIds = useRef(new Set<string>());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabasePublic
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
      const { count } = await supabasePublic
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
    const channel = supabasePublic
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
    return () => { supabasePublic.removeChannel(channel); };
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
    <section className="bg-white section-padding py-14 md:py-20 min-h-[488px] h-[96dvh] md:h-[48vh]">
      {/* Fills the section's fixed height so the cards below can share
          what's left instead of overflowing it. */}
      <div className="max-w-6xl mx-auto h-full flex flex-col">
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

        <div data-fit-grid className="flex-1 min-h-0 grid grid-cols-1 grid-rows-3 gap-4 sm:grid-cols-3 sm:grid-rows-1 sm:items-start sm:gap-6">
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
                  data-fit-card
                  className="flex min-h-0 max-h-full gap-3.5 overflow-hidden bg-warm-cream border border-border rounded-2xl p-4 sm:p-6"
                >
                  <div className="shrink-0 w-[38px] h-[38px] rounded-full bg-warm-blush grid place-items-center">
                    <Heart size={17} className="text-primary fill-current" />
                  </div>
                  <div className="min-w-0 min-h-0 flex-1 flex flex-col">
                    {act ? (
                      <>
                        {modeStyle && modeLabel && (
                          <span className={`self-start shrink-0 inline-block text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full mb-2 ${modeStyle}`}>
                            {modeLabel}
                          </span>
                        )}
                        <FittedText
                          text={act.description ?? ""}
                          className="text-[15px] leading-snug text-foreground"
                        />
                        <p className="shrink-0 mt-1.5 flex items-baseline gap-2 text-xs">
                          {act.first_name && (
                            <span className="min-w-0 truncate text-foreground/50">{act.first_name}</span>
                          )}
                          <span className="shrink-0 text-muted-foreground">{timeAgo(act.created_at, t)}</span>
                        </p>
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
