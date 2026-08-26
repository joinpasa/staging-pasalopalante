import { motion, useInView } from "framer-motion";
import { useRef, useState, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";

const TARGET_DATE = new Date("2026-11-11T11:11:00-05:00");

function getTimeLeft() {
  const now = Date.now();
  const diff = TARGET_DATE.getTime() - now;
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 };
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  };
}

const TheMoment = () => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const [time, setTime] = useState(getTimeLeft);
  const { t } = useLanguage();

  useEffect(() => {
    const id = setInterval(() => setTime(getTimeLeft()), 1000);
    return () => clearInterval(id);
  }, []);

  const units = [
    { label: t.theMoment.days, value: time.days },
    { label: t.theMoment.hours, value: time.hours },
    { label: t.theMoment.minutes, value: time.minutes },
    { label: t.theMoment.seconds, value: time.seconds },
  ];

  return (
    <section ref={ref} className="section-padding section-spacing text-center relative overflow-hidden">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse at center, hsl(42 85% 62% / 0.08) 0%, transparent 70%)" }}
      />

      <div className="relative max-w-3xl mx-auto">
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          className="eyebrow mb-8"
        >
          {t.theMoment.eyebrow}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={inView ? { opacity: 1, scale: 1 } : {}}
          transition={{ delay: 0.2, duration: 0.8 }}
          className="mb-8 flex items-center justify-center gap-3 md:gap-6"
        >
          {units.map((u, i) => (
            <div key={u.label} className="flex items-center gap-3 md:gap-6">
              <div className="flex flex-col items-center">
                <span
                  className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-wider text-warm-terracotta tabular-nums"
                  style={{ fontFamily: "'DM Serif Display', serif" }}
                >
                  {String(u.value).padStart(2, "0")}
                </span>
                <span className="text-xs md:text-sm font-semibold tracking-widest uppercase text-muted-foreground mt-1">
                  {u.label}
                </span>
              </div>
              {i < units.length - 1 && (
                <span
                  className="text-4xl md:text-6xl lg:text-7xl font-bold text-warm-terracotta/40 -mt-6"
                  style={{ fontFamily: "'DM Serif Display', serif" }}
                >
                  :
                </span>
              )}
            </div>
          ))}
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.4 }}
          className="text-sm font-semibold tracking-widest uppercase text-muted-foreground mb-8"
        >
          {t.theMoment.date}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.5 }}
          className="space-y-4"
        >
          <p className="body-md text-muted-foreground">{t.theMoment.body1}</p>
          <p className="body-md text-muted-foreground">{t.theMoment.body2}</p>
          <p className="body-md text-foreground font-medium italic">{t.theMoment.body3}</p>
        </motion.div>
      </div>
    </section>
  );
};

export default TheMoment;
