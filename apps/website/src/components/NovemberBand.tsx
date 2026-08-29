import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "@shared/contexts/LanguageContext";

const NovemberBand = () => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const { t } = useLanguage();

  return (
    <section ref={ref} className="section-padding py-20 md:py-24 text-center">
      <div className="max-w-3xl mx-auto">
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          className="eyebrow mb-4"
        >
          {t.novemberBand.eyebrow}
        </motion.p>
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.1 }}
          className="headline-lg text-foreground mb-6"
        >
          {t.novemberBand.heading}
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.2 }}
          className="body-lg text-muted-foreground mb-10 max-w-2xl mx-auto"
        >
          {t.novemberBand.body}
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.3 }}
        >
          <Link to="/share" className="btn-primary">{t.novemberBand.cta}</Link>
        </motion.div>
      </div>
    </section>
  );
};

export default NovemberBand;
