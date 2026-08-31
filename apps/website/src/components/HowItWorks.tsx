import { motion, useInView, useAnimation } from "framer-motion";
import { useRef, useCallback, useEffect } from "react";
import { ArrowUpRight, Check, Heart, ArrowRight, Smartphone, Sparkles } from "lucide-react";
import { useLanguage } from "@shared/contexts/LanguageContext";
import ShareActCTA from "@shared/components/share/ShareActCTA";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.15, duration: 0.7 },
  }),
};

const heartBeat = {
  idle: { scale: 1 },
  animate: {
    scale: [1, 1.15, 1, 1.12, 1],
    transition: { duration: 1.5, repeat: 1, repeatDelay: 0.2, ease: "easeInOut" as const },
  },
};

const arrowSlide = {
  idle: { x: 0 },
  animate: {
    x: [0, 40, 40, -40, -40, 0],
    transition: { duration: 3, times: [0, 0.25, 0.45, 0.45, 0.65, 0.9], ease: "easeInOut" as const },
  },
};

const sparkle = {
  idle: { scale: 1, rotate: 0, opacity: 1 },
  animate: {
    scale: [1, 1.15, 0.9, 1.1, 1],
    rotate: [0, 10, -10, 5, 0],
    opacity: [1, 0.7, 1, 0.65, 1],
    transition: { duration: 1.5, repeat: 1, repeatDelay: 0.2, ease: "easeInOut" as const },
  },
};

const iconVariants = [heartBeat, arrowSlide, sparkle];
const icons = [Heart, ArrowRight, Sparkles];

const StepCard = ({ title, body, i, inView }: { title: string; body: string; i: number; inView: boolean }) => {
  const controls = useAnimation();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isHovering = useRef(false);

  const runAnimation = useCallback(() => {
    controls.start("animate").then(() => controls.set("idle"));
  }, [controls]);

  const handleMouseEnter = useCallback(() => {
    isHovering.current = true;
    runAnimation();
    intervalRef.current = setInterval(() => {
      if (isHovering.current) runAnimation();
    }, 6000);
  }, [runAnimation]);

  const handleMouseLeave = useCallback(() => {
    isHovering.current = false;
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    controls.stop();
    controls.set("idle");
  }, [controls]);

  useEffect(() => {
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  const Icon = icons[i];

  return (
    <motion.div
      custom={3 + i}
      variants={fadeUp}
      initial="hidden"
      animate={inView ? "visible" : "hidden"}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="bg-background rounded-2xl p-8 md:p-10 shadow-sm hover:shadow-md transition-shadow"
    >
      <div className={`w-14 h-14 rounded-full bg-warm-blush flex items-center justify-center mb-6 ${i === 1 ? 'overflow-hidden' : ''}`}>
        <motion.div variants={iconVariants[i]} initial="idle" animate={controls}>
          <Icon className="w-6 h-6 text-warm-terracotta" />
        </motion.div>
      </div>
      <span className="text-xs font-bold text-warm-terracotta tracking-widest uppercase">
        Step {i + 1}
      </span>
      <h3 className="headline-md !text-xl md:!text-2xl text-foreground mt-2 mb-4">{title}</h3>
      <p className="text-muted-foreground leading-relaxed">{body}</p>
    </motion.div>
  );
};

const HowItWorks = () => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const { t } = useLanguage();

  const steps = [
    { title: t.howItWorks.step1Title, body: t.howItWorks.step1Body },
    { title: t.howItWorks.step2Title, body: t.howItWorks.step2Body },
    { title: t.howItWorks.step3Title, body: t.howItWorks.step3Body },
  ];

  const checks = [t.howItWorks.inlineFormCheck1, t.howItWorks.inlineFormCheck2, t.howItWorks.inlineFormCheck3];

  return (
    <section id="how-it-works" ref={ref} className="bg-warm-sand section-padding section-spacing">
      <div className="max-w-6xl mx-auto">
        <motion.p custom={0} variants={fadeUp} initial="hidden" animate={inView ? "visible" : "hidden"} className="eyebrow mb-4">
          {t.howItWorks.eyebrow}
        </motion.p>

        <motion.h2 custom={1} variants={fadeUp} initial="hidden" animate={inView ? "visible" : "hidden"} className="headline-lg text-foreground mb-4">
          {t.howItWorks.heading}
        </motion.h2>

        <motion.p custom={2} variants={fadeUp} initial="hidden" animate={inView ? "visible" : "hidden"} className="body-lg text-muted-foreground max-w-2xl mb-16">
          {t.howItWorks.body}
        </motion.p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10">
          {steps.map((step, i) => (
            <StepCard key={i} title={step.title} body={step.body} i={i} inView={inView} />
          ))}
        </div>

        {/* App strip — deliberately not a 4th step */}
        <motion.div
          custom={6}
          variants={fadeUp}
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
          className="flex items-center justify-between flex-wrap gap-7 bg-warm-cream border border-border rounded-2xl px-8 py-6 mb-10"
          style={{ borderLeft: "4px solid #164e63" }}
        >
          <div className="flex items-center gap-5">
            <div className="shrink-0 w-[46px] h-[46px] rounded-xl bg-cyan-900/10 flex items-center justify-center">
              <Smartphone size={22} className="text-cyan-900" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-900 mb-1">
                {t.howItWorks.appStripEyebrow}
              </p>
              <h3 className="headline-md !text-2xl text-foreground mb-1">{t.howItWorks.appStripHeading}</h3>
              <p className="text-sm text-muted-foreground">{t.howItWorks.appStripBody}</p>
            </div>
          </div>
          <a
            href="https://app.pasalopalante.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full bg-cyan-900 px-6 py-3.5 text-sm font-semibold text-warm-cream hover:bg-cyan-900/90 transition-colors shrink-0"
          >
            {t.howItWorks.appStripCta}
            <ArrowUpRight size={17} />
          </a>
        </motion.div>

        {/* Inline share form */}
        <motion.div
          id="share-inline"
          custom={7}
          variants={fadeUp}
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
          className="grid grid-cols-1 lg:grid-cols-2 rounded-3xl overflow-hidden shadow-[0_24px_60px_rgba(0,0,0,0.08)]"
        >
          <div className="bg-[hsl(20_35%_30%)] px-6 py-10 md:px-11 md:py-14 flex flex-col justify-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-warm-gold mb-3">
              {t.howItWorks.inlineFormEyebrow}
            </p>
            <h3 className="headline-lg !text-3xl md:!text-4xl text-warm-cream mb-4">
              {t.howItWorks.inlineFormHeading}
            </h3>
            <p className="text-warm-cream/80 mb-7 leading-relaxed">{t.howItWorks.inlineFormBody}</p>
            <div className="space-y-3">
              {checks.map((c) => (
                <div key={c} className="flex items-start gap-2.5">
                  <Check size={18} className="text-warm-gold shrink-0 mt-0.5" />
                  <span className="text-[15.5px] text-warm-cream/90">{c}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-warm-cream px-6 py-8 md:px-12 md:py-13">
            <ShareActCTA variant="inline" />
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default HowItWorks;
