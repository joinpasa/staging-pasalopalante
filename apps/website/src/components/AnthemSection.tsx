import { motion, useInView } from "framer-motion";
import { useRef, useState } from "react";
import { Play } from "lucide-react";
import { useLanguage } from "@shared/contexts/LanguageContext";

const VIDEO_ID = "7QYC6u6xH0o";

const AnthemSection = () => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const { t } = useLanguage();
  // This embed never autoplayed - someone always had to click YouTube's own
  // play button first. Not loading the real iframe (and the YouTube player
  // JS, cookies, and thumbnail requests that come with it) until that same
  // click happens is a free win: identical experience for anyone who
  // watches, nothing fetched for anyone who doesn't.
  const [playing, setPlaying] = useState(false);

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
          className="relative aspect-video rounded-2xl overflow-hidden shadow-xl bg-foreground/10"
        >
          {playing ? (
            <iframe
              src={`https://www.youtube.com/embed/${VIDEO_ID}?autoplay=1`}
              title="Pásalo Pa'lante Anthem"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-full h-full"
            />
          ) : (
            <button
              type="button"
              onClick={() => setPlaying(true)}
              aria-label={t.anthem.playAria}
              className="group absolute inset-0 h-full w-full"
            >
              <img
                src={`https://i.ytimg.com/vi/${VIDEO_ID}/hqdefault.jpg`}
                alt=""
                loading="lazy"
                className="h-full w-full object-cover"
              />
              <span className="absolute inset-0 flex items-center justify-center bg-black/30 transition-colors group-hover:bg-black/40">
                <span className="grid h-16 w-16 place-items-center rounded-full bg-white/90 text-foreground shadow-lg transition-transform group-hover:scale-105">
                  <Play size={28} className="ml-1" fill="currentColor" />
                </span>
              </span>
            </button>
          )}
        </motion.div>
      </div>
    </section>
  );
};

export default AnthemSection;
