import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Handshake, Users } from "lucide-react";
import community4 from "@/assets/community-4.jpg";
import community5 from "@/assets/community-5.jpg";
import { useLanguage } from "@shared/contexts/LanguageContext";
import { useUI } from "@shared/contexts/UIContext";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.12, duration: 0.7 },
  }),
};

const TwoPaths = () => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const { t } = useLanguage();
  const { openShareModal } = useUI();

  return (
    <section id="join" ref={ref} className="bg-warm-sand section-padding section-spacing">
      <div className="max-w-6xl mx-auto">
        <motion.p custom={0} variants={fadeUp} initial="hidden" animate={inView ? "visible" : "hidden"} className="eyebrow mb-4 text-center">
          {t.twoPaths.eyebrow}
        </motion.p>

        <motion.h2 custom={1} variants={fadeUp} initial="hidden" animate={inView ? "visible" : "hidden"} className="headline-lg text-foreground mb-4 text-center">
          {t.twoPaths.heading}
        </motion.h2>

        <motion.p custom={2} variants={fadeUp} initial="hidden" animate={inView ? "visible" : "hidden"} className="body-lg text-muted-foreground max-w-2xl mx-auto text-center mb-16">
          {t.twoPaths.body}
        </motion.p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <motion.div custom={3} variants={fadeUp} initial="hidden" animate={inView ? "visible" : "hidden"} className="bg-background rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
            <div className="h-64 overflow-hidden">
              <img src={community4} alt="Individual acts of kindness" className="w-full h-full object-cover" style={{ objectPosition: '50% 57%' }} loading="lazy" />
            </div>
            <div className="p-8 md:p-10">
              <div className="w-12 h-12 rounded-full bg-warm-blush flex items-center justify-center mb-4">
                <Handshake className="w-5 h-5 text-warm-terracotta" />
              </div>
              <h3 className="headline-md text-foreground mb-2">{t.twoPaths.indTitle}</h3>
              <p className="text-muted-foreground font-medium mb-4">{t.twoPaths.indSubtitle}</p>
              <p className="text-muted-foreground mb-6 text-sm leading-relaxed">{t.twoPaths.indBody}</p>
              <p className="text-foreground font-semibold mb-3 text-sm">{t.twoPaths.whatYouGet}</p>
              <ul className="space-y-2 mb-8 text-sm text-foreground/80">
                <li>{t.twoPaths.indBullet1}</li>
                <li>{t.twoPaths.indBullet2}</li>
                <li>{t.twoPaths.indBullet3}</li>
                <li>{t.twoPaths.indBullet4}</li>
                <li>{t.twoPaths.indBullet5}</li>
              </ul>
              <button type="button" onClick={() => openShareModal()} className="btn-primary w-full text-center">
                {t.twoPaths.indCta}
              </button>
            </div>
          </motion.div>

          <motion.div custom={4} variants={fadeUp} initial="hidden" animate={inView ? "visible" : "hidden"} className="bg-background rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
            <div className="h-64 overflow-hidden">
              <img src={community5} alt="Community organizations" className="w-full h-full object-cover object-top" loading="lazy" />
            </div>
            <div className="p-8 md:p-10">
              <div className="w-12 h-12 rounded-full bg-warm-blush flex items-center justify-center mb-4">
                <Users className="w-5 h-5 text-warm-terracotta" />
              </div>
              <h3 className="headline-md text-foreground mb-2">{t.twoPaths.ambTitle}</h3>
              <p className="text-muted-foreground font-medium mb-4">{t.twoPaths.ambSubtitle}</p>
              <p className="text-muted-foreground mb-6 text-sm leading-relaxed">{t.twoPaths.ambBody}</p>
              <p className="text-foreground font-semibold mb-3 text-sm">{t.twoPaths.whatYouGet}</p>
              <ul className="space-y-2 mb-8 text-sm text-foreground/80">
                <li>{t.twoPaths.ambBullet1}</li>
                <li>{t.twoPaths.ambBullet2}</li>
                <li>{t.twoPaths.ambBullet3}</li>
                <li>{t.twoPaths.ambBullet4}</li>
              </ul>
              <a href="/commit" className="btn-secondary w-full text-center">
                {t.twoPaths.ambCta}
              </a>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default TwoPaths;
