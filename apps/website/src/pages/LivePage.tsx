import { useEffect, useMemo, useState, type ReactNode } from "react";
import { CalendarPlus, Clock, Play, Radio } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ScrollToTop from "@/components/ScrollToTop";
import SEO from "@/components/SEO";
import { useScrollToHash } from "@/hooks/useScrollToHash";

// /live: the 11.11.2026 Global Live Broadcast event page. English only for
// now (the copy is still being reviewed); everything the team may need to
// change is in the constants at the top of this file.

// ---------------------------------------------------------------- the event
// 11:11 AM AST (Puerto Rico, UTC-4, no daylight saving) = 15:11 UTC.
const EVENT_START = Date.parse("2026-11-11T11:11:00-04:00");
const EVENT_END = EVENT_START + 24 * 3600 * 1000; // a 24-hour broadcast
// Pre-11 programme from Yoga Vidya: 15:15–16:18 CET (UTC+1) = 14:15–15:18 UTC.
const GERMANY_START = Date.UTC(2026, 10, 11, 14, 15);
const GERMANY_END = Date.UTC(2026, 10, 11, 15, 18);

const YOUTUBE_CHANNEL = "https://www.youtube.com/@passkindnessforward";
const YOUTUBE_LIVE = `${YOUTUBE_CHANNEL}/live`;
const SUBMIT_URL = "https://forms.pasalopalante.com/24hr-global-live";
const LIVE_PAGE_URL = "https://passkindnessforward.com/live";
// To embed the live stream on this page once it exists, set this to the
// YouTube embed URL (https://www.youtube.com/embed/<videoId>). Until then the
// live panel sends people to the channel's live stream.
const LIVE_EMBED_SRC: string | null = null;

// Hero video in "Be part of the broadcast".
const CAMPAIGN_VIDEO_SRC = "https://www.youtube.com/embed/lZkmX6qO0xw?si=cfVn78GZaIJXFTwV";
const DAAJI_VIDEO_SRC = "https://cdn-prod.heartfulness.org/videos/kindness-2026/kindness-en.mp4?v=2";
const YOGA_VIDYA_IMAGE = "https://www.yoga-vidya.de/fileadmin/yv/Startseite/Featurette/yoga-vidya-mandala-500x500.jpg";
const HEARTFULNESS_LOGO = "https://primary-assets.heartfulness.org/strapi-assets/Heartfulness_Logo_Blk_Pwd_8f65f0f06c.svg";

// Calendar links. The Daaji link is the exact one supplied by Heartfulness.
const toCal = (ms: number) => new Date(ms).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const HERO_GOOGLE_CAL =
  "https://calendar.google.com/calendar/render?" +
  new URLSearchParams({
    action: "TEMPLATE",
    text: "11.11 Global Live Broadcast",
    dates: `${toCal(EVENT_START)}/${toCal(EVENT_END)}`,
    details: `Watch live: ${LIVE_PAGE_URL}`,
    location: YOUTUBE_CHANNEL,
  }).toString();
const DAAJI_GOOGLE_CAL =
  "https://calendar.google.com/calendar/render?action=TEMPLATE&text=Global+Kindness+Season+Launch+with+Daaji&dates=20261111T151100Z%2F20261111T161100Z&details=Meditate+with+Heartfulness%2C+perform+kindness%2C+pass+it+forward.+Join+people+worldwide+at+11%3A11+AM+AST.&location=Online";
const HERO_ICS = "/calendar/11-11-global-live-broadcast.ics";
const DAAJI_ICS = "/calendar/11-11-daaji-meditation.ics";

const SEGMENTS: Array<[string, string, string]> = [
  ["01", "Kindness in Action", "1 min"],
  ["02", "Voices of Kindness", "30 sec"],
  ["03", "Health + Science", "4 min"],
  ["04", "Hourly Challenge", "30 sec"],
  ["05", "Human Story", "3 min"],
  ["06", "Celebrity Inspiration", "60 sec"],
  ["07", "Featured", "5 min"],
  ["08", "Meditation", "5 min"],
  ["09", "Fashionable to be Kind", "1–3 min"],
];

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
const FAQ_ZONES: Array<{ id: string; label: string }> = [
  { id: "America/Los_Angeles", label: "Pacific (PST)" },
  { id: "America/New_York", label: "Eastern (EST)" },
  { id: "America/Puerto_Rico", label: "Puerto Rico (AST)" },
  { id: "Europe/London", label: "UK (GMT)" },
  { id: "Asia/Kolkata", label: "India (IST)" },
  { id: "Asia/Manila", label: "Philippines (PHT)" },
  { id: "Australia/Perth", label: "Australia, Perth (AWST)" },
  { id: "Australia/Sydney", label: "Australia, Sydney (AEDT)" },
];

