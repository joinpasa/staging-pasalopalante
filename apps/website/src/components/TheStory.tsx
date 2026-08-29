import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import VerticalImageStack from "@/components/VerticalImageStack";
import { useLanguage } from "@shared/contexts/LanguageContext";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.15, duration: 0.7 },
  }),
};

const TheStory = () => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const { t } = useLanguage();

  return (
    <section id="story" ref={ref} className="section-padding section-spacing">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16">
          <div className="lg:col-span-7 space-y-8">
            <motion.p
              custom={0}
              variants={fadeUp}
              initial="hidden"
              animate={inView ? "visible" : "hidden"}
              className="eyebrow mb-4"
            >
              {t.story.eyebrow}
            </motion.p>

            <motion.h2
              custom={1}
              variants={fadeUp}
              initial="hidden"
              animate={inView ? "visible" : "hidden"}
              className="headline-lg text-foreground"
            >
              {t.story.heading.split("\n").map((line, i) => (
                <span key={i}>
                  {line}
                  {i === 0 && <br />}
                </span>
              ))}
            </motion.h2>

            <motion.blockquote
              custom={2}
              variants={fadeUp}
              initial="hidden"
              animate={inView ? "visible" : "hidden"}
              className="bg-warm-blush border-l-4 border-warm-terracotta rounded-r-lg p-8 md:p-10"
            >
              <p className="body-lg text-foreground/90 italic leading-relaxed">
                {t.story.quote}
              </p>
              <cite className="block mt-4 text-sm font-semibold text-foreground/60 not-italic">
                {t.story.quoteCite}
              </cite>
            </motion.blockquote>

            <motion.div
              custom={3}
              variants={fadeUp}
              initial="hidden"
              animate={inView ? "visible" : "hidden"}
              className="space-y-6"
            >
              <p className="body-md text-muted-foreground">{t.story.body1}</p>
              <p className="body-md text-muted-foreground">{t.story.body2}</p>
              <p className="body-md text-muted-foreground">{t.story.body3}</p>
              <p className="body-md text-muted-foreground">{t.story.body4}</p>
              <p className="body-lg text-foreground font-medium mt-4">{t.story.closing}</p>
            </motion.div>
          </div>

          <motion.div
            custom={4}
            variants={fadeUp}
            initial="hidden"
            animate={inView ? "visible" : "hidden"}
            className="lg:col-span-5 flex items-center justify-center pt-[9.375rem] pb-[10.625rem] lg:pt-0 lg:pb-0"
          >
            <VerticalImageStack />
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default TheStory;
