import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { useLanguage } from "@/contexts/LanguageContext";

const ScienceProof = () => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const { t } = useLanguage();

  const proofStats = [
    { value: t.scienceProof.stat1Value, label: t.scienceProof.stat1Label, sub: "" },
    { value: t.scienceProof.stat2Value, label: t.scienceProof.stat2Label, sub: "" },
    { value: t.scienceProof.stat3Value, label: t.scienceProof.stat3Label, sub: t.scienceProof.stat3Sub },
    { value: t.scienceProof.stat4Value, label: t.scienceProof.stat4Label, sub: "" },
  ];

  return (
    <section id="proof" ref={ref} className="section-padding section-spacing text-warm-cream bg-cyan-900">
      <div className="max-w-6xl mx-auto">
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          className="eyebrow !text-warm-gold mb-4"
        >
          {t.scienceProof.eyebrow}
        </motion.p>

        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.1 }}
          className="headline-lg text-warm-cream mb-4"
        >
          {t.scienceProof.heading}
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.2 }}
          className="body-lg text-warm-cream/80 max-w-3xl mb-16"
        >
          {t.scienceProof.bodyPart1}{" "}
          <strong className="text-warm-cream font-bold">{t.scienceProof.bodyBold}</strong>{" "}
          {t.scienceProof.bodyPart2}
        </motion.p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-16">
          {proofStats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.3 + i * 0.1 }}
              className="text-center"
            >
              <p className="text-3xl md:text-4xl font-bold text-warm-gold mb-2" style={{ fontFamily: "'DM Serif Display', serif" }}>
                {stat.value}
              </p>
              <p className="text-sm text-warm-cream/60 leading-tight">{stat.label}</p>
              {stat.sub && (
                <p className="text-xs text-warm-cream/45 leading-tight mt-1">{stat.sub}</p>
              )}
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.7 }}
          className="bg-warm-cream/10 backdrop-blur-sm rounded-2xl p-8 md:p-10 border border-warm-cream/10"
        >
          <p className="body-md text-warm-cream/90 italic">
            {t.scienceProof.quote}
          </p>
          <a
            href="https://gcp2.net/data-results"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block mt-4 text-warm-gold font-semibold hover:underline text-sm"
          >
            {t.scienceProof.quoteLink}
          </a>
        </motion.div>
      </div>
    </section>
  );
};

export default ScienceProof;
