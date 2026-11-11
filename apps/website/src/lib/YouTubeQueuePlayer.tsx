import { useEffect, useRef, useState } from "react";
import { ExternalLink } from "lucide-react";
import { trackEvent } from "@/lib/analytics";

// Plays one YouTube video and, when `videoId` changes (the page's schedule
// moved on to the next segment), loads the new one in the same player, so
// viewers who are already watching switch over without a refresh. Uses
// YouTube's IFrame Player API, so no API key is needed.

interface YTPlayer {
  loadVideoById: (id: string) => void;
  destroy: () => void;
}
interface YTApi {
  Player: new (
    el: HTMLElement,
    opts: {
      width: string;
      height: string;
      videoId: string;
      playerVars: Record<string, number | string>;
      events: {
        onStateChange: (e: { data: number }) => void;
        onError: (e: { data: number }) => void;
      };
    },
  ) => YTPlayer;
}
declare global {
  interface Window {
    YT?: YTApi;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let apiPromise: Promise<void> | null = null;
function loadYouTubeApi(): Promise<void> {
  if (window.YT?.Player) return Promise.resolve();
  if (!apiPromise) {
    apiPromise = new Promise((resolve) => {
      const previous = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        previous?.();
        resolve();
      };
      const s = document.createElement("script");
      s.src = "https://www.youtube.com/iframe_api";
      s.async = true;
      document.head.appendChild(s);
    });
  }
  return apiPromise;
}

const PLAYING = 1;
const BUFFERING = 3;

export default function YouTubeQueuePlayer({
  videoId,
  title,
  blockedText,
  watchLabel,
}: {
  videoId: string;
  title: string;
  /** Shown over the player if YouTube refuses to play the current video here. */
  blockedText: string;
  watchLabel: string;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const currentRef = useRef(videoId);
  const [blocked, setBlocked] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<number | null>(null);

  // Create the player once.
  useEffect(() => {
    let dead = false;
    loadYouTubeApi().then(() => {
      if (dead || !hostRef.current || !window.YT) return;
      const mount = document.createElement("div");
      hostRef.current.appendChild(mount);
      playerRef.current = new window.YT.Player(mount, {
        width: "100%",
        height: "100%",
        videoId: currentRef.current,
        playerVars: { autoplay: 1, mute: 1, rel: 0, playsinline: 1, origin: window.location.origin },
        events: {
          onStateChange: (e) => {
            if (e.data === PLAYING || e.data === BUFFERING) setBlocked(null);
          },
          onError: (e) => {
            // YouTube's own code: 2 bad request, 5 player error, 100 not found,
            // 101/150 embedding turned off, 153 player configuration/referrer.
            setBlocked(currentRef.current);
            setErrorCode(e.data);
            trackEvent("live_player_error", { code: e.data, video_id: currentRef.current });
          },
        },
      });
    });
    return () => {
      dead = true;
      try {
        playerRef.current?.destroy();
      } catch {
        /* player already gone */
      }
      playerRef.current = null;
    };
  }, []);

  // Switch video when the schedule moves on.
  useEffect(() => {
    if (currentRef.current === videoId) return;
    currentRef.current = videoId;
    setBlocked(null);
    setErrorCode(null);
    playerRef.current?.loadVideoById(videoId);
  }, [videoId]);

  return (
    <div className="relative aspect-video w-full bg-black" aria-label={title}>
      <div ref={hostRef} className="h-full w-full [&>iframe]:h-full [&>iframe]:w-full" />
      {blocked && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/90 px-6 text-center">
          <p className="max-w-md text-base leading-relaxed text-white/90">{blockedText}</p>
          {errorCode !== null && <p className="text-xs text-white/50">YouTube error {errorCode}</p>}
          <a
            href={`https://www.youtube.com/watch?v=${blocked}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-[52px] items-center justify-center gap-2 rounded-full bg-warm-terracotta px-7 text-sm font-bold text-white transition-transform duration-200 hover:scale-105"
          >
            {watchLabel} <ExternalLink size={16} aria-hidden="true" />
          </a>
        </div>
      )}
    </div>
  );
}
