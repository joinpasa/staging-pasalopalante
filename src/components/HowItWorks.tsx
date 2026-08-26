import { motion, useInView, useAnimation } from "framer-motion";
import { useRef, useCallback, useEffect } from "react";
import { Heart, ArrowRight, Sparkles } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          {steps.map((step, i) => (
            <StepCard key={i} title={step.title} body={step.body} i={i} inView={inView} />
          ))}
        </div>

        <motion.div custom={6} variants={fadeUp} initial="hidden" animate={inView ? "visible" : "hidden"} className="text-center mt-12">
          <a href="/share" className="btn-primary">{t.howItWorks.cta}</a>
        </motion.div>
      </div>
    </section>
  );
};

export default HowItWorks;
