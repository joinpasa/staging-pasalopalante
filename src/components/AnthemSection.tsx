import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { useLanguage } from "@/contexts/LanguageContext";

const AnthemSection = () => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const { t } = useLanguage();

  return (
    <section id="anthem" ref={ref} className="section-padding section-spacing">
      <div className="max-w-4xl mx-auto text-center">
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.1 }}
          className="eyebrow mb-4"
        >
          {t.anthem.eyebrow}
        </motion.p>

        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.2 }}
          className="headline-lg text-foreground mb-4"
        >
          {t.anthem.heading}
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.3 }}
          className="body-lg text-muted-foreground mb-12 max-w-2xl mx-auto"
        >
          {t.anthem.body}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={inView ? { opacity: 1, scale: 1 } : {}}
          transition={{ delay: 0.5, duration: 0.6 }}
          className="aspect-video rounded-2xl overflow-hidden shadow-xl"
        >
          <iframe
            src="https://www.youtube.com/embed/7QYC6u6xH0o"
            title="Pásalo Pa'lante Anthem"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="w-full h-full"
          />
        </motion.div>
      </div>
    </section>
  );
};

export default AnthemSection;
