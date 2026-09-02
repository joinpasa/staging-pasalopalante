import { useEffect, useState } from "react";
import { Check, Loader2, RefreshCw, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@shared/components/ui/dialog";
import { useLanguage } from "@shared/contexts/LanguageContext";
import { useUI } from "@shared/contexts/UIContext";
import { supabase } from "@shared/integrations/supabase/client";
import ShareActFlow from "@shared/components/share/ShareActFlow";
import { toast } from "sonner";

interface Act {
  title: string;
  why: string;
  time_minutes: number;
}

const STORAGE_KEY = (date: string) => `inspiration:done:${date}`;

export default function DailyActs() {
  const { t, lang } = useLanguage();
  const { setLocalShareFlowOpen } = useUI();
  const [acts, setActs] = useState<Act[] | null>(null);
  const [date, setDate] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [done, setDone] = useState<number[]>([]);
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  async function fetchActs(force = false) {
    if (force) setRefreshing(true);
    else setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("daily-acts", {
        body: { lang, force },
      });
      if (error) throw error;
      setActs(data.acts);
      setDate(data.date);
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY(data.date)) || "[]");
      setDone(Array.isArray(stored) ? stored : []);
    } catch (e) {
      console.error(e);
      toast.error(t.inspiration.loadError);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    fetchActs(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  useEffect(() => {
    setLocalShareFlowOpen(openIdx !== null);
    return () => setLocalShareFlowOpen(false);
  }, [openIdx, setLocalShareFlowOpen]);

  function markDone(idx: number) {
    if (done.includes(idx)) return;
    const next = [...done, idx];
    setDone(next);
    localStorage.setItem(STORAGE_KEY(date), JSON.stringify(next));
  }

  const todayLabel = date
    ? new Date(date + "T12:00:00").toLocaleDateString(lang === "es" ? "es-ES" : "en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
      })
    : "";

  return (
    <section className="section-padding section-spacing">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <p className="text-xs uppercase tracking-[0.3em] text-primary font-semibold mb-4">
            <Sparkles size={14} className="inline -mt-0.5 mr-1.5" />
            {todayLabel}
          </p>
          <h2 className="headline-xl text-foreground mb-4">{t.inspiration.dailyHeading}</h2>
          <p className="body-lg text-muted-foreground max-w-2xl mx-auto">
            {t.inspiration.dailyBody}
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="animate-spin text-primary" size={32} />
          </div>
        ) : acts ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {acts.map((a, i) => {
              const isDone = done.includes(i);
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className={`group rounded-2xl border-2 p-6 transition-all ${
                    isDone
                      ? "bg-warm-cream border-primary/40"
                      : "bg-card border-border hover:border-primary hover:shadow-lg"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <span className="text-xs uppercase tracking-wider text-muted-foreground">
                      ~{a.time_minutes} {t.inspiration.minutes}
                    </span>
                    {isDone && (
                      <span className="inline-flex items-center gap-1 text-xs text-primary font-medium">
                        <Check size={14} /> {t.inspiration.doneBadge}
                      </span>
                    )}
                  </div>
                  <h3
                    className="text-xl text-foreground mb-2 leading-snug"
                    style={{ fontFamily: "'DM Serif Display', serif" }}
                  >
                    {a.title}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-5">{a.why}</p>
                  <button
                    onClick={() => setOpenIdx(i)}
                    disabled={isDone}
                    className={`w-full inline-flex items-center justify-center gap-2 rounded-lg py-2.5 px-4 text-sm font-medium transition-colors ${
                      isDone
                        ? "bg-primary/10 text-primary cursor-default"
                        : "bg-primary text-primary-foreground hover:bg-primary/90"
                    }`}
                  >
                    {isDone ? (
                      <>
                        <Check size={16} /> {t.inspiration.didThis}
                      </>
                    ) : (
                      t.inspiration.markDid
                    )}
                  </button>
                </motion.div>
              );
            })}
          </div>
        ) : null}

        <div className="text-center mt-10">
          <button
            onClick={() => fetchActs(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
            {t.inspiration.refresh}
          </button>
        </div>
      </div>

      <Dialog
        open={openIdx !== null}
        onOpenChange={(o) => {
          if (!o) setOpenIdx(null);
        }}
      >
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="headline-md text-foreground">
              {t.share.sectionHeading}
            </DialogTitle>
          </DialogHeader>
          <div className="pt-2 pb-2">
            <ShareActFlow
              initialMode="performed"
              initialDescription={openIdx !== null && acts ? acts[openIdx].title : ""}
              onClose={() => {
                if (openIdx !== null) markDone(openIdx);
                setOpenIdx(null);
              }}
            />
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
