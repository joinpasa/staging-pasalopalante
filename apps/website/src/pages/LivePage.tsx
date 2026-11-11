import { Fragment, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { CalendarPlus, Check, Clock, ExternalLink, Link2, Play, Radio, Share2 } from "lucide-react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ScrollToTop from "@/components/ScrollToTop";
import SEO from "@/components/SEO";
import { useScrollToHash } from "@/hooks/useScrollToHash";
import { useLanguage } from "@shared/contexts/LanguageContext";
import { LIVE_END, LIVE_FROM, isLivePreview } from "@/lib/liveBroadcast";
import { trackEvent } from "@/lib/analytics";
import { useLiveStream } from "@/lib/useLiveStream";
import YouTubeQueuePlayer from "@/lib/YouTubeQueuePlayer";

// /live: the 11.11.2026 Global Live Broadcast event page. All copy lives in
// the `livePage` namespace of the i18n files; everything else the team may
// need to change is in the constants at the top of this file.

// ---------------------------------------------------------------- the event
// 11:11 AM AST (Puerto Rico, UTC-4, no daylight saving) = 15:11 UTC.
const EVENT_START = Date.parse("2026-11-11T11:11:00-04:00");
// Daaji's guided meditation starts 5 minutes after the 11:11 moment: 11:16 AM AST.
const DAAJI_START = EVENT_START + 5 * 60 * 1000;
// Pre-11 programme from Yoga Vidya: 15:15–16:18 CET (UTC+1) = 14:15–15:18 UTC.
const GERMANY_START = Date.UTC(2026, 10, 11, 14, 15);
const GERMANY_END = Date.UTC(2026, 10, 11, 15, 18);

const YOUTUBE_CHANNEL = "https://www.youtube.com/@passkindnessforward";
const YOUTUBE_LIVE = `${YOUTUBE_CHANNEL}/live`;
const SUBMIT_URL = "https://forms.pasalopalante.com/24hr-global-live";
const LIVE_PAGE_URL = "https://passkindnessforward.com/live";
// The live panel normally asks the live-stream function (YouTube Data API)
// which stream is on air, so segments swap in by themselves. While that
// function is not available (it needs a YouTube API key), the panel plays this
// list in order and moves to the next video when one ends. Add each segment's
// video ID (the part after /live/ or v= in its YouTube link) in running order.
// Every stream needs "Allow embedding" ON in YouTube Studio BEFORE it goes live.
const LIVE_VIDEO_QUEUE: string[] = ["t5kM1YlIN5k"];
const WATCH_LIVE_URL = `https://www.youtube.com/watch?v=${LIVE_VIDEO_QUEUE[0]}`;

// IN TRUTH tracks installs on their side; the UTM tags tell them which of our
// buttons sent the visitor. "content" is the placement.
const intruthUrl = (content: string) =>
  `https://www.intruth.io/?utm_source=pasalopalante&utm_medium=live_page&utm_campaign=1111&utm_content=${content}`;
// Shared links carry the network so GA4 can show which one brings people back.
const shareUrl = (source: string) =>
  `${LIVE_PAGE_URL}?utm_source=${source}&utm_medium=social&utm_campaign=1111_live`;
const MASTERCLASS_URL = "https://heartfulness.org/global/masterclass/";
const DAAJI_POSTER = "/live/daaji-poster.jpg";
const DAAJI_VIDEO_SRC = "https://cdn-prod.heartfulness.org/videos/kindness-2026/kindness-en.mp4?v=2";
const YOGA_VIDYA_IMAGE = "https://www.yoga-vidya.de/fileadmin/yv/Startseite/Featurette/yoga-vidya-mandala-500x500.jpg";
const HEARTFULNESS_LOGO = "https://primary-assets.heartfulness.org/strapi-assets/Heartfulness_Logo_Blk_Pwd_8f65f0f06c.svg";

// Calendar links for the broadcast.
const toCal = (ms: number) => new Date(ms).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const HERO_GOOGLE_CAL =
  "https://calendar.google.com/calendar/render?" +
  new URLSearchParams({
    action: "TEMPLATE",
    text: "11.11 Global Live Broadcast",
    dates: `${toCal(EVENT_START)}/${toCal(EVENT_START + 24 * 3600 * 1000)}`,
    details: `Watch live: ${LIVE_PAGE_URL}`,
    location: LIVE_PAGE_URL,
  }).toString();
const HERO_ICS = "/calendar/11-11-global-live-broadcast.ics";

// Time zones in the selector. The visitor's own zone is detected and chosen
// for them; this list is only for looking at another one.
const ZONES: Array<{ id: string; label: string }> = [
  { id: "America/Los_Angeles", label: "PST — Los Angeles" },
  { id: "America/Denver", label: "MST — Denver" },
  { id: "America/Chicago", label: "CST — Chicago" },
  { id: "America/New_York", label: "EST — New York" },
  { id: "America/Puerto_Rico", label: "AST — Puerto Rico" },
  { id: "America/Sao_Paulo", label: "BRT — São Paulo" },
  { id: "Europe/London", label: "GMT — United Kingdom" },
  { id: "Europe/Berlin", label: "CET — Germany" },
  { id: "Africa/Lagos", label: "WAT — Nigeria" },
  { id: "Africa/Johannesburg", label: "SAST — South Africa" },
  { id: "Asia/Dubai", label: "GST — United Arab Emirates" },
  { id: "Asia/Kolkata", label: "IST — India" },
  { id: "Asia/Manila", label: "PHT — Philippines" },
  { id: "Asia/Tokyo", label: "JST — Japan" },
  { id: "Australia/Perth", label: "AWST — Perth" },
  { id: "Australia/Sydney", label: "AEDT — Sydney" },
  { id: "Pacific/Auckland", label: "NZDT — Auckland" },
];

// The rows of the FAQ's "what time is it for me" table.
const FAQ_ZONES = [
  { id: "America/Los_Angeles", label: "zonePacific" },
  { id: "America/New_York", label: "zoneEastern" },
  { id: "America/Puerto_Rico", label: "zonePR" },
  { id: "Europe/London", label: "zoneUK" },
  { id: "Asia/Kolkata", label: "zoneIndia" },
  { id: "Asia/Manila", label: "zonePhil" },
  { id: "Australia/Perth", label: "zonePerth" },
  { id: "Australia/Sydney", label: "zoneSydney" },
] as const;

// -------------------------------------------------------------- time helpers
function makeTime(loc: string) {
  const fmt = (ms: number, timeZone: string, opts: Intl.DateTimeFormatOptions): string => {
    try {
      return new Intl.DateTimeFormat(loc, { timeZone, ...opts }).format(ms);
    } catch {
      return new Intl.DateTimeFormat("en-US", { timeZone: "America/Puerto_Rico", ...opts }).format(ms);
    }
  };
  const timeOf = (ms: number, tz: string) => fmt(ms, tz, { hour: "numeric", minute: "2-digit" });
  const longDay = (ms: number, tz: string) => fmt(ms, tz, { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  const shortDay = (ms: number, tz: string) => fmt(ms, tz, { weekday: "short", month: "short", day: "numeric" });
  const tzAbbr = (ms: number, tz: string) => {
    // Friendly abbreviations from our own list ("PHT", not Intl's "GMT+8").
    const known = ZONES.find((z) => z.id === tz && z.label.includes(" — "));
    if (known) return known.label.split(" — ")[0];
    try {
      return new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: "short" })
        .formatToParts(ms)
        .find((p) => p.type === "timeZoneName")?.value ?? "";
    } catch {
      return "";
    }
  };
  return { fmt, timeOf, longDay, shortDay, tzAbbr };
}

// Fills "{name}" placeholders in a translated string with React nodes (links).
function rich(str: string, map: Record<string, ReactNode>): ReactNode {
  return str.split(/(\{\w+\})/g).map((part, i) => {
    const m = part.match(/^\{(\w+)\}$/);
    return m && m[1] in map ? <Fragment key={i}>{map[m[1]]}</Fragment> : part;
  });
}

function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

function cdOf(diff: number) {
  const d = Math.max(0, diff);
  return {
    days: Math.floor(d / 86400000),
    hours: Math.floor((d / 3600000) % 24),
    mins: Math.floor((d / 60000) % 60),
    secs: Math.floor((d / 1000) % 60),
  };
}

const pad = (n: number) => String(Math.max(0, n)).padStart(2, "0");

// ---------------------------------------------------------------- small parts
function Eyebrow({ children, tone = "light" }: { children: ReactNode; tone?: "light" | "dark" }) {
  return (
    <p className={`text-xs font-bold uppercase tracking-[0.18em] ${tone === "dark" ? "text-warm-gold" : "text-warm-terracotta"}`}>
      {children}
    </p>
  );
}

function CountdownTiles({
  diff,
  label,
  labels,
}: {
  diff: number;
  label: string;
  labels: { days: string; hours: string; minutes: string; seconds: string };
}) {
  const cd = cdOf(diff);
  return (
    <div role="timer" aria-label={label} className="flex w-full max-w-xl gap-3">
      {(
        [
          [cd.days, labels.days],
          [cd.hours, labels.hours],
          [cd.mins, labels.minutes],
          [cd.secs, labels.seconds],
        ] as const
      ).map(([n, l]) => (
        <div key={l} className="min-w-0 flex-1 rounded-2xl border border-warm-cream/20 bg-white/10 px-2 py-4 backdrop-blur-sm md:py-5">
          <div className="font-display text-4xl tabular-nums leading-none md:text-6xl">{pad(n)}</div>
          <div className="mt-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-warm-cream/65 md:text-xs">{l}</div>
        </div>
      ))}
    </div>
  );
}

function ZoneSelect({
  id,
  zones,
  value,
  onChange,
  tone = "light",
  label,
}: {
  id: string;
  label: string;
  zones: Array<{ id: string; label: string }>;
  value: string;
  onChange: (tz: string) => void;
  tone?: "light" | "dark";
}) {
  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label={label}
      className={`h-9 max-w-full rounded-full border px-3 text-xs font-semibold outline-none focus-visible:ring-2 focus-visible:ring-warm-gold ${
        tone === "dark"
          ? "border-warm-cream/30 bg-white/10 text-warm-cream [&>option]:text-[#0e234b]"
          : "border-border bg-white text-foreground"
      }`}
    >
      {zones.map((z) => (
        <option key={z.id} value={z.id}>
          {z.label}
        </option>
      ))}
    </select>
  );
}

