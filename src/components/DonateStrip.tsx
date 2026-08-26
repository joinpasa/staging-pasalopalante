import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import community6 from "@/assets/community-6.jpg";

const DonateStrip = () => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const { t } = useLanguage();

  const amounts = [
    { amount: t.donate.amount1, impact: t.donate.impact1 },
    { amount: t.donate.amount2, impact: t.donate.impact2 },
    { amount: t.donate.amount3, impact: t.donate.impact3 },
  ];

  return (
    <section id="donate" ref={ref} className="relative overflow-hidden">
      <div className="absolute inset-0">
        <img src={community6} alt="Community support" className="w-full h-full object-cover" loading="lazy" />
        <div className="absolute inset-0 bg-foreground/75" />
      </div>

      <div className="relative section-padding section-spacing">
        <div className="max-w-3xl mx-auto text-center">
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            className="eyebrow !text-warm-gold mb-4"
          >
            {t.donate.eyebrow}
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.05 }}
            className="headline-lg text-warm-cream mb-6"
          >
            {t.donate.heading}
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.1 }}
            className="body-md text-warm-cream/80 mb-8"
          >
            {t.donate.body}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.2 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10"
          >
            {amounts.map((d) => (
              <div
                key={d.amount}
                className="bg-warm-cream/10 backdrop-blur-sm rounded-xl p-6 border border-warm-cream/10"
              >
                <p className="text-2xl font-bold text-warm-gold mb-2" style={{ fontFamily: "'DM Serif Display', serif" }}>
                  {d.amount}
                </p>
                <p className="text-sm text-warm-cream/70">{d.impact}</p>
              </div>
            ))}
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={inView ? { opacity: 1 } : {}}
            transition={{ delay: 0.3 }}
            className="text-warm-cream/60 text-sm italic mb-6"
          >
            {t.donate.note}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.4 }}
          >
            <div className="flex justify-center">
              <a
                href="https://www.paypal.com/ncp/payment/LQT3G3GLS8SWS"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary"
              >
                {t.donate.cta}
              </a>
            </div>
            <p className="text-warm-cream/60 text-sm italic mt-6">
              {t.donate.altMethods}{" "}
              <a href="mailto:info@teamopr.org" className="underline hover:text-warm-cream/80">info@teamopr.org</a>
            </p>
            <p className="text-warm-cream/50 text-xs mt-4">
              {t.donate.taxNote}
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default DonateStrip;
