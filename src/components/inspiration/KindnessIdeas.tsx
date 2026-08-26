import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useLanguage } from "@/contexts/LanguageContext";
import { useUI } from "@/contexts/UIContext";
import ShareActFlow from "@/components/share/ShareActFlow";

type CategoryKey = "words" | "time" | "money" | "hands" | "business" | "group";

const CATEGORIES: { key: CategoryKey; labelKey: keyof ReturnType<typeof useLanguage>["t"]["inspiration"] }[] = [
  { key: "words", labelKey: "categoryWords" },
  { key: "time", labelKey: "categoryTime" },
  { key: "money", labelKey: "categoryMoney" },
  { key: "hands", labelKey: "categoryHands" },
  { key: "business", labelKey: "categoryBusiness" },
  { key: "group", labelKey: "categoryGroup" },
];

export default function KindnessIdeas() {
  const { t } = useLanguage();
  const { setShareModalOpen } = useUI();
  const [active, setActive] = useState<CategoryKey>("words");
  const [openIdea, setOpenIdea] = useState<string | null>(null);

  const ideas = useMemo(() => {
    const all = (t.inspiration as any).ideas as Record<CategoryKey, { title: string; why: string }[]>;
    return (all[active] || []).slice(0, 6);
  }, [t, active]);

  useEffect(() => {
    setShareModalOpen(openIdea !== null);
    return () => setShareModalOpen(false);
  }, [openIdea, setShareModalOpen]);

  return (
    <section id="ideas" className="section-padding pt-6 pb-20 md:pt-10 md:pb-28 lg:pb-36">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="headline-xl text-foreground mb-4">{t.inspiration.ideasHeading}</h2>
          <p className="body-lg text-muted-foreground max-w-2xl mx-auto">
            {t.inspiration.ideasBody}
          </p>
        </div>

        <div className="flex flex-col items-center gap-4 mb-12">
          <p className="text-sm uppercase tracking-[0.25em] text-muted-foreground">
            {t.inspiration.ideasFilterLabel}
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {CATEGORIES.map((c) => {
              const isActive = c.key === active;
              return (
                <button
                  key={c.key}
                  onClick={() => setActive(c.key)}
                  className={`px-5 py-2 rounded-full text-sm font-medium border transition-all ${
                    isActive
                      ? "bg-primary text-primary-foreground border-primary shadow-sm"
                      : "bg-card text-foreground/70 border-border hover:border-primary/50 hover:text-foreground"
                  }`}
                >
                  {(t.inspiration as any)[c.labelKey]}
                </button>
              );
            })}
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={active}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
            className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5"
          >
            {ideas.map((idea, i) => (
              <div
                key={`${active}-${i}`}
                className="group rounded-2xl border-2 border-border bg-card p-6 hover:border-primary hover:shadow-lg transition-all flex flex-col"
              >
                <h3
                  className="text-xl text-foreground mb-2 leading-snug"
                  style={{ fontFamily: "'DM Serif Display', serif" }}
                >
                  {idea.title}
                </h3>
                <p className="text-sm text-muted-foreground mb-5 flex-1">{idea.why}</p>
                <button
                  onClick={() => setOpenIdea(idea.title)}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-lg py-2.5 px-4 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  {t.inspiration.shareThis}
                </button>
              </div>
            ))}
          </motion.div>
        </AnimatePresence>
      </div>

      <Dialog open={openIdea !== null} onOpenChange={(o) => !o && setOpenIdea(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="headline-md text-foreground">
              {t.share.sectionHeading}
            </DialogTitle>
          </DialogHeader>
          <div className="pt-2 pb-2">
            <ShareActFlow
              initialMode="performed"
              initialDescription={openIdea ?? ""}
              onClose={() => setOpenIdea(null)}
            />
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