const btnPrimary =
  "inline-flex h-[52px] items-center justify-center gap-2 rounded-full bg-warm-terracotta px-7 text-sm font-bold text-white transition-transform duration-200 hover:scale-105";
const btnOutlineDark =
  "inline-flex h-[52px] items-center justify-center gap-2 rounded-full border-[1.5px] border-warm-cream/40 px-7 text-sm font-bold text-warm-cream transition-colors duration-200 hover:border-warm-cream";

function DetailRows({ rows, tone = "light" }: { rows: Array<[string, ReactNode]>; tone?: "light" | "dark" }) {
  const line = tone === "dark" ? "border-warm-cream/15" : "border-border";
  const label = tone === "dark" ? "text-warm-gold" : "text-warm-terracotta";
  const value = tone === "dark" ? "text-warm-cream/85" : "text-foreground/75";
  return (
    <dl className="mt-6">
      {rows.map(([k, v]) => (
        <div key={k} className={`flex gap-5 border-b py-4 first:border-t ${line}`}>
          <dt className={`w-[72px] shrink-0 pt-0.5 text-xs font-bold uppercase tracking-[0.14em] ${label}`}>{k}</dt>
          <dd className={`min-w-0 text-sm leading-relaxed md:text-[15px] ${value}`}>{v}</dd>
        </div>
      ))}
    </dl>
  );
}

