import { useState } from "react";
import { Play } from "lucide-react";
import { useLanguage } from "@shared/contexts/LanguageContext";

const VIDEO_ID = "7QYC6u6xH0o";

const HeroVideo = () => {
  const { t } = useLanguage();
  const [playing, setPlaying] = useState(false);

  return (
    <div>
      <div
        className="relative aspect-video overflow-hidden rounded-[18px] border border-white/15 shadow-[0_28px_60px_rgba(0,0,0,0.4)]"
      >
        {playing ? (
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${VIDEO_ID}?autoplay=1`}
            title="Pásalo Pa'lante Anthem"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="w-full h-full"
          />
        ) : (
          <button
            type="button"
            onClick={() => setPlaying(true)}
            aria-label={t.anthem.heading}
            className="group relative w-full h-full block"
          >
            <img
              src={`https://img.youtube.com/vi/${VIDEO_ID}/maxresdefault.jpg`}
              alt=""
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-cyan-950/60 to-cyan-950/15" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="grid place-items-center w-[78px] h-[78px] rounded-full bg-primary shadow-[0_12px_32px_rgba(0,0,0,0.35)] transition-transform group-hover:scale-105">
                <Play size={28} className="text-primary-foreground fill-current ml-1" />
              </div>
            </div>
          </button>
        )}
      </div>
      <p className="mt-3 text-[13px] text-warm-cream/60">
        {t.hero.pressPlayPrefix}{" "}
        <a
          href={`https://www.youtube.com/watch?v=${VIDEO_ID}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-warm-gold hover:underline"
        >
          {t.hero.watchOnYouTube}
        </a>
        .
      </p>
    </div>
  );
};

export default HeroVideo;
