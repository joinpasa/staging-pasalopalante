import { motion, useInView } from "framer-motion";
import { useRef, useEffect, useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";

function AnimatedNumber({ value, suffix, inView }: { value: number; suffix: string; inView: boolean }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const duration = 2000;
    const steps = 60;
    const increment = value / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= value) {
        setDisplay(value);
        clearInterval(timer);
      } else {
        setDisplay(Math.floor(current));
      }
    }, duration / steps);
    return () => clearInterval(timer);
  }, [inView, value]);

  return (
    <span>
      {display.toLocaleString()}{suffix}
    </span>
  );
}

const ImpactTicker = () => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });
  const { t } = useLanguage();

  const stats = [
    { value: 1135096, label: t.impactTicker.stat1Label, suffix: "" },
    { value: 78, label: t.impactTicker.stat2Label, suffix: "" },
    { value: 270000, label: t.impactTicker.stat3Label, suffix: "+" },
  ];

  return (
    <section ref={ref} className="bg-warm-gold section-padding py-16 md:py-20">
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-6 text-center">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: i * 0.2 }}
          >
            <p className="text-4xl md:text-5xl font-bold text-foreground mb-2" style={{ fontFamily: "'DM Serif Display', serif" }}>
              <AnimatedNumber value={stat.value} suffix={stat.suffix} inView={inView} />
            </p>
            <p className="text-foreground/70 text-sm tracking-wide uppercase font-medium">
              {stat.label}
            </p>
          </motion.div>
        ))}
      </div>
    </section>
  );
};

export default ImpactTicker;
