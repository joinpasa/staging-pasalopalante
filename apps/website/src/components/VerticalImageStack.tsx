import { useState, useCallback, useEffect, useRef } from "react";
import { motion, type PanInfo } from "framer-motion";
import { useLanguage } from "@shared/contexts/LanguageContext";
import pplGroup from "@/assets/ppl-group.png";
import pplNoticentro from "@/assets/ppl-noticentro.png";
import pplGary from "@/assets/ppl-gary.png";
import pplMascot from "@/assets/ppl-mascot.png";
import pplReporter from "@/assets/ppl-reporter.png";
import pplUprm from "@/assets/ppl-uprm.png";
import pplBalkmania from "@/assets/ppl-balkmania.jpeg";
import pplFlagship from "@/assets/ppl-flagship.jpeg";
import pplTeamo from "@/assets/ppl-teamo.jpeg";
import pplDouglas from "@/assets/ppl-douglas.jpeg";
import pplPresenter from "@/assets/ppl-presenter.jpeg";
import pplPalanteGuy from "@/assets/ppl-palante-guy.jpeg";
import pplMayorCard from "@/assets/ppl-mayor-card.png";
import pplInterview from "@/assets/ppl-interview.png";
import pplMuevetuchi from "@/assets/ppl-muevetuchi.png";
import pplAndrewwong from "@/assets/ppl-andrewwong.png";
import pplAdamonzon from "@/assets/ppl-adamonzon.png";
import pplAthletes from "@/assets/ppl-athletes.png";
import pplAlcalde from "@/assets/ppl-alcalde.png";
import pplCollage from "@/assets/ppl-collage.png";

const images = [
  { id: 1, src: pplGroup, alt: "Pásalo Pa'lante community group gathering" },
  { id: 2, src: pplNoticentro, alt: "NotiCentro TV appearance and education partnership" },
  { id: 3, src: pplGary, alt: "Gary Rodriguez El Chef Sin Papeles with kindness card" },
  { id: 4, src: pplMascot, alt: "University mascot helping person cross the street" },
  { id: 5, src: pplReporter, alt: "Reporter showing Pásalo Pa'lante card at TV studio" },
  { id: 6, src: pplUprm, alt: "UPRM university representative supporting the movement" },
  { id: 7, src: pplBalkmania, alt: "Balkmania Cares promoting Pásalo Pa'lante" },
  { id: 8, src: pplFlagship, alt: "Young volunteers distributing supplies at night" },
  { id: 9, src: pplTeamo, alt: "Te Amo PR founder sharing the kindness card" },
  { id: 10, src: pplDouglas, alt: "Douglas Candelario mentoring youth" },
  { id: 11, src: pplPresenter, alt: "TV presenter inviting viewers to join Pásalo Pa'lante" },
  { id: 12, src: pplPalanteGuy, alt: "Community member promoting Pa'lante outdoors" },
  { id: 13, src: pplMayorCard, alt: "Mayor holding Pásalo Pa'lante kindness card" },
  { id: 14, src: pplInterview, alt: "Interview asking how would you pass it forward" },
  { id: 15, src: pplMuevetuchi, alt: "MuéveTuChi couple supporting the movement in the park" },
  { id: 16, src: pplAndrewwong, alt: "Andrew Wong PR supporting Pásalo Pa'lante" },
  { id: 17, src: pplAdamonzon, alt: "Ada Monzón meteorologist with kindness card" },
  { id: 18, src: pplAthletes, alt: "Athletes and community figures supporting the movement" },
  { id: 19, src: pplAlcalde, alt: "Alcalde de Toa Baja Bernardo Márquez" },
  { id: 20, src: pplCollage, alt: "Collage of celebrities and organizations supporting Pásalo Pa'lante" },
];