// -------------------------------------------------------------- time helpers
function fmt(ms: number, timeZone: string, opts: Intl.DateTimeFormatOptions): string {
  try {
    return new Intl.DateTimeFormat("en-US", { timeZone, ...opts }).format(ms);
  } catch {
    return new Intl.DateTimeFormat("en-US", { timeZone: "America/Puerto_Rico", ...opts }).format(ms);
  }
}
const timeOf = (ms: number, tz: string) => fmt(ms, tz, { hour: "numeric", minute: "2-digit" });
const longDay = (ms: number, tz: string) => fmt(ms, tz, { weekday: "long", month: "long", day: "numeric", year: "numeric" });
const shortDay = (ms: number, tz: string) => fmt(ms, tz, { weekday: "short", month: "short", day: "numeric" });
const tzAbbr = (ms: number, tz: string) => {
  // Friendly abbreviations from our own list ("PHT", not Intl's "GMT+8").
  const known = [...ZONES, ...FAQ_ZONES].find((z) => z.id === tz && z.label.includes(" — "));
  if (known) return known.label.split(" — ")[0];
  try {
    return new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: "short" })
      .formatToParts(ms)
      .find((p) => p.type === "timeZoneName")?.value ?? "";
  } catch {
    return "";
  }
};

function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
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

