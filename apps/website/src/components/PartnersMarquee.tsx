import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useLanguage } from "@shared/contexts/LanguageContext";
import { usePartnerDirectory, type PartnerEntry } from "@/hooks/usePartnerDirectory";

const VISIBLE_COUNT = 8;
const ROTATE_MS = 4000;

function shuffled(logos: PartnerEntry[]) {
  const copy = [...logos];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

const PartnersMarquee = () => {
  const { t } = useLanguage();
  const { data: partners } = usePartnerDirectory();

  // Dark-flagged logos are made for a dark background (see PartnersPage) —
  // this strip only has a light one, so they'd render invisible here.
  const logos = useMemo(() => (partners ?? []).filter((p) => p.logoUrl && !p.dark), [partners]);

  const [round, setRound] = useState(0);

  useEffect(() => {
    if (logos.length <= VISIBLE_COUNT) return;
    const id = setInterval(() => setRound((r) => r + 1), ROTATE_MS);
    return () => clearInterval(id);
  }, [logos.length]);

  const visible = useMemo(() => shuffled(logos).slice(0, VISIBLE_COUNT), [logos, round]);

  if (logos.length === 0) return null;

  return (
    <section className="bg-background border-y border-border py-12 md:py-14">
      <div className="max-w-6xl mx-auto section-padding">
        <p className="text-center text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground mb-8">
          {t.partnersMarquee.heading}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-8 min-h-[64px]">
          <AnimatePresence mode="popLayout">
            {visible.map((partner) => (
              <motion.img
                key={partner.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
                src={partner.logoUrl!}
                alt={partner.name}
                loading="lazy"
                className="h-16 w-auto max-w-[180px] object-contain opacity-90 grayscale transition-all hover:opacity-100 hover:grayscale-0"
              />
            ))}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
};

export default PartnersMarquee;
