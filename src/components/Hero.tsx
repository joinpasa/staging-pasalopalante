import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { RippleCanvas } from "@/components/ui/ripple-canvas";
import TopActsStack from "@/components/hero/TopActsStack";

const COUNTDOWN_TARGET = new Date("2026-11-01T00:00:00-04:00").getTime();

function getTimeLeft() {
  const diff = COUNTDOWN_TARGET - Date.now();
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 };
  return {
    days: Math.floor(diff / 86400000),
    hours: Math.floor((diff / 3600000) % 24),
    minutes: Math.floor((diff / 60000) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  };
}

const Hero = () => {
  const { t } = useLanguage();
  const [time, setTime] = useState(getTimeLeft);

  useEffect(() => {
    const id = setInterval(() => setTime(getTimeLeft()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden bg-cyan-900">
      {/* Faint digitized world map — underneath the ripple wave */}
      <img
        src="/world-map.svg"
        alt=""
        aria-hidden="true"
        className="absolute inset-0 w-full h-full object-cover opacity-[0.07] pointer-events-none z-0"
        style={{ filter: "invert(1) brightness(1.2) hue-rotate(160deg) saturate(0.6)" }}
      />

      {/* Ambient pond ripples — aqua, calm, automatic */}
      <RippleCanvas className="z-[1]" />

      {/* Left-side readability gradient */}
      <div className="absolute inset-0 z-[2] pointer-events-none bg-gradient-to-r from-cyan-950/80 via-cyan-900/45 to-cyan-900/10" />
      {/* Soft vignette */}
      <div
        className="absolute inset-0 z-[2] pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 45%, rgba(8,47,73,0.55) 100%)",
        }}
      />


      <div className="relative z-10 section-padding w-full pt-32 pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          <div className="lg:col-span-7">
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="eyebrow !text-warm-gold mb-6"
            >
              {t.hero.eyebrow}
            </motion.p>

            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.8 }}
              className="headline-xl text-warm-cream mb-8"
            >
              <span dangerouslySetInnerHTML={{ __html: t.hero.title }} />
            </motion.h1>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="space-y-4 mb-12"
            >
              <p className="body-lg text-warm-cream/90 max-w-2xl">
                {t.hero.body1}
              </p>
              <p className="body-lg text-warm-cream/90 max-w-2xl">
                {t.hero.body2}
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.0 }}
              className="mb-8"
              aria-label={t.hero.countdownLabel}
            >
              <p className="text-xs md:text-sm font-semibold tracking-widest uppercase text-warm-gold mb-3">
                {t.hero.countdownLabel}
              </p>
              <div className="flex items-center gap-2 md:gap-4">
                {[
                  { label: t.hero.days, value: time.days },
                  { label: t.hero.hours, value: time.hours },
                  { label: t.hero.minutes, value: time.minutes },
                  { label: t.hero.seconds, value: time.seconds },
                ].map((u, i, arr) => (
                  <div key={u.label} className="flex items-center gap-2 md:gap-4">
                    <div className="flex flex-col items-center min-w-[56px] md:min-w-[72px] rounded-lg bg-white/10 backdrop-blur-sm border border-white/15 px-3 py-2">
                      <span
                        className="text-2xl md:text-4xl font-bold text-warm-cream tabular-nums leading-none"
                        style={{ fontFamily: "'DM Serif Display', serif" }}
                      >
                        {String(u.value).padStart(2, "0")}
                      </span>
                      <span className="text-[10px] md:text-xs uppercase tracking-wider text-warm-cream/70 mt-1">
                        {u.label}
                      </span>
                    </div>
                    {i < arr.length - 1 && (
                      <span className="text-2xl md:text-3xl text-warm-cream/40 font-bold">:</span>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.1 }}
              className="flex flex-col sm:flex-row gap-4"
            >
              <a
                href="/get-involved"
                className="btn-primary !text-lg md:!text-xl !px-10 md:!px-12 !py-5 md:!py-6 shadow-xl"
              >
                {t.hero.cta}
              </a>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.0, duration: 0.8 }}
            className="lg:col-span-5 w-full"
          >
            <TopActsStack />
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
