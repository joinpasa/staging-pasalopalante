import { useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { useLanguage } from "@shared/contexts/LanguageContext";

const VIDEO_ID = "7QYC6u6xH0o";

const HeroVideo = () => {
  const { t } = useLanguage();
  const [muted, setMuted] = useState(true);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    // Browsers only allow autoplay when muted, so the video starts muted and
    // this toggles it live via the YouTube postMessage API rather than
    // reloading the iframe (which would restart playback).
    iframeRef.current?.contentWindow?.postMessage(
      JSON.stringify({ event: "command", func: next ? "mute" : "unMute", args: [] }),
      "*",
    );
  };

  return (
    <div>
      <div className="relative aspect-video overflow-hidden rounded-[18px] border border-white/15 shadow-[0_28px_60px_rgba(0,0,0,0.4)]">
        <iframe
          ref={iframeRef}
          src={`https://www.youtube-nocookie.com/embed/${VIDEO_ID}?autoplay=1&mute=1&enablejsapi=1&playsinline=1`}
          title="Pásalo Pa'lante Anthem"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="w-full h-full"
        />
        <button
          type="button"
          onClick={toggleMute}
          aria-label={muted ? t.hero.unmute : t.hero.mute}
          className="absolute bottom-3 right-3 grid place-items-center w-9 h-9 rounded-full bg-cyan-950/70 text-white backdrop-blur-sm transition-colors hover:bg-cyan-950/90"
        >
          {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
        </button>
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
