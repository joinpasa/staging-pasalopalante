import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import { Heart } from "lucide-react";
import { supabase } from "@shared/integrations/supabase/client";
import { supabasePublic } from "@shared/integrations/supabase/publicClient";
import { useLanguage } from "@shared/contexts/LanguageContext";
import { useActTranslation } from "@/hooks/useActTranslation";
import { pickCardGradient } from "@shared/lib/cardGradients";
import PalanteArrow from "@shared/components/icons/PalanteArrow";
import { splitKindnessTag } from "@shared/lib/splitKindnessTag";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@shared/components/ui/dialog";

const PUBLIC_BUCKET = "kindness-photos";
const CANDIDATE_LIMIT = 200;
const TOP_N = 5;
const ROTATE_MS = 5000;
const TRUNC = 160;

interface ActRow {
  id: string;
  description: string | null;
  first_name: string | null;
  photo_paths: string[] | null;
  created_at: string;
  mode: string;
  language: string | null;
}
interface TopAct extends ActRow {
  reaction_count: number;
}

const TEXT_COLOR = "hsl(20 35% 18%)";

function publicPhotoUrl(path: string) {
  return supabase.storage.from(PUBLIC_BUCKET).getPublicUrl(path).data.publicUrl;
}

function prefersReducedMotion() {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Outline-to-solid heart loader */
function HeartLoader() {
  return (
    <div className="w-full max-w-sm mx-auto h-[420px] flex flex-col items-center justify-center gap-3">
      <div className="relative w-12 h-12">
        <Heart
          size={48}
          className="absolute inset-0 text-cyan-100/40"
          strokeWidth={1.5}
        />
        <motion.div
          className="absolute inset-0 overflow-hidden"
          initial={{ height: "0%" }}
          animate={{ height: ["0%", "100%", "0%"] }}
          transition={{
            duration: 1.8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          style={{ top: "auto", bottom: 0 }}
        >
          <Heart
            size={48}
            className="absolute bottom-0 left-0 text-cyan-100 fill-cyan-100"
            strokeWidth={1.5}
          />
        </motion.div>
      </div>
    </div>
  );
}

export default function TopActsStack() {
  const [acts, setActs] = useState<TopAct[]>([]);
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [openAct, setOpenAct] = useState<TopAct | null>(null);
  const reduced = useMemo(prefersReducedMotion, []);

  // Fetch top-liked acts
  useEffect(() => {
    let cancelled = false;
    const minDelay = new Promise((r) => setTimeout(r, 700));
    (async () => {
      try {
        const { data, error } = await supabase
          .from("acts_of_kindness")
          .select(
            "id, description, first_name, photo_paths, created_at, mode, language",
          )
          .eq("status", "published")
          .not("description", "is", null)
          .neq("description", "")
          .order("created_at", { ascending: false })
          .limit(CANDIDATE_LIMIT);
        if (error) throw error;
        const rows = (data as ActRow[]) ?? [];
        const ids = rows.map((r) => r.id);
        let counts: Record<string, number> = {};
        if (ids.length) {
          const { data: rx } = await supabasePublic.rpc("reaction_counts", {
            _act_ids: ids,
          });
          (rx ?? []).forEach((r: { act_id: string; count: number }) => {
            counts[r.act_id] = Number(r.count) || 0;
          });
        }
        const enriched: TopAct[] = rows.map((r) => ({
          ...r,
          reaction_count: counts[r.id] ?? 0,
        }));
        enriched.sort(
          (a, b) =>
            b.reaction_count - a.reaction_count ||
            new Date(b.created_at).getTime() -
              new Date(a.created_at).getTime(),
        );
        await minDelay;
        if (!cancelled) {
          setActs(enriched.slice(0, TOP_N));
          setLoading(false);
          // Defer the visual reveal one frame so layout is settled
          requestAnimationFrame(() => {
            if (!cancelled) setReady(true);
          });
        }
      } catch (e) {
        console.error("TopActsStack fetch failed", e);
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Auto-rotate
  useEffect(() => {
    if (reduced || paused || acts.length < 2 || !ready) return;
    const id = window.setInterval(() => {
      setDirection(1);
      setActive((i) => (i + 1) % acts.length);
    }, ROTATE_MS);
    return () => window.clearInterval(id);
  }, [acts.length, paused, reduced, ready]);

  if (loading || !ready) {
    return <HeartLoader />;
  }
  if (acts.length === 0) return null;

  const advance = (dir: 1 | -1) => {
    setDirection(dir);
    setActive((i) => (i + dir + acts.length) % acts.length);
  };

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (Math.abs(info.offset.x) > 60 || Math.abs(info.velocity.x) > 300) {
      advance(info.offset.x < 0 ? 1 : -1);
    }
  };

  const current = acts[active];

  return (
    <>
      <div
        className="w-full max-w-sm mx-auto select-none"
        onPointerEnter={() => setPaused(true)}
        onPointerLeave={() => setPaused(false)}
        onFocusCapture={() => setPaused(true)}
        onBlurCapture={() => setPaused(false)}
      >
        <p className="text-center text-[11px] uppercase tracking-[0.22em] font-bold text-cyan-100 mb-4">
          ACTS CREATING RIPPLES
        </p>
        <div className="relative h-[420px] overflow-hidden">
          <AnimatePresence initial={false} custom={direction} mode="wait">
            <motion.div
              key={current.id}
              className="absolute inset-0"
              custom={direction}
              initial={
                reduced
                  ? { opacity: 0 }
                  : { x: direction * 40, opacity: 0 }
              }
              animate={{ x: 0, opacity: 1 }}
              exit={
                reduced
                  ? { opacity: 0 }
                  : { x: direction * -40, opacity: 0 }
              }
              transition={
                reduced
                  ? { duration: 0.15 }
                  : { type: "spring", stiffness: 260, damping: 30 }
              }
              drag={reduced ? false : "x"}
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.35}
              onDragEnd={onDragEnd}
            >
              <StackCard act={current} onReadMore={() => setOpenAct(current)} />
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Pagination dots */}
        <div className="mt-5 flex items-center justify-center gap-2">
          {acts.map((_, i) => (
            <button
              key={i}
              onClick={() => {
                setDirection(i > active ? 1 : -1);
                setActive(i);
              }}
              aria-label={`Show card ${i + 1}`}
              className={`h-2 rounded-full transition-all ${
                i === active
                  ? "w-6 bg-cyan-100"
                  : "w-2 bg-cyan-100/35 hover:bg-cyan-100/60"
              }`}
            />
          ))}
        </div>
      </div>

      <ActDetailDialog
        act={openAct}
        onOpenChange={(o) => !o && setOpenAct(null)}
      />
    </>
  );
}

function StackCard({
  act,
  onReadMore,
}: {
  act: TopAct;
  onReadMore: () => void;
}) {
  const { t, lang } = useLanguage();
  const original = (act.description ?? "").trim();
  const { translation, needed } = useActTranslation(
    act.id,
    original,
    act.language,
    lang,
  );
  const displayText = needed && translation ? translation : original;
  const truncated = displayText.length > TRUNC;
  const text = truncated
    ? displayText.slice(0, TRUNC).trimEnd() + "…"
    : displayText;
  const photo =
    act.photo_paths && act.photo_paths.length > 0
      ? publicPhotoUrl(act.photo_paths[0])
      : null;
  const modeLabel =
    act.mode === "performed"
      ? t.inspiration.tagGiven
      : act.mode === "received"
      ? t.inspiration.tagReceived
      : t.inspiration.tagSeen;

  return (
    <div
      className="group relative w-full h-full flex flex-col overflow-hidden rounded-2xl shadow-2xl shadow-black/40 ring-1 ring-white/10 cursor-grab active:cursor-grabbing bg-[hsl(36_50%_96%)]"
      style={{
        backgroundImage: pickCardGradient(act.id),
        backgroundColor: "hsl(36 50% 96%)",
        fontFamily: "'DM Sans', system-ui, sans-serif",
      }}
    >
      <div
        className="px-5 pt-4 pb-2 flex items-center gap-1.5"
        style={{ color: TEXT_COLOR, opacity: 0.7 }}
      >
        <PalanteArrow size={13} />
        <span className="text-[10px] uppercase tracking-[0.22em] leading-none">
          <span className="font-normal">{splitKindnessTag(modeLabel).noun}</span>
          {splitKindnessTag(modeLabel).action && (
            <>
              {" "}
              <span className="font-bold">{splitKindnessTag(modeLabel).action}</span>
            </>
          )}
        </span>
      </div>


      {photo && (
        <div className="px-5 pb-3 flex justify-center">
          <div
            className="bg-white p-2 pb-5 rounded-sm shadow-md"
            style={{ width: 168 }}
          >
            <div className="w-full aspect-square overflow-hidden bg-black/5">
              <img
                src={photo}
                alt=""
                draggable={false}
                className="w-full h-full object-cover pointer-events-none"
              />
            </div>
          </div>
        </div>
      )}

      <div className="px-6 flex-1 flex flex-col items-center justify-center gap-2">
        <p
          className={`m-0 font-semibold leading-relaxed text-center w-full ${
            photo ? "text-sm" : "text-base"
          }`}
          style={{ color: TEXT_COLOR }}
        >
          {text ? `"${text}"` : t.inspiration.noDescription}
        </p>
        {truncated && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onReadMore();
            }}
            onPointerDown={(e) => e.stopPropagation()}
            className="text-xs font-bold underline underline-offset-2 hover:opacity-80 transition-opacity pointer-events-auto"
            style={{ color: TEXT_COLOR }}
          >
            {t.inspiration.readMore}
          </button>
        )}
      </div>

      <div className="mt-auto flex items-center justify-between px-5 py-3 border-t border-foreground/5">
        <span className="text-xs font-semibold" style={{ color: TEXT_COLOR }}>
          {act.first_name || t.inspiration.anonymous}
        </span>
        <span
          className="inline-flex items-center gap-1.5 text-sm font-semibold"
          style={{ color: TEXT_COLOR }}
        >
          <Heart size={16} className="fill-current" />
          {act.reaction_count}
        </span>
      </div>
    </div>
  );
}

function ActDetailDialog({
  act,
  onOpenChange,
}: {
  act: TopAct | null;
  onOpenChange: (open: boolean) => void;
}) {
  const { t, lang } = useLanguage();
  const { translation, needed } = useActTranslation(
    act?.id ?? "",
    (act?.description ?? "").trim(),
    act?.language ?? null,
    lang,
  );
  if (!act) return null;
  const original = (act.description ?? "").trim();
  const full = needed && translation ? translation : original;
  const photo =
    act.photo_paths && act.photo_paths.length > 0
      ? publicPhotoUrl(act.photo_paths[0])
      : null;

  return (
    <Dialog open={!!act} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {act.first_name || t.inspiration.anonymous}
          </DialogTitle>
        </DialogHeader>
        {photo && (
          <div className="w-full rounded-md overflow-hidden bg-muted">
            <img src={photo} alt="" className="w-full h-auto object-cover" />
          </div>
        )}
        <p className="text-base leading-relaxed whitespace-pre-wrap text-foreground">
          {full}
        </p>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Heart size={14} className="fill-current text-warm-terracotta" />
          {act.reaction_count}
        </div>
      </DialogContent>
    </Dialog>
  );
}