// "Share to social": on phones it opens the native share sheet; elsewhere it
// reveals links to the main networks plus copy-link.
function ShareButton({
  label,
  text,
  title,
  copyLabel,
  copiedLabel,
}: {
  label: string;
  text: string;
  title: string;
  copyLabel: string;
  copiedLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const enc = encodeURIComponent;
  const networks = [
    { name: "Facebook", key: "facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${enc(shareUrl("facebook"))}` },
    { name: "X", key: "x", href: `https://twitter.com/intent/tweet?text=${enc(text)}&url=${enc(shareUrl("x"))}` },
    { name: "WhatsApp", key: "whatsapp", href: `https://wa.me/?text=${enc(`${text} ${shareUrl("whatsapp")}`)}` },
    { name: "LinkedIn", key: "linkedin", href: `https://www.linkedin.com/sharing/share-offsite/?url=${enc(shareUrl("linkedin"))}` },
  ];

  async function onClick() {
    const touch = typeof window !== "undefined" && window.matchMedia?.("(pointer: coarse)").matches;
    if (touch && typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        trackEvent("share_click", { method: "native" });
        await navigator.share({ title, text, url: shareUrl("share_sheet") });
        return;
      } catch (e) {
        if ((e as DOMException)?.name === "AbortError") return;
      }
    }
    setOpen((v) => !v);
  }

  async function copy() {
    try {
      trackEvent("share_click", { method: "copy_link" });
      await navigator.clipboard.writeText(shareUrl("copy_link"));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked: the network links above still work */
    }
  }

  const chip =
    "inline-flex h-9 items-center gap-1.5 rounded-full border border-warm-cream/30 px-4 text-xs font-bold text-warm-cream transition-colors hover:border-warm-cream hover:bg-white/10";

  return (
    <div className="flex flex-col items-center gap-3">
      <button type="button" onClick={onClick} aria-expanded={open} className={btnPrimary}>
        <Share2 size={18} aria-hidden="true" /> {label}
      </button>
      {open && (
        <div className="flex flex-wrap items-center justify-center gap-2">
          {networks.map((n) => (
            <a key={n.name} href={n.href} target="_blank" rel="noopener noreferrer" className={chip} onClick={() => trackEvent("share_click", { method: n.key })}>
              {n.name}
            </a>
          ))}
          <button type="button" onClick={copy} className={chip}>
            {copied ? <Check size={14} aria-hidden="true" /> : <Link2 size={14} aria-hidden="true" />}
            {copied ? copiedLabel : copyLabel}
          </button>
        </div>
      )}
    </div>
  );
}

// Daaji's message: portrait video with a poster (a still of Daaji, the label
// and title, and a play button) so it never looks like an empty black box.
function DaajiVideo({ label, title, playLabel, unsupported }: { label: string; title: string; playLabel: string; unsupported: string }) {
  const [started, setStarted] = useState(false);
  const ref = useRef<HTMLVideoElement>(null);
  return (
    <div className="relative mx-auto aspect-[9/16] h-[520px] max-w-full overflow-hidden rounded-3xl bg-black shadow-[0_24px_60px_rgba(0,0,0,0.35)] md:h-[600px]">
      {/* The Heartfulness video is portrait (9:16), so it fills its own frame. */}
      <video
        ref={ref}
        controls={started}
        playsInline
        preload="none"
        poster={DAAJI_POSTER}
        src={DAAJI_VIDEO_SRC}
        className="h-full w-full bg-black object-cover"
      >
        {unsupported}
      </video>
      {!started && (
        <button
          type="button"
          aria-label={playLabel}
          onClick={() => {
            setStarted(true);
            void ref.current?.play();
          }}
          className="group absolute inset-0 flex items-center justify-center text-left"
        >
          <span className="absolute inset-x-0 bottom-0 h-[40%] bg-[linear-gradient(to_top,#0b1f6b_0%,rgba(11,31,107,0.7)_55%,transparent_100%)]" aria-hidden="true" />
          <span className="relative flex h-20 w-20 items-center justify-center rounded-full bg-white shadow-lg transition-transform duration-200 group-hover:scale-110" aria-hidden="true">
            <Play size={30} className="ms-1 fill-[#9b0f2f] text-[#9b0f2f]" />
          </span>
          <span className="absolute inset-x-0 bottom-0 flex flex-col gap-1.5 p-6">
            <span className="text-xs font-bold uppercase tracking-[0.18em] text-[#e7a3b8]">{label}</span>
            <span className="font-display text-2xl leading-tight text-white md:text-3xl">{title}</span>
          </span>
        </button>
      )}
    </div>
  );
}

const linkCls = "font-semibold text-warm-sky underline underline-offset-2 hover:text-foreground";

// ------------------------------------------------------------------ the page
export default function LivePage() {
  useScrollToHash();
  const { lang, t } = useLanguage();
  const tx = t.livePage;
  const { fmt, timeOf, longDay, shortDay, tzAbbr } = useMemo(() => makeTime(lang), [lang]);
  const now = useNow();

  // Visitor's own zone is detected and pre-selected, so nobody has to choose.
  const detected = useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Puerto_Rico";
    } catch {
      return "America/Puerto_Rico";
    }
  }, []);
  const zones = useMemo(
    () =>
      ZONES.some((z) => z.id === detected)
        ? ZONES
        : [{ id: detected, label: tx.yourDevice.replace("{zone}", detected.replace(/_/g, " ")) }, ...ZONES],
    [detected, tx.yourDevice],
  );
  const [tz, setTz] = useState(detected);

  // ?preview=live shows the "live now" state, so the team can check it early.
  const forceLive = isLivePreview();
  const phase: "before" | "live" | "ended" = forceLive || (now >= LIVE_FROM && now < LIVE_END) ? "live" : now < LIVE_FROM ? "before" : "ended";
  // Once the stream is up, a second countdown runs below it to the 11:11 AM
  // AST Global Kindness Moment, and disappears when that moment arrives.
  // Which video the live panel shows: asked of the live-stream function
  // (YouTube Data API) so the exact live segment is embedded and swaps by
  // itself. If that lookup is unavailable, fall back to the pinned video.
  const stream = useLiveStream(phase === "live");
  const playerSrc =
    stream.status === "live" && stream.embeddable && stream.videoId
      ? `https://www.youtube.com/embed/${stream.videoId}?autoplay=1&mute=1&rel=0`
      : null;
  const useQueue = stream.status === "error";
  const [queueVideo, setQueueVideo] = useState(LIVE_VIDEO_QUEUE[0]);
  const watchUrl =
    stream.status === "live" && stream.videoId
      ? `https://www.youtube.com/watch?v=${stream.videoId}`
      : useQueue
        ? `https://www.youtube.com/watch?v=${queueVideo}`
        : WATCH_LIVE_URL;
  const streamLoading = stream.status === "loading";
  // One "live_stream_view" per page load once the player is on screen. Not
  // sent for the ?preview=live team check.
  useEffect(() => {
    if (phase === "live" && !streamLoading && !forceLive) trackEvent("live_stream_view", { language: lang, video_id: stream.videoId ?? queueVideo });
  }, [phase, forceLive, lang, streamLoading, stream.videoId, queueVideo]);
  const momentPending = phase === "live" && now < EVENT_START;
  const cdLabels = { days: tx.days, hours: tx.hours, minutes: tx.minutes, seconds: tx.seconds };

  const startsAt = `${timeOf(EVENT_START, tz)} ${tzAbbr(EVENT_START, tz)}`.trim();
  const startsDay = shortDay(EVENT_START, tz);
  const daajiAt = `${timeOf(DAAJI_START, tz)} ${tzAbbr(DAAJI_START, tz)}`.trim();

  return (
    <div className="min-h-screen bg-warm-cream">
      <SEO
        title={tx.seoTitle}
        description={tx.seoDesc}
        path="/live"
      />
      <Navbar />
      <main>
        {/* ------------------------------------------------------------ hero */}
        <section id="top" className="relative overflow-hidden bg-cyan-900 text-warm-cream">
          <img
            src="/world-map.svg"
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute -end-24 top-8 w-[640px] max-w-none opacity-[0.06]"
          />
          <div className="relative mx-auto flex max-w-7xl flex-col items-center gap-6 px-4 pb-16 pt-32 text-center sm:px-6 md:pt-36 lg:px-8">
            <Eyebrow tone="dark">{tx.heroEyebrow}</Eyebrow>
            <h1 className="font-display text-5xl leading-[1.02] tracking-tight md:text-6xl lg:text-7xl">
              {tx.heroTitle}
            </h1>
            {/* The intro copy gives way to the stream once it is live. */}
            {phase !== "live" && (
              <>
                <p className="max-w-2xl text-base leading-relaxed text-warm-cream/75 md:text-lg">
                  {tx.heroIntro1}
                </p>
                <p className="max-w-2xl text-base font-semibold leading-relaxed text-warm-cream md:text-lg">
                  {tx.heroIntro2}
                </p>
              </>
            )}

            <div className="mt-4 flex w-full flex-col items-center gap-5">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-warm-sky">
                {phase === "before" ? tx.cdBefore : phase === "live" ? tx.cdLive : tx.cdEnded}
              </p>

              {phase === "before" && (
                <>
                  <CountdownTiles diff={EVENT_START - now} label={tx.timerLabel} labels={cdLabels} />
                  {/* Small zone picker right under the countdown. */}
                  <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-sm text-warm-cream/75">
                    <Clock size={16} className="shrink-0 text-warm-gold" aria-hidden="true" />
                    <span>
                      {tx.heroStarts}{" "}
                      <strong className="font-semibold text-warm-cream">
                        {startsAt}, {startsDay}
                      </strong>
                    </span>
                    <ZoneSelect id="hero-tz" zones={zones} value={tz} onChange={setTz} tone="dark" label={tx.tzAria} />
                  </div>
                </>
              )}
            </div>

            {/* The live panel appears from LIVE_FROM on. */}
            {phase === "live" && (
              <div id="live" className="mt-4 w-full scroll-mt-28 overflow-hidden rounded-3xl border border-warm-cream/20 bg-white/10 text-left backdrop-blur-sm">
                <div className="flex items-center gap-2 border-b border-warm-cream/15 px-5 py-3 text-xs font-bold uppercase tracking-[0.16em]">
                  <span className="inline-flex h-2.5 w-2.5 animate-pulse rounded-full bg-[#d81b60]" aria-hidden="true" />
                  {tx.livePanel}
                </div>
                {streamLoading ? (
                  <div className="aspect-video w-full bg-black" aria-busy="true" />
                ) : useQueue ? (
                  <YouTubeQueuePlayer
                    ids={LIVE_VIDEO_QUEUE}
                    title="11.11 Global Live Broadcast"
                    blockedText={tx.liveStreaming}
                    watchLabel={tx.watchLive}
                    onVideoChange={setQueueVideo}
                  />
                ) : playerSrc ? (
                  <div className="aspect-video w-full bg-black">
                    <iframe
                      key={playerSrc}
                      src={playerSrc}
                      title="11.11 Global Live Broadcast"
                      className="h-full w-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      referrerPolicy="strict-origin-when-cross-origin"
                      allowFullScreen
                    />
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-4 px-6 py-12 text-center">
                    <Radio size={36} className="text-warm-gold" aria-hidden="true" />
                    <p className="max-w-md text-base leading-relaxed text-warm-cream/85">
                      {tx.liveStreaming}
                    </p>
                    <a href={watchUrl} target="_blank" rel="noopener noreferrer" className={btnPrimary}>
                      <Play size={18} aria-hidden="true" /> {tx.watchLive}
                    </a>
                  </div>
                )}
                <div className="flex flex-col items-center gap-3 border-t border-warm-cream/15 px-5 py-4">
                  <div className="flex flex-wrap items-start justify-center gap-3">
                    <ShareButton
                      label={tx.shareButton}
                      text={tx.shareText}
                      title={tx.heroTitle}
                      copyLabel={tx.copyLink}
                      copiedLabel={tx.linkCopied}
                    />
                    <a
                      href={intruthUrl("live_player")}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => trackEvent("intruth_app_click", { placement: "live_player" })}
                      className="inline-flex h-[52px] items-center justify-center gap-2 rounded-full bg-white px-7 text-sm font-bold text-cyan-900 transition-transform duration-200 hover:scale-105"
                    >
                      {tx.getIntruthApp} <ExternalLink size={16} aria-hidden="true" />
                    </a>
                  </div>
                  {(playerSrc || useQueue) && (
                    <a
                      href={watchUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => trackEvent("watch_on_youtube_click", { placement: "live_player" })}
                      className="inline-flex items-center gap-1.5 text-sm font-semibold text-warm-cream/85 underline underline-offset-4 hover:text-warm-cream"
                    >
                      <Play size={14} aria-hidden="true" /> {tx.watchLive}
                    </a>
                  )}
                </div>
              </div>
            )}

            {momentPending && (
              <div className="mt-4 flex w-full flex-col items-center gap-5">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-warm-sky">{tx.kmCountdown}</p>
                <CountdownTiles diff={EVENT_START - now} label={tx.kmCountdown} labels={cdLabels} />
                <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-sm text-warm-cream/75">
                  <Clock size={16} className="shrink-0 text-warm-gold" aria-hidden="true" />
                  <span>
                    {tx.heroStarts}{" "}
                    <strong className="font-semibold text-warm-cream">
                      {startsAt}, {startsDay}
                    </strong>
                  </span>
                  <ZoneSelect id="hero-tz" zones={zones} value={tz} onChange={setTz} tone="dark" label={tx.tzAria} />
                </div>
              </div>
            )}

            {phase !== "live" && (
              <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
                {phase === "ended" ? (
                  <>
                    <a href="/#get-involved-inline" onClick={() => trackEvent("pledge_click", { placement: "hero_after_stream" })} className={btnPrimary}>
                      {t.navbar.makePledge}
                    </a>
                    <a href={YOUTUBE_CHANNEL} target="_blank" rel="noopener noreferrer" onClick={() => trackEvent("view_recording_click")} className={btnOutlineDark}>
                      <Play size={18} aria-hidden="true" /> {tx.viewRecording}
                    </a>
                  </>
                ) : (
                  <a href={HERO_GOOGLE_CAL} target="_blank" rel="noopener noreferrer" onClick={() => trackEvent("add_to_calendar_click", { placement: "hero" })} className={btnPrimary}>
                    <CalendarPlus size={18} aria-hidden="true" /> {tx.addCal}
                  </a>
                )}
              </div>
            )}
            {phase === "before" && (
              <a href={HERO_ICS} onClick={() => trackEvent("add_to_calendar_click", { placement: "hero_apple_outlook" })} className="text-xs font-semibold text-warm-cream/70 underline underline-offset-2 hover:text-warm-cream">
                {tx.appleOutlook}
              </a>
            )}
          </div>
          <div aria-hidden="true" className="flex h-1.5">
            <span className="flex-1" style={{ background: "#00a3e0" }} />
            <span className="flex-1 bg-warm-terracotta" />
            <span className="flex-1 bg-warm-gold" />
            <span className="flex-1" style={{ background: "#d81b60" }} />
          </div>
        </section>

        {/* ------------------------------------------------ what's happening */}
        <section id="happening" className="scroll-mt-24 bg-white">
          <div className="section-padding mx-auto max-w-6xl py-16 md:py-24">
            <div className="flex max-w-2xl flex-col gap-4">
              <Eyebrow>{tx.happeningEyebrow}</Eyebrow>
              <h2 className="font-display text-3xl leading-tight text-foreground md:text-5xl">
                {tx.happeningTitle}
              </h2>
              <p className="text-base leading-relaxed text-foreground/75 md:text-lg">
                {tx.happeningBody}
              </p>
            </div>

            <div className="mt-10 grid gap-5 md:grid-cols-3">
              {[
                { n: 1, time: tx.act1Time, place: tx.act1Place, title: tx.act1Title, body: tx.act1Body, bar: "#00a3e0" },
                { n: 2, time: tx.act2Time, place: tx.act2Place, title: tx.act2Title, body: tx.act2Body, bar: "#f2701d" },
                { n: 3, time: tx.act3Time, place: tx.act3Place, title: tx.act3Title, body: tx.act3Body, bar: "#fbb813" },
              ].map((c) => (
                <article key={c.n} className="flex flex-col overflow-hidden rounded-3xl border border-border bg-white shadow-sm">
                  <div className="h-1.5" style={{ background: c.bar }} aria-hidden="true" />
                  <div className="flex flex-1 flex-col gap-3 p-7">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-warm-sand text-sm font-bold text-foreground">{c.n}</span>
                    <p className="font-display text-3xl leading-tight text-foreground">{c.time}</p>
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-warm-sky">{c.place}</p>
                    <h3 className="mt-2 text-lg font-bold leading-snug text-foreground">{c.title}</h3>
                    <p className="text-[15px] leading-relaxed text-foreground/70">{c.body}</p>
                  </div>
                </article>
              ))}
            </div>

            <div className="mt-14">
              <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-foreground/60">{tx.glanceTitle}</h3>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                {[
                  { href: "#happening", top: tx.g1Top, title: tx.g1Title, body: tx.g1Body },
                  { href: "#germany", top: tx.g2Top, title: tx.g2Title, body: tx.g2Body },
                  { href: "#happening", top: tx.g3Top, title: tx.g3Title, body: tx.g3Body },
                  { href: "#daaji", top: tx.g4Top, title: tx.g4Title, body: tx.g4Body },
                  { href: "#happening", top: tx.g5Top, title: tx.g5Title, body: tx.g5Body },
                ].map((g) => (
                  <a key={g.title} href={g.href} className="flex flex-col gap-1.5 rounded-2xl border border-border bg-warm-sand px-5 py-4 transition-colors hover:border-warm-terracotta">
                    <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-foreground/55">{g.top}</span>
                    <span className="text-base font-bold text-foreground">{g.title}</span>
                    <span className="text-sm leading-snug text-foreground/65">{g.body}</span>
                  </a>
                ))}
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-x-8 gap-y-2 rounded-2xl bg-cyan-900 px-6 py-5 text-warm-cream">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-warm-gold">{tx.seasonLabel}</p>
                  <p className="font-display text-2xl">{tx.seasonDates}</p>
                </div>
                <p className="min-w-0 flex-1 basis-72 text-sm leading-relaxed text-warm-cream/80">
                  {tx.seasonBody}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------- Germany */}
        <section id="germany" className="scroll-mt-24 bg-warm-sand">
          <div className="section-padding mx-auto grid max-w-6xl items-center gap-10 py-16 md:py-24 lg:grid-cols-2 lg:gap-14">
            <img
              src={YOGA_VIDYA_IMAGE}
              alt={tx.yogaAlt}
              loading="lazy"
              className="mx-auto aspect-square w-full max-w-[480px] rounded-3xl object-cover shadow-[0_24px_60px_rgba(14,35,75,0.18)]"
            />
            <div>
              <Eyebrow>{tx.germanyEyebrow}</Eyebrow>
              <h2 className="mt-4 font-display text-3xl leading-tight text-foreground md:text-5xl">
                {tx.germanyTitle}
              </h2>
              <p className="mt-4 text-sm font-bold uppercase tracking-[0.14em] text-warm-sky">{tx.germanyLive}</p>
              <p className="mt-3 text-base leading-relaxed text-foreground/75 md:text-lg">
                {tx.germanyIntro}
              </p>
              <DetailRows
                rows={[
                  [tx.rowWhat, tx.germanyWhat],
                  [
                    tx.rowWhen,
                    <>
                      {tx.germanyWhen}
                      <span className="mt-1 block font-semibold text-foreground">
                        {tx.yourTime.replace(
                          "{time}",
                          `${timeOf(GERMANY_START, tz)}–${timeOf(GERMANY_END, tz)} ${tzAbbr(GERMANY_START, tz)}, ${shortDay(GERMANY_START, tz)}`,
                        )}
                      </span>
                    </>,
                  ],
                  [tx.rowWhere, tx.germanyWhere],
                  [tx.rowHow, tx.germanyHow],
                ]}
              />
            </div>
          </div>
        </section>

        {/* ------------------------------------------ Daaji & Heartfulness */}
        <section id="daaji" className="scroll-mt-24 bg-cyan-900 text-warm-cream">
          <div className="section-padding mx-auto max-w-6xl py-16 md:py-24">
            <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
              <div>
                <Eyebrow tone="dark">{tx.daajiEyebrow}</Eyebrow>
                <h2 className="mt-4 font-display text-3xl leading-tight md:text-5xl">{tx.daajiTitle}</h2>
                <p className="mt-4 text-base leading-relaxed text-warm-cream md:text-lg">
                  <strong className="font-bold">{tx.daajiLead}</strong>{" "}
                  <a href={MASTERCLASS_URL} target="_blank" rel="noopener noreferrer" onClick={() => trackEvent("masterclass_register_click", { placement: "daaji_text" })} className="font-semibold text-warm-gold underline underline-offset-2">
                    heartfulness.org/global/masterclass
                  </a>
                </p>
                <p className="mt-3 text-base font-bold leading-relaxed text-warm-cream md:text-lg">{tx.daajiThen}</p>
                <p className="mt-3 text-base leading-relaxed text-warm-cream/75 md:text-lg">{tx.daajiIntro}</p>
                <DetailRows
                  tone="dark"
                  rows={[
                    [tx.rowWhat, tx.daajiWhat],
                    [
                      tx.rowWhen,
                      <>
                        {tx.daajiWhen}
                        <span className="mt-1 block font-semibold text-warm-cream">
                          {tx.yourTime.replace("{time}", `${daajiAt}, ${shortDay(DAAJI_START, tz)}`)}
                        </span>
                      </>,
                    ],
                    [
                      tx.rowWhere,
                      rich(tx.daajiWhere, {
                        link: (
                          <a href={YOUTUBE_CHANNEL} target="_blank" rel="noopener noreferrer" className="font-semibold text-warm-gold underline underline-offset-2">
                            {tx.youtubeChannel}
                          </a>
                        ),
                      }),
                    ],
                    [tx.rowHow, tx.daajiHow],
                  ]}
                />
              </div>
              <DaajiVideo
                label={tx.daajiPosterLabel}
                title={tx.daajiPosterTitle}
                playLabel={tx.playVideo}
                unsupported={tx.videoUnsupported}
              />
            </div>

            {/* Time + calendar card */}
            <div className="mt-12 grid gap-8 rounded-3xl border border-warm-cream/15 bg-white/10 p-6 md:p-8 lg:grid-cols-2">
              <div className="flex flex-col justify-center gap-3">
                <label htmlFor="daaji-tz" className="text-xs font-bold uppercase tracking-[0.16em] text-warm-cream/65">
                  {tx.yourTimeZone}
                </label>
                <ZoneSelect id="daaji-tz" zones={zones} value={tz} onChange={setTz} tone="dark" label={tx.tzAria} />
                <p className="mt-3 text-sm text-warm-cream/65">{tx.launchStarts}</p>
                <p className="font-display text-6xl leading-none tabular-nums md:text-7xl">{timeOf(DAAJI_START, tz)}</p>
                <p className="text-sm text-warm-cream/75">
                  {longDay(DAAJI_START, tz)} · {tzAbbr(DAAJI_START, tz)}
                </p>
              </div>
              <div className="flex flex-col justify-center gap-3">
                <div className="rounded-2xl bg-white/10 px-5 py-4">
                  <p className="font-bold">{tx.guidedMeditation}</p>
                  <p className="text-sm text-warm-cream/70">{tx.withDaaji}</p>
                </div>
                <div className="rounded-2xl bg-white/10 px-5 py-4">
                  <p className="font-bold">{tx.liveGlobal}</p>
                  <p className="text-sm text-warm-cream/70">{tx.fromTime}</p>
                </div>
                <a
                  href={MASTERCLASS_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => trackEvent("masterclass_register_click", { placement: "daaji_card" })}
                  className="mt-1 inline-flex min-h-[52px] items-center justify-center gap-2 rounded-full bg-white px-7 py-3 text-center text-sm font-bold text-cyan-900 transition-transform duration-200 hover:scale-[1.02]"
                >
                  {tx.daajiRegister} <ExternalLink size={16} aria-hidden="true" />
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------ partners */}
        <section id="partners" className="scroll-mt-24 bg-white">
          <div className="section-padding mx-auto max-w-6xl py-16 md:py-24">
            <div className="flex max-w-2xl flex-col gap-4">
              <Eyebrow>{tx.partnersEyebrow}</Eyebrow>
              <h2 className="font-display text-3xl leading-tight text-foreground md:text-5xl">
                {tx.partnersTitle}
              </h2>
            </div>
            {(
              [
                [
                  tx.partnerGroupStrategic,
                  [
                    { name: "Te Amo PR", src: "/partners/nonprofits_te-amo-pr.png", wide: true },
                    { name: "Heartfulness", src: HEARTFULNESS_LOGO, wide: true },
                    { name: "Yoga Vidya", src: "/partners/faith-based_yoga-vidya.jpg", wide: false },
                  ],
                ],
                [
                  tx.partnerGroupBroadcast,
                  [
                    { name: "HeartMath Institute", src: "/partners/nonprofits_hmi-logo.png", wide: true },
                    { name: "AWAKEN", src: "/partners/corporate_awaken---michael-krauss.jpg", wide: false },
                    { name: "InTruth", src: "/partners/corporate_intruth.svg", wide: true },
                  ],
                ],
              ] as const
            ).map(([group, partners]) => (
              <div key={group} className="mt-10">
                <h3 className="font-sans text-xs font-bold uppercase tracking-[0.18em] text-foreground/60">{group}</h3>
                <div className="mt-4 grid grid-cols-3 gap-3 md:gap-5">
                  {partners.map((p) => (
                    <article key={p.name} className="flex items-center justify-center rounded-2xl border border-border bg-white p-3 shadow-sm sm:p-5 md:rounded-3xl md:p-6">
                      <div className="flex h-20 items-center justify-center md:h-28">
                        <img
                          src={p.src}
                          alt={tx.logoAlt.replace("{name}", p.name)}
                          loading="lazy"
                          className={p.wide ? "h-auto w-full max-w-[170px]" : "h-16 w-16 rounded-xl object-cover md:h-28 md:w-28 md:rounded-2xl"}
                        />
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            ))}
            <p className="mt-8 text-center">
              <Link to="/partners" className="text-base font-semibold text-warm-terracotta underline underline-offset-4 hover:text-foreground">
                {tx.partnersLink}
              </Link>
            </p>
          </div>
        </section>

        {/* ------------------------------------------------------- IN TRUTH */}
        <section id="intruth" className="scroll-mt-24 bg-cyan-900 text-warm-cream">
          <div className="section-padding mx-auto max-w-6xl py-16 md:py-20">
            <div className="flex flex-col items-start justify-between gap-8 md:flex-row md:items-center">
              <div className="max-w-2xl">
                <Eyebrow tone="dark">{tx.intruthEyebrow}</Eyebrow>
                <h2 className="mt-4 font-display text-3xl leading-tight md:text-5xl">{tx.intruthTitle}</h2>
                <p className="mt-4 text-base leading-relaxed text-warm-cream/80 md:text-lg">
                  {rich(tx.intruthBody1, {
                    valence: <strong className="font-bold text-warm-cream">{tx.intruthValence}</strong>,
                    arousal: <strong className="font-bold text-warm-cream">{tx.intruthArousal}</strong>,
                  })}
                </p>
                <p className="mt-3 text-base leading-relaxed text-warm-cream/80 md:text-lg">{tx.intruthBody2}</p>
              </div>
              <span className="inline-flex shrink-0 items-center justify-center rounded-3xl bg-white px-10 py-8">
                <img src="/partners/corporate_intruth.svg" alt={tx.logoAlt.replace("{name}", "IN TRUTH")} loading="lazy" className="h-auto w-40 md:w-52" />
              </span>
            </div>

            <ol className="mt-10 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
              {(
                [
                  [tx.intruthS1T, tx.intruthS1B, "#00a3e0"],
                  [tx.intruthS2T, tx.intruthS2B, "#f2701d"],
                  [tx.intruthS3T, tx.intruthS3B, "#fbb813"],
                  [tx.intruthS4T, tx.intruthS4B, "#d81b60"],
                ] as const
              ).map(([title, body, color], i) => (
                <li key={title} className="flex flex-col gap-2.5 rounded-2xl border border-warm-cream/15 bg-white/10 p-4 sm:gap-3 sm:p-6">
                  <span
                    className="flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold text-cyan-900"
                    style={{ background: color }}
                  >
                    {i + 1}
                  </span>
                  <h3 className="text-base font-bold leading-snug sm:text-lg">{title}</h3>
                  <p className="text-[13px] leading-relaxed text-warm-cream/75 sm:text-sm">{body}</p>
                </li>
              ))}
            </ol>

            <div className="mt-8 flex flex-col items-start justify-between gap-5 rounded-3xl bg-white px-6 py-6 text-foreground sm:flex-row sm:items-center md:px-8">
              <p className="font-display text-2xl leading-tight md:text-3xl">{tx.intruthCta}</p>
              <a href={intruthUrl("intruth_section")} target="_blank" rel="noopener noreferrer" onClick={() => trackEvent("intruth_app_click", { placement: "intruth_section" })} className={`${btnPrimary} shrink-0`}>
                {tx.intruthButton}
              </a>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------------ FAQ */}
        <section id="faq" className="scroll-mt-24 bg-warm-sand">
          <div className="section-padding mx-auto max-w-3xl py-16 md:py-24">
            <Eyebrow>{tx.faqEyebrow}</Eyebrow>
            <h2 className="mt-4 font-display text-3xl leading-tight text-foreground md:text-5xl">{tx.faqTitle}</h2>
            <div className="mt-8 flex flex-col gap-3">
              {(
                [
                  [tx.q1, <p key="a">{tx.a1}</p>],
                  [
                    tx.q2,
                    <div key="a" className="flex flex-col gap-4">
                      <p>{tx.a2a}</p>
                      <ul className="overflow-hidden rounded-xl border border-border bg-white">
                        {FAQ_ZONES.map((z) => (
                          <li key={z.id} className="flex items-center justify-between gap-4 border-b border-border px-4 py-2.5 text-sm last:border-b-0">
                            <span className="font-semibold text-foreground">{tx[z.label]}</span>
                            <span className="whitespace-nowrap tabular-nums text-foreground/70">
                              {timeOf(EVENT_START, z.id)} · {fmt(EVENT_START, z.id, { month: "short", day: "numeric" })}
                            </span>
                          </li>
                        ))}
                      </ul>
                      <p>
                        {rich(tx.a2b, {
                          link: (
                            <a href="https://www.worldtimebuddy.com/" target="_blank" rel="noopener noreferrer" className={linkCls}>
                              World Time Buddy
                            </a>
                          ),
                        })}
                      </p>
                    </div>,
                  ],
                  [tx.q3, <p key="a">{tx.a3}</p>],
                  [
                    tx.q4,
                    <p key="a">
                      {rich(tx.a4, {
                        link: (
                          <a href={YOUTUBE_CHANNEL} target="_blank" rel="noopener noreferrer" className={linkCls}>
                            youtube.com/@passkindnessforward
                          </a>
                        ),
                      })}
                    </p>,
                  ],
                  [
                    tx.q5,
                    <p key="a">
                      {rich(tx.a5, {
                        facebook: (
                          <a href="https://facebook.com/passkindnessforward" target="_blank" rel="noopener noreferrer" className={linkCls}>
                            Facebook
                          </a>
                        ),
                        youtube: (
                          <a href={YOUTUBE_CHANNEL} target="_blank" rel="noopener noreferrer" className={linkCls}>
                            YouTube
                          </a>
                        ),
                        site: (
                          <a href={LIVE_PAGE_URL} className={linkCls}>
                            passkindnessforward.com/live
                          </a>
                        ),
                      })}
                    </p>,
                  ],
                  [tx.q6, <p key="a">{tx.a6}</p>],
                  [
                    tx.q7,
                    <p key="a">
                      {rich(tx.a7, {
                        link: (
                          <a href={SUBMIT_URL} target="_blank" rel="noopener noreferrer" className={linkCls}>
                            {tx.a7Link}
                          </a>
                        ),
                      })}
                    </p>,
                  ],
                  [tx.q8, <p key="a">{tx.a8}</p>],
                  [tx.q9, <p key="a">{tx.a9}</p>],
                  [
                    tx.q10,
                    <p key="a">
                      {rich(tx.a10, {
                        link: (
                          <a href="/#get-involved-inline" className={linkCls}>
                            {tx.a10Link}
                          </a>
                        ),
                      })}
                    </p>,
                  ],
                  [
                    tx.q11,
                    <p key="a">
                      {rich(tx.a11, {
                        link: (
                          <a href={YOUTUBE_CHANNEL} target="_blank" rel="noopener noreferrer" className={linkCls}>
                            {tx.youtubeChannel}
                          </a>
                        ),
                      })}
                    </p>,
                  ],
                ] as Array<[string, ReactNode]>
              ).map(([q, a]) => (
                <details key={q} className="group rounded-2xl border border-border bg-white px-5 shadow-sm open:shadow-md">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-left text-[15px] font-bold leading-snug text-foreground md:text-base [&::-webkit-details-marker]:hidden">
                    {q}
                    <span
                      aria-hidden="true"
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-warm-sand text-lg leading-none text-warm-terracotta transition-transform duration-200 group-open:rotate-45"
                    >
                      +
                    </span>
                  </summary>
                  <div className="pb-5 text-[15px] leading-relaxed text-foreground/75">{a}</div>
                </details>
              ))}
            </div>

            <div className="mt-10 flex flex-wrap items-center gap-4">
              <a href={HERO_GOOGLE_CAL} target="_blank" rel="noopener noreferrer" onClick={() => trackEvent("add_to_calendar_click", { placement: "faq" })} className={btnPrimary}>
                <CalendarPlus size={18} aria-hidden="true" /> {tx.addCal}
              </a>
              <a href="/" className="inline-flex items-center gap-1.5 text-sm font-bold text-warm-sky hover:underline">
                {tx.joinMovement}
              </a>
            </div>
          </div>
        </section>
      </main>
      <Footer />
      <ScrollToTop />
    </div>
  );
}
