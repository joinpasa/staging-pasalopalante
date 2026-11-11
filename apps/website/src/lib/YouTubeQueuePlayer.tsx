import { useEffect, useRef, useState } from "react";
import { ExternalLink } from "lucide-react";

// Plays a list of YouTube videos one after another: when the current one ends
// (a live stream finishing counts), the next one loads by itself; a scheduled
// stream that has not started yet shows YouTube's own waiting room and turns
// into the live stream when it starts. Uses YouTube's IFrame Player API, so no
// API key is needed.

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

const ENDED = 0;
const PLAYING = 1;
const BUFFERING = 3;

export default function YouTubeQueuePlayer({
  ids,
  title,
  blockedText,
  watchLabel,
  onVideoChange,
}: {
  ids: string[];
  title: string;
  /** Shown over the player if YouTube refuses to play the current video here. */
  blockedText: string;
  watchLabel: string;
  onVideoChange?: (id: string) => void;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const indexRef = useRef(0);
  const callbackRef = useRef(onVideoChange);
  callbackRef.current = onVideoChange;
  const [blocked, setBlocked] = useState<string | null>(null);
  const key = ids.join(",");

  useEffect(() => {
    let dead = false;
    let player: YTPlayer | null = null;
    indexRef.current = 0;
    setBlocked(null);
    callbackRef.current?.(ids[0]);
    loadYouTubeApi().then(() => {
      if (dead || !hostRef.current || !window.YT) return;
      const mount = document.createElement("div");
      hostRef.current.appendChild(mount);
      player = new window.YT.Player(mount, {
        width: "100%",
        height: "100%",
        videoId: ids[0],
        playerVars: { autoplay: 1, mute: 1, rel: 0, playsinline: 1, origin: window.location.origin },
        events: {
          onStateChange: (e) => {
            if (e.data === PLAYING || e.data === BUFFERING) setBlocked(null);
            if (e.data === ENDED && indexRef.current < ids.length - 1) {
              indexRef.current += 1;
              const next = ids[indexRef.current];
              setBlocked(null);
              callbackRef.current?.(next);
              player?.loadVideoById(next);
            }
          },
          onError: () => setBlocked(ids[indexRef.current]),
        },
      });
    });
    return () => {
      dead = true;
      try {
        player?.destroy();
      } catch {
        /* player already gone */
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return (
    <div className="relative aspect-video w-full bg-black" aria-label={title}>
      <div ref={hostRef} className="h-full w-full [&>iframe]:h-full [&>iframe]:w-full" />
      {blocked && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/90 px-6 text-center">
          <p className="max-w-md text-base leading-relaxed text-white/90">{blockedText}</p>
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