function ZoneSelect({
  id,
  zones,
  value,
  onChange,
  tone = "light",
}: {
  id: string;
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
      aria-label="Time zone"
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

const linkCls = "font-semibold text-warm-sky underline underline-offset-2 hover:text-foreground";

// ------------------------------------------------------------------ the page
export default function LivePage() {
  useScrollToHash();
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
        : [{ id: detected, label: `Your device — ${detected.replace(/_/g, " ")}` }, ...ZONES],
    [detected],
  );
  const [tz, setTz] = useState(detected);

  // ?preview=live shows the "live now" state, so the team can check it early.
  const forceLive = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("preview") === "live";
  const phase: "before" | "live" | "ended" = forceLive || (now >= EVENT_START && now < EVENT_END) ? "live" : now < EVENT_START ? "before" : "ended";

  const diff = Math.max(0, EVENT_START - now);
  const cd = {
    days: Math.floor(diff / 86400000),
    hours: Math.floor((diff / 3600000) % 24),
    mins: Math.floor((diff / 60000) % 60),
    secs: Math.floor((diff / 1000) % 60),
  };

  const startsAt = `${timeOf(EVENT_START, tz)} ${tzAbbr(EVENT_START, tz)}`.trim();
  const startsDay = shortDay(EVENT_START, tz);

  return (
    <div className="min-h-screen bg-warm-cream">
      <SEO
        title="Global Live Broadcast — 11.11.2026 | Kindness Forward"
        description="Join the 11.11.2026 Global Live Broadcast: a 24-hour live stream of kindness and the world's first synchronized 11:11 kindness moment, with a global heart meditation from Puerto Rico."
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
          <div className="section-padding relative mx-auto flex max-w-5xl flex-col items-center gap-6 pb-16 pt-32 text-center md:pt-36">
            <Eyebrow tone="dark">11.11.2026 · Global Kindness Moment</Eyebrow>
            <h1 className="font-display text-5xl leading-[1.02] tracking-tight md:text-6xl lg:text-7xl">
              11.11 Global Live Broadcast
            </h1>
            <p className="max-w-2xl text-base leading-relaxed text-warm-cream/75 md:text-lg">
              A 24-hour live stream of kindness from around the world, and our first global synchronized kindness
              moment. Help us create the world's largest heart-centered pause, together.
            </p>

            <div className="mt-4 flex w-full flex-col items-center gap-5">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-warm-sky">
                {phase === "before"
                  ? "The live broadcast begins in"
                  : phase === "live"
                    ? "The broadcast is live now"
                    : "The live broadcast has ended"}
              </p>

              {phase === "before" && (
                <div role="timer" aria-label="Countdown to the 11.11 live broadcast" className="flex w-full max-w-xl gap-3">
                  {(
                    [
                      [cd.days, "Days"],
                      [cd.hours, "Hours"],
                      [cd.mins, "Minutes"],
                      [cd.secs, "Seconds"],
                    ] as const
                  ).map(([n, label]) => (
                    <div key={label} className="min-w-0 flex-1 rounded-2xl border border-warm-cream/20 bg-white/10 px-2 py-4 backdrop-blur-sm md:py-5">
                      <div className="font-display text-4xl tabular-nums leading-none md:text-6xl">{pad(n)}</div>
                      <div className="mt-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-warm-cream/65 md:text-xs">{label}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Small zone picker right under the countdown. */}
              <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-sm text-warm-cream/75">
                <Clock size={16} className="shrink-0 text-warm-gold" aria-hidden="true" />
                <span>
                  {phase === "before" ? "Starts" : "Started"} 11:11 AM AST (Puerto Rico) ·{" "}
                  <strong className="font-semibold text-warm-cream">
                    {startsAt}, {startsDay}
                  </strong>
                </span>
                <ZoneSelect id="hero-tz" zones={zones} value={tz} onChange={setTz} tone="dark" />
              </div>
            </div>

            {/* The live panel only appears once the countdown reaches zero. */}
            {phase === "live" && (
              <div id="live" className="mt-4 w-full max-w-3xl scroll-mt-28 overflow-hidden rounded-3xl border border-warm-cream/20 bg-white/10 text-left backdrop-blur-sm">
                <div className="flex items-center gap-2 border-b border-warm-cream/15 px-5 py-3 text-xs font-bold uppercase tracking-[0.16em]">
                  <span className="inline-flex h-2.5 w-2.5 animate-pulse rounded-full bg-[#d81b60]" aria-hidden="true" />
                  Live · 11.11 Global Live Broadcast
                </div>
                {LIVE_EMBED_SRC ? (
                  <div className="aspect-video w-full bg-black">
                    <iframe
                      src={LIVE_EMBED_SRC}
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
                      The 24-hour broadcast is streaming now on our YouTube channel. Tune in and share it with your
                      community.
                    </p>
                    <a href={YOUTUBE_LIVE} target="_blank" rel="noopener noreferrer" className={btnPrimary}>
                      <Play size={18} aria-hidden="true" /> Watch live on YouTube
                    </a>
                  </div>
                )}
              </div>
            )}

            <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
              <a href={SUBMIT_URL} target="_blank" rel="noopener noreferrer" className={btnPrimary}>
                Submit a video
              </a>
              {phase === "ended" ? (
                <a href={YOUTUBE_CHANNEL} target="_blank" rel="noopener noreferrer" className={btnOutlineDark}>
                  <Play size={18} aria-hidden="true" /> Watch on YouTube
                </a>
              ) : (
                <a href={HERO_GOOGLE_CAL} target="_blank" rel="noopener noreferrer" className={btnOutlineDark}>
                  <CalendarPlus size={18} aria-hidden="true" /> Add to calendar
                </a>
              )}
            </div>
            {phase !== "ended" && (
              <a href={HERO_ICS} className="text-xs font-semibold text-warm-cream/70 underline underline-offset-2 hover:text-warm-cream">
                Apple / Outlook calendar
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

        {/* ---------------------------------------- be part of the broadcast */}
        <section id="submit" className="scroll-mt-24 bg-warm-sand">
          <div className="section-padding mx-auto max-w-6xl py-16 md:py-24">
            <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
              <div className="flex flex-col gap-5">
                <Eyebrow>Be part of the broadcast</Eyebrow>
                <h2 className="font-display text-3xl leading-tight text-foreground md:text-5xl">
                  Your voice belongs in this moment.
                </h2>
                <p className="text-base leading-relaxed text-foreground/75 md:text-lg">
                  Share a story, a message or an act of kindness and it could be featured in the 24-hour global
                  broadcast. Record a short video, upload it, and we'll carry it around the world.
                </p>
                <ol className="mt-2 flex flex-col gap-4">
                  {[
                    "Pick a segment that feels right for you.",
                    "Record horizontally, in a quiet space, in your own voice.",
                    "Upload it with the submission form. Deadline: November 9.",
                  ].map((step, i) => (
                    <li key={step} className="flex items-start gap-4">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-warm-terracotta text-sm font-bold text-white">
                        {i + 1}
                      </span>
                      <span className="pt-1 text-[15px] leading-snug text-foreground/85">{step}</span>
                    </li>
                  ))}
                </ol>
                <div className="mt-2">
                  <a href={SUBMIT_URL} target="_blank" rel="noopener noreferrer" className={btnPrimary}>
                    Submit your video
                  </a>
                </div>
              </div>
              <div className="aspect-video w-full overflow-hidden rounded-3xl bg-black shadow-[0_24px_60px_rgba(14,35,75,0.18)]">
                <iframe
                  width="560"
                  height="315"
                  src={CAMPAIGN_VIDEO_SRC}
                  title="YouTube video player"
                  className="h-full w-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  referrerPolicy="strict-origin-when-cross-origin"
                  allowFullScreen
                />
              </div>
            </div>

            <div className="mt-14">
              <h3 className="font-display text-2xl text-foreground md:text-3xl">Choose your segment</h3>
              <p className="mt-2 text-sm text-foreground/65">You'll pick one on the submission form.</p>
              <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {SEGMENTS.map(([num, name, length]) => (
                  <li key={num} className="flex items-center gap-4 rounded-2xl border border-border bg-white px-5 py-4 shadow-sm">
                    <span className="w-9 shrink-0 font-display text-2xl tabular-nums text-warm-terracotta">{num}</span>
                    <span className="min-w-0 flex-1 text-[15px] font-semibold leading-snug text-foreground">{name}</span>
                    <span className="shrink-0 rounded-full bg-warm-sand px-3 py-1 text-xs font-bold text-foreground/70">{length}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------ what's happening */}
        <section id="happening" className="scroll-mt-24 bg-white">
          <div className="section-padding mx-auto max-w-6xl py-16 md:py-24">
            <div className="flex max-w-2xl flex-col gap-4">
              <Eyebrow>What's happening</Eyebrow>
              <h2 className="font-display text-3xl leading-tight text-foreground md:text-5xl">
                One day. One moment. Every time zone.
              </h2>
              <p className="text-base leading-relaxed text-foreground/75 md:text-lg">
                On 11.11 the world takes part in three connected activations. Join one, or all three.
              </p>
            </div>

            <div className="mt-10 grid gap-5 md:grid-cols-3">
              {[
                {
                  n: 1,
                  time: "11:11 AM",
                  place: "Your local time",
                  title: "Take a 1-minute pause",
                  body: "Step away from every screen. Feel love for yourself, love for humanity, and love for planet Earth.",
                  bar: "#00a3e0",
                },
                {
                  n: 2,
                  time: "11:11 AM AST",
                  place: "Puerto Rico",
                  title: "Join the 5-minute global heart moment",
                  body: "Meditation, prayer, reflection and shared intention, originating from Puerto Rico, birthplace of the movement.",
                  bar: "#f2701d",
                },
                {
                  n: 3,
                  time: "24-hour live stream",
                  place: "Global Kindness Broadcast",
                  title: "Stories of kindness from around the world",
                  body: "Featuring world leaders, education and community leaders, business leaders, heart-centered celebrities, creators, influencers and athletes.",
                  bar: "#fbb813",
                },
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
              <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-foreground/60">11.11 at a glance</h3>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  { href: "#happening", top: "All day · Every time zone", title: "Rolling 11:11 pause", body: "Pause for one minute at 11:11 wherever you are." },
                  { href: "#germany", top: "15:15–16:18 CET", title: "Pre-11 · Germany", body: "Live from Yoga Vidya, building to the global moment." },
                  { href: "#happening", top: "11:11 AM AST", title: "Global heart moment", body: "A 5-minute guided meditation from Puerto Rico." },
                  { href: "#daaji", top: "After 11:11 AM AST", title: "Post-11 · Daaji & Heartfulness", body: "Guided meditation with Daaji." },
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
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-warm-gold">Global Kindness Season</p>
                  <p className="font-display text-2xl">1 November 2026 – 31 January 2027</p>
                </div>
                <p className="min-w-0 flex-1 basis-72 text-sm leading-relaxed text-warm-cream/80">
                  Do at least one act of kindness each day, and as many as you can. After each act, invite others to pass it forward.
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
              alt="Yoga Vidya mandala"
              loading="lazy"
              className="mx-auto aspect-square w-full max-w-[480px] rounded-3xl object-cover shadow-[0_24px_60px_rgba(14,35,75,0.18)]"
            />
            <div>
              <Eyebrow>Pre-11 · Germany</Eyebrow>
              <h2 className="mt-4 font-display text-3xl leading-tight text-foreground md:text-5xl">
                Countdown to a global moment of kindness
              </h2>
              <p className="mt-4 text-sm font-bold uppercase tracking-[0.14em] text-warm-sky">Live from Yoga Vidya, Germany</p>
              <p className="mt-3 text-base leading-relaxed text-foreground/75 md:text-lg">
                From gratitude to music, joy and global unity, a live programme that builds toward the world's 11:11 moment.
              </p>
              <DetailRows
                rows={[
                  [
                    "What",
                    "A live programme with a heart-to-heart conversation with Sukadev, a gratitude and heart meditation, and five songs, leading into the global moment.",
                  ],
                  [
                    "When",
                    <>
                      Wed, 11 November 2026 · 15:15–16:18 CET
                      <span className="mt-1 block font-semibold text-foreground">
                        Your time: {timeOf(GERMANY_START, tz)}–{timeOf(GERMANY_END, tz)} {tzAbbr(GERMANY_START, tz)}, {shortDay(GERMANY_START, tz)}
                      </span>
                    </>,
                  ],
                  ["Where", "Sivananda Hall, Yoga Vidya, Germany"],
                  [
                    "How",
                    "Watch on the live broadcast at the top of this page, and join the “Pass kindness forward” activation from anywhere in the world.",
                  ],
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
                <Eyebrow tone="dark">Post-11 · Daaji & Heartfulness</Eyebrow>
                <h2 className="mt-4 font-display text-3xl leading-tight md:text-5xl">The world meditates together.</h2>
                <p className="mt-4 text-base leading-relaxed text-warm-cream/75 md:text-lg">
                  Join a guided meditation with Daaji, streamed live to the world right after the 11:11 moment.
                </p>
                <DetailRows
                  tone="dark"
                  rows={[
                    ["What", "Guided meditation with Daaji"],
                    [
                      "When",
                      <>
                        11:11 AM AST, Wednesday, 11 November 2026
                        <span className="mt-1 block font-semibold text-warm-cream">
                          Your time: {startsAt}, {startsDay}
                        </span>
                      </>,
                    ],
                    [
                      "Where",
                      <>
                        Online, on the live broadcast at the top of this page and on our{" "}
                        <a href={YOUTUBE_CHANNEL} target="_blank" rel="noopener noreferrer" className="font-semibold text-warm-gold underline underline-offset-2">
                          YouTube channel
                        </a>
                      </>,
                    ],
                    ["How", "Tune in live from anywhere in the world. No travel needed."],
                  ]}
                />
              </div>
              <video
                controls
                playsInline
                preload="metadata"
                src={DAAJI_VIDEO_SRC}
                // The Heartfulness video is portrait (9:16): sized by height so it
                // fills its own frame with no black side bars.
                className="mx-auto aspect-[9/16] h-[520px] max-w-full rounded-3xl bg-black object-contain shadow-[0_24px_60px_rgba(0,0,0,0.35)] md:h-[600px]"
              >
                Your browser can't play this video.
              </video>
            </div>

            {/* Time + calendar card */}
            <div className="mt-12 grid gap-8 rounded-3xl border border-warm-cream/15 bg-white/10 p-6 md:p-8 lg:grid-cols-2">
              <div className="flex flex-col justify-center gap-3">
                <label htmlFor="daaji-tz" className="text-xs font-bold uppercase tracking-[0.16em] text-warm-cream/65">
                  Your time zone
                </label>
                <ZoneSelect id="daaji-tz" zones={zones} value={tz} onChange={setTz} tone="dark" />
                <p className="mt-3 text-sm text-warm-cream/65">Launch starts at</p>
                <p className="font-display text-6xl leading-none tabular-nums md:text-7xl">{timeOf(EVENT_START, tz)}</p>
                <p className="text-sm text-warm-cream/75">
                  {longDay(EVENT_START, tz)} · {tzAbbr(EVENT_START, tz)}
                </p>
              </div>
              <div className="flex flex-col justify-center gap-3">
                <div className="rounded-2xl bg-white/10 px-5 py-4">
                  <p className="font-bold">Guided meditation</p>
                  <p className="text-sm text-warm-cream/70">with Daaji</p>
                </div>
                <div className="rounded-2xl bg-white/10 px-5 py-4">
                  <p className="font-bold">Live global broadcast</p>
                  <p className="text-sm text-warm-cream/70">from 11:11 AM AST</p>
                </div>
                <a
                  href={DAAJI_GOOGLE_CAL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-flex h-[52px] items-center justify-center gap-2 rounded-full bg-white px-7 text-sm font-bold text-cyan-900 transition-transform duration-200 hover:scale-[1.02]"
                >
                  <CalendarPlus size={18} aria-hidden="true" /> Add to Google Calendar
                </a>
                <a href={DAAJI_ICS} className="self-center text-xs font-semibold text-warm-cream/75 underline underline-offset-2 hover:text-warm-cream">
                  Apple / Outlook calendar
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------ partners */}
        <section id="partners" className="scroll-mt-24 bg-white">
          <div className="section-padding mx-auto max-w-6xl py-16 md:py-24">
            <div className="flex max-w-2xl flex-col gap-4">
              <Eyebrow>Our featured partners</Eyebrow>
              <h2 className="font-display text-3xl leading-tight text-foreground md:text-5xl">
                Different traditions. One shared moment.
              </h2>
            </div>
            <div className="mt-10 grid gap-5 md:grid-cols-3">
              {[
                { name: "Heartfulness", role: "Post-11 guided meditation with Daaji", src: HEARTFULNESS_LOGO, wide: true },
                { name: "Yoga Vidya", role: "Hosting the Pre-11 live programme from Germany", src: "/partners/faith-based_yoga-vidya.jpg", wide: false },
                { name: "AWAKEN", role: "Official Broadcast Sponsor", src: "/partners/corporate_awaken---michael-krauss.jpg", wide: false },
              ].map((p) => (
                <article key={p.name} className="flex flex-col items-center gap-5 rounded-3xl border border-border bg-white p-8 text-center shadow-sm">
                  <div className="flex h-28 items-center justify-center">
                    <img
                      src={p.src}
                      alt={`${p.name} logo`}
                      loading="lazy"
                      className={p.wide ? "h-14 w-auto max-w-[220px]" : "h-28 w-28 rounded-2xl object-cover"}
                    />
                  </div>
                  <p className="max-w-[240px] text-[15px] font-semibold leading-snug text-foreground/75">{p.role}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------------ FAQ */}
        <section id="faq" className="scroll-mt-24 bg-warm-sand">
          <div className="section-padding mx-auto max-w-3xl py-16 md:py-24">
            <Eyebrow>FAQ</Eyebrow>
            <h2 className="mt-4 font-display text-3xl leading-tight text-foreground md:text-5xl">Questions, answered.</h2>
            <div className="mt-8 flex flex-col gap-3">
              {(
                [
                  [
                    "What is the 11.11 Global Kindness Moment?",
                    <p key="a">
                      It is our first global synchronized kindness moment. On 11.11, people around the world pause together at 11:11
                      in their local time, and join a 24-hour live broadcast of kindness stories.
                    </p>,
                  ],
                  [
                    "What time does it start in my time zone?",
                    <div key="a" className="flex flex-col gap-4">
                      <p>
                        The global moment is at 11:11 AM AST (Puerto Rico) on Wednesday, November 11, 2026. Here is what that looks
                        like in popular time zones:
                      </p>
                      <ul className="overflow-hidden rounded-xl border border-border bg-white">
                        {FAQ_ZONES.map((z) => (
                          <li key={z.id} className="flex items-center justify-between gap-4 border-b border-border px-4 py-2.5 text-sm last:border-b-0">
                            <span className="font-semibold text-foreground">{z.label}</span>
                            <span className="whitespace-nowrap tabular-nums text-foreground/70">
                              {timeOf(EVENT_START, z.id)} · {fmt(EVENT_START, z.id, { month: "short", day: "numeric" })}
                            </span>
                          </li>
                        ))}
                      </ul>
                      <p>
                        Not on the list? Check your exact local time on{" "}
                        <a href="https://www.worldtimebuddy.com/" target="_blank" rel="noopener noreferrer" className={linkCls}>
                          World Time Buddy
                        </a>
                        .
                      </p>
                    </div>,
                  ],
                  [
                    "How do I join the 1-minute pause?",
                    <p key="a">
                      At 11:11 AM wherever you are, step away from every screen for one minute. Feel love for yourself, for humanity
                      and for planet Earth.
                    </p>,
                  ],
                  [
                    "Do I need to be in Puerto Rico to join the 11:11 AST meditation?",
                    <p key="a">
                      No. The 5-minute guided moment originates from Puerto Rico, the birthplace of the movement, and is open to
                      everyone around the world. To tune in, subscribe to our YouTube channel:{" "}
                      <a href={YOUTUBE_CHANNEL} target="_blank" rel="noopener noreferrer" className={linkCls}>
                        youtube.com/@passkindnessforward
                      </a>
                      .
                    </p>,
                  ],
                  [
                    "Where can I watch the live broadcast?",
                    <p key="a">
                      You can watch through our social channels,{" "}
                      <a href="https://facebook.com/passkindnessforward" target="_blank" rel="noopener noreferrer" className={linkCls}>
                        Facebook
                      </a>{" "}
                      and{" "}
                      <a href={YOUTUBE_CHANNEL} target="_blank" rel="noopener noreferrer" className={linkCls}>
                        YouTube
                      </a>
                      , or on our website at{" "}
                      <a href={LIVE_PAGE_URL} className={linkCls}>
                        passkindnessforward.com/live
                      </a>
                      .
                    </p>,
                  ],
                  ["Is it free to take part?", <p key="a">Yes.</p>],
                  [
                    "How do I submit a video to the broadcast?",
                    <p key="a">
                      <a href={SUBMIT_URL} target="_blank" rel="noopener noreferrer" className={linkCls}>
                        Submit your video here
                      </a>
                      . Fill out the form, attach your video, add the event to your calendar, and follow our pages so you're notified
                      when we go live.
                    </p>,
                  ],
                  [
                    "What are the video guidelines (length, format, deadline)?",
                    <p key="a">
                      Format: MP4 or MOV. Length varies depending on the type of video you're sending. The deadline is November 9.
                    </p>,
                  ],
                  [
                    "Can my school, workplace or community take part together?",
                    <p key="a">
                      Definitely. Your school can join and send a collaborative video of everyone for Kindness Season.
                    </p>,
                  ],
                  [
                    "What is Global Kindness Season?",
                    <p key="a">
                      Global Kindness Season is our worldwide movement to spark 1 billion acts of kindness, running from 1 November
                      2026 to 31 January 2027. It grew out of Puerto Rico, where 1.1 million acts of kindness in November 2025 became a
                      certified world record. Do at least one act of kindness each day, and as many as you can, then invite others to
                      pass it forward.{" "}
                      <a href="/#get-involved-inline" className={linkCls}>
                        Make your pledge
                      </a>{" "}
                      to join.
                    </p>,
                  ],
                  [
                    "Will there be a replay?",
                    <p key="a">
                      Yes. The replay will be added to our{" "}
                      <a href={YOUTUBE_CHANNEL} target="_blank" rel="noopener noreferrer" className={linkCls}>
                        YouTube channel
                      </a>{" "}
                      and to our website.
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
              <a href={SUBMIT_URL} target="_blank" rel="noopener noreferrer" className={btnPrimary}>
                Submit a video
              </a>
              <a href="/" className="inline-flex items-center gap-1.5 text-sm font-bold text-warm-sky hover:underline">
                Join the movement →
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
