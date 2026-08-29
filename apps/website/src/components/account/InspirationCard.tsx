import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Loader2, RefreshCw, Sparkles } from "lucide-react";
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

export default function InspirationCard() {
  const { t, lang } = useLanguage();
  const { setShareModalOpen } = useUI();
  const [acts, setActs] = useState<Act[] | null>(null);
  const [idx, setIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [open, setOpen] = useState(false);

  async function fetchActs(force = false) {
    if (force) setRefreshing(true);
    else setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("daily-acts", {
        body: { lang, force },
      });
      if (error) throw error;
      setActs(data.acts);
      setIdx(0);
    } catch (e) {
      console.error(e);
      toast.error(t.inspiration.loadError);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { fetchActs(false); /* eslint-disable-next-line */ }, [lang]);

  useEffect(() => {
    setShareModalOpen(open);
    return () => setShareModalOpen(false);
  }, [open, setShareModalOpen]);

  function next() {
    if (!acts || acts.length === 0) return;
    if (idx + 1 < acts.length) setIdx(idx + 1);
    else fetchActs(true);
  }

  const act = acts?.[idx];

  return (
    <section className="bg-background border border-border rounded-2xl p-6 md:p-8">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-primary" />
          <h2 className="font-serif text-2xl">{t.account.inspirationHeading}</h2>
        </div>
        <button
          onClick={next}
          disabled={refreshing || loading}
          aria-label={t.account.nextIdea}
          className="p-2 rounded-full hover:bg-muted text-foreground/60 hover:text-foreground transition-colors"
        >
          <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
        </button>
      </div>

      {loading || !act ? (
        <div className="flex justify-center py-10">
          <Loader2 className="animate-spin text-primary" size={24} />
        </div>
      ) : (
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
            ~{act.time_minutes} {t.inspiration.minutes}
          </div>
          <h3
            className="text-2xl text-foreground mb-2 leading-snug"
            style={{ fontFamily: "'DM Serif Display', serif" }}
          >
            {act.title}
          </h3>
          <p className="text-sm text-muted-foreground mb-5">{act.why}</p>
          <div className="flex flex-wrap items-center gap-4">
            <button
              onClick={() => setOpen(true)}
              className="inline-flex items-center justify-center gap-2 rounded-lg py-2.5 px-5 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              {t.inspiration.markDid}
            </button>
            <Link
              to="/inspiration"
              className="inline-flex items-center gap-1 text-sm text-terracotta hover:underline"
            >
              {t.account.moreInspiration} <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="headline-md text-foreground">
              {t.share.sectionHeading}
            </DialogTitle>
          </DialogHeader>
          <div className="pt-2 pb-2">
            <ShareActFlow
              initialMode="performed"
              initialDescription={act?.title || ""}
              onClose={() => {
                setOpen(false);
                next();
              }}
            />
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
