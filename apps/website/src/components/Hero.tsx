import { motion } from "framer-motion";
import { useLanguage } from "@shared/contexts/LanguageContext";
import { RippleCanvas } from "@shared/components/ui/ripple-canvas";
import { smoothScrollTo } from "@shared/lib/smoothScrollTo";
import HeroVideo from "@/components/hero/HeroVideo";

const Hero = () => {
  const { t } = useLanguage();

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden bg-cyan-900">
      {/* Faint digitized world map — underneath the ripple wave */}
      <img
        src="/world-map.svg"
        alt=""
        aria-hidden="true"
        fetchPriority="high"
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
          <div className="lg:col-span-6">
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
              className="headline-xl lg:text-5xl xl:text-6xl text-warm-cream mb-8 [&_em]:text-warm-gold"
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
              transition={{ delay: 1.1 }}
              className="flex flex-wrap items-center gap-[18px]"
            >
              <button
                type="button"
                onClick={() => {
                  const onHome = window.location.pathname === "/";
                  if (onHome) smoothScrollTo("get-involved-inline");
                  else window.location.href = "/#get-involved-inline";
                }}
                className="rounded-full bg-primary px-8 py-5 text-base md:text-lg font-semibold uppercase tracking-[0.06em] text-primary-foreground shadow-[0_14px_34px_rgba(0,0,0,0.28)] transition-transform hover:scale-[1.04]"
              >
                {t.navbar.makePledge}
              </button>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.0, duration: 0.8 }}
            className="lg:col-span-6 w-full"
          >
            <HeroVideo />
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
