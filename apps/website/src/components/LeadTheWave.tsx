import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import ambassadorLeading from "@/assets/ambassador-leading.jpg";
import { useLanguage } from "@shared/contexts/LanguageContext";
import { useAmbassadors } from "@/hooks/useAmbassadors";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7 } },
};

const LeadTheWave = () => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const { t } = useLanguage();
  const lw = t.leadTheWave;
  const { data: ambassadors } = useAmbassadors();
  const ambassadorCount = ambassadors?.length ?? 0;

  return (
    <section ref={ref} className="bg-warm-sand section-padding py-14 md:py-20">
      <div className="max-w-6xl mx-auto">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
          className="text-center max-w-xl mx-auto mb-10"
        >
          <p className="eyebrow mb-3">{lw.eyebrow}</p>
          <h2 className="headline-lg text-foreground mb-4">{lw.headline}</h2>
          <p className="body-md text-muted-foreground">{lw.body}</p>
        </motion.div>

        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
          className="flex flex-col lg:flex-row bg-background border border-border rounded-3xl overflow-hidden shadow-sm"
        >
          <div className="relative lg:w-[42%] min-h-[320px] lg:min-h-0 shrink-0">
            <img
              src={ambassadorLeading}
              alt={lw.photoAlt}
              className="absolute inset-0 w-full h-full object-cover"
              loading="lazy"
            />
            {ambassadorCount > 0 && (
              <div className="absolute left-5 bottom-5 bg-background rounded-2xl px-4 py-3 shadow-lg">
                <p className="headline-md text-foreground leading-none">{ambassadorCount}+</p>
                <p className="text-xs font-bold text-warm-terracotta mt-1">{lw.statLabel}</p>
              </div>
            )}
          </div>

          <div className="flex-1 p-8 md:p-11">
            <ul className="flex flex-wrap gap-2 mb-6 list-none p-0">
              <li className="bg-warm-blush text-warm-terracotta rounded-full px-3.5 py-1.5 text-xs font-bold">{lw.tag1}</li>
              <li className="bg-warm-blush text-warm-terracotta rounded-full px-3.5 py-1.5 text-xs font-bold">{lw.tag2}</li>
              <li className="bg-warm-blush text-warm-terracotta rounded-full px-3.5 py-1.5 text-xs font-bold">{lw.tag3}</li>
            </ul>

            <h3 className="headline-md text-foreground mb-2">{lw.subheading}</h3>
            <p className="text-muted-foreground mb-6 text-sm leading-relaxed">{lw.subbody}</p>

            <p className="text-sm font-bold text-foreground mb-3">{lw.howItWorks}</p>
            <div className="flex flex-wrap gap-5 mb-8">
              <div className="flex-1 min-w-[130px]">
                <p className="headline-md text-warm-terracotta mb-1">1</p>
                <p className="text-sm font-bold text-foreground mb-0.5">{lw.step1Title}</p>
                <p className="text-xs text-muted-foreground leading-snug">{lw.step1Body}</p>
              </div>
              <div className="flex-1 min-w-[130px]">
                <p className="headline-md text-warm-terracotta mb-1">2</p>
                <p className="text-sm font-bold text-foreground mb-0.5">{lw.step2Title}</p>
                <p className="text-xs text-muted-foreground leading-snug">{lw.step2Body}</p>
              </div>
              <div className="flex-1 min-w-[130px]">
                <p className="headline-md text-warm-terracotta mb-1">3</p>
                <p className="text-sm font-bold text-foreground mb-0.5">{lw.step3Title}</p>
                <p className="text-xs text-muted-foreground leading-snug">{lw.step3Body}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <a href="/get-involved/ambassadors" className="btn-primary">
                {lw.applyCta} →
              </a>
              <a href="/get-involved/schools" className="btn-secondary">
                {lw.pledgeCta}
              </a>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default LeadTheWave;