export function VerticalImageStack() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const { t } = useLanguage();
  const lastNavigationTime = useRef(0);
  const navigationCooldown = 400;
  const containerRef = useRef<HTMLDivElement>(null);

  const navigate = useCallback((newDirection: number) => {
    const now = Date.now();
    if (now - lastNavigationTime.current < navigationCooldown) return;
    lastNavigationTime.current = now;

    setCurrentIndex((prev) => {
      if (newDirection > 0) {
        return prev === images.length - 1 ? 0 : prev + 1;
      }
      return prev === 0 ? images.length - 1 : prev - 1;
    });
  }, []);

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const threshold = 50;
    if (info.offset.y < -threshold) {
      navigate(1);
    } else if (info.offset.y > threshold) {
      navigate(-1);
    }
  };

  const handleWheel = useCallback(
    (e: WheelEvent) => {
      if (Math.abs(e.deltaY) > 30) {
        e.preventDefault();
        if (e.deltaY > 0) {
          navigate(1);
        } else {
          navigate(-1);
        }
      }
    },
    [navigate]
  );

  useEffect(() => {
    const preloadedImages = images.map((image) => {
      const img = new Image();
      img.src = image.src;
      return img;
    });

    return () => {
      preloadedImages.forEach((img) => {
        img.src = "";
      });
    };
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [handleWheel]);

  const getRelativeDiff = (index: number) => {
    const total = images.length;
    let diff = index - currentIndex;
    if (diff > total / 2) diff -= total;
    if (diff < -total / 2) diff += total;
    return diff;
  };

  const getCardStyle = (index: number) => {
    const diff = getRelativeDiff(index);

    if (diff === 0) return { y: 0, scale: 1, opacity: 1, zIndex: 5, rotateX: 0 };
    if (diff === -1) return { y: -140, scale: 0.85, opacity: 0.6, zIndex: 4, rotateX: 8 };
    if (diff === -2) return { y: -240, scale: 0.72, opacity: 0.3, zIndex: 3, rotateX: 15 };
    if (diff === 1) return { y: 140, scale: 0.85, opacity: 0.6, zIndex: 4, rotateX: -8 };
    if (diff === 2) return { y: 240, scale: 0.72, opacity: 0.3, zIndex: 3, rotateX: -15 };
    return { y: diff > 0 ? 400 : -400, scale: 0.6, opacity: 0, zIndex: 0, rotateX: diff > 0 ? -20 : 20 };
  };

  return (
    <div ref={containerRef} className="relative flex items-center justify-center h-[500px]" style={{ perspective: "1200px" }}>
      <div className="relative w-[280px] h-[498px] md:w-[320px] md:h-[569px]">
        {images.map((image, index) => {
          const style = getCardStyle(index);
          const isCurrent = index === currentIndex;

          return (
            <motion.div
              key={image.id}
              className="absolute inset-0 cursor-grab active:cursor-grabbing"
              animate={style}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              drag={isCurrent ? "y" : false}
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={0.2}
              onDragEnd={isCurrent ? handleDragEnd : undefined}
              style={{ zIndex: style.zIndex, pointerEvents: style.opacity > 0 ? "auto" : "none" }}
            >
              <div className="relative w-full h-full rounded-2xl overflow-hidden shadow-xl">
                <div className="absolute inset-0 rounded-2xl ring-1 ring-foreground/10 z-10" />
                <img
                  src={image.src}
                  alt={image.alt}
                  className="w-full h-full object-cover"
                  draggable={false}
                />
                <div
                  className="absolute bottom-0 left-0 right-0 h-1/3 z-10"
                  style={{ background: "linear-gradient(to top, hsl(var(--background) / 0.4), transparent)" }}
                />
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Navigation dots */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-2 z-20">
        {images.map((_, index) => (
          <button
            key={index}
            onClick={() => {
              if (index !== currentIndex) setCurrentIndex(index);
            }}
            className={`w-2 rounded-full transition-all duration-300 ${
              index === currentIndex
                ? "h-6 bg-white"
                : "h-2 bg-white/40 hover:bg-white/60"
            }`}
            aria-label={`Go to image ${index + 1}`}
          />
        ))}
      </div>

      {/* Hint */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20">
        <p className="text-xs text-white/70 flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m18 15-6-6-6 6"/></svg>
          {t.verticalImageStack.hint}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
        </p>
      </div>

      {/* Counter */}
      <div className="absolute left-4 top-1/2 -translate-y-1/2 z-20">
        <div className="flex flex-col items-center gap-1">
          <span className="text-sm font-semibold text-white">
            {String(currentIndex + 1).padStart(2, "0")}
          </span>
          <div className="w-px h-4 bg-white/30" />
          <span className="text-sm text-white/60">
            {String(images.length).padStart(2, "0")}
          </span>
        </div>
      </div>
    </div>
  );
}

export default VerticalImageStack;
