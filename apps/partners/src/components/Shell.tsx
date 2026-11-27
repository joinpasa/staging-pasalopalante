import { useState, type DragEvent, type ReactNode } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { CalendarDays, Globe, Home, ImagePlus, Lightbulb, Map as MapIcon, Newspaper, Package, Plus, UserRound, Users } from "lucide-react";
import { useHubCopy } from "@/lib/hubCopy";
import { useMe } from "@/lib/hub";
import Avatar from "./Avatar";
import CreateSheet from "./CreateSheet";
import { ShareMediaProvider, useShareMedia } from "./ShareMedia";
import Tour from "./Tour";

/**
 * The Partners Hub frame (25 Nov 2026), laid out the way social apps are: a feed in the middle,
 * a left menu on a computer, a bottom tab bar with a big + on a phone. Light and square-edged.
 * On a computer every tab is in the menu. On a phone the bar holds Home, Community, +, Ideas and
 * Kit; the map sits inside Community, and News, Events and Me are at the top, the way social apps
 * do it. Under the menu on a computer, "Share your moments" opens a short pop-up and then the file
 * picker, and takes files dropped on it (27-28 Nov 2026: a tester couldn't find where pictures go,
 * then asked for a clearer name and a word on how we use them).
 */
type ShellProps = { children: ReactNode; aside?: ReactNode; wide?: boolean };

export default function Shell(props: ShellProps) {
  return (
    <ShareMediaProvider>
      <Frame {...props} />
    </ShareMediaProvider>
  );
}

function Frame({ children, aside, wide = false }: ShellProps) {
  const { h, toggle } = useHubCopy();
  const { data: me } = useMe();
  const media = useShareMedia();
  const [creating, setCreating] = useState(false);
  const [dropping, setDropping] = useState(false);
  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDropping(false);
    if (e.dataTransfer.files.length) media?.share(e.dataTransfer.files);
  };

  const tabs = [
    { to: "/", label: h.home, icon: Home, end: true },
    { to: "/people", label: h.community, icon: Users, end: false },
    { to: "/map", label: h.map, icon: MapIcon, end: false },
    { to: "/events", label: h.events, icon: CalendarDays, end: false },
    { to: "/ideas", label: h.ideas, icon: Lightbulb, end: false },
    { to: "/updates", label: h.news, icon: Newspaper, end: false },
    { to: "/kit", label: h.kit, icon: Package, end: false },
    { to: "/me", label: h.me, icon: UserRound, end: false },
  ];
  const phoneTabs = [
    { to: "/", label: h.home, icon: Home, end: true },
    { to: "/people", label: h.community, icon: Users, end: false, also: ["/map"] },
    { to: "/ideas", label: h.ideas, icon: Lightbulb, end: false },
    { to: "/kit", label: h.kit, icon: Package, end: false },
  ];

  const railLink = ({ isActive }: { isActive: boolean }) =>
    `flex h-11 items-center gap-3.5 px-3 text-[16px] no-underline transition ${
      isActive ? "bg-tint-sky font-extrabold text-navy" : "font-semibold text-ink2 hover:bg-tint-sky/60"
    }`;

  return (
    <div className="min-h-screen bg-white">
      <div className="h-1 bg-bar" aria-hidden="true" />

      {/* phone: top bar */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b-[1.5px] border-hair bg-white/95 px-4 backdrop-blur lg:hidden">
        <Link to="/" className="flex items-center no-underline" aria-label={h.home}>
          <img src="/kf-logo.webp" alt="Kindness Forward" className="h-8 w-auto" />
        </Link>
        <div className="flex items-center gap-1">
          <NavLink
            to="/updates"
            className={({ isActive }) => `flex h-9 w-9 items-center justify-center ${isActive ? "bg-tint-sky text-sky-deep" : "text-ink2"}`}
            aria-label={h.news}
            data-tour="news"
          >
            <Newspaper className="h-5 w-5" aria-hidden="true" />
          </NavLink>
          <NavLink
            to="/events"
            className={({ isActive }) => `flex h-9 w-9 items-center justify-center ${isActive ? "bg-tint-sky text-sky-deep" : "text-ink2"}`}
            aria-label={h.events}
            data-tour="events"
          >
            <CalendarDays className="h-5 w-5" aria-hidden="true" />
          </NavLink>
          <button type="button" onClick={toggle} className="flex h-9 items-center gap-1.5 px-2 text-[13px] font-bold text-ink2" aria-label={h.language}>
            <Globe className="h-4 w-4 text-sky" aria-hidden="true" />
            {h.language === "Español" ? "ES" : "EN"}
          </button>
          <Link to="/me" aria-label={h.me} className="no-underline" data-tour="me">
            <Avatar name={me?.name ?? ""} url={me?.logoUrl} kind={me?.kind ?? "organisation"} size={34} />
          </Link>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-[1280px]">
        {/* computer: left menu */}
        <aside className="sticky top-1 hidden h-[calc(100vh-4px)] w-[270px] shrink-0 flex-col gap-1 overflow-y-auto border-e-[1.5px] border-hair px-4 py-5 [scrollbar-width:thin] lg:flex [&>*]:shrink-0">
          <Link to="/" className="mb-4 px-3 no-underline">
            <img src="/kf-logo.webp" alt="Kindness Forward" className="h-10 w-auto" />
            <span className="mt-1 block text-[13px] font-extrabold text-sky-deep">{h.hubName}</span>
          </Link>
          <nav className="flex flex-col gap-1">
            {tabs.map((t) => (
              <NavLink key={t.to} to={t.to} end={t.end} className={railLink} data-tour={t.to === "/" ? "home" : t.to.slice(1)}>
                <t.icon className="h-[22px] w-[22px]" aria-hidden="true" />
                {t.label}
              </NavLink>
            ))}
          </nav>
          {/* photos and videos in one click, or dropped straight on it */}
          <button
            type="button"
            onClick={() => media?.pick()}
            onDragOver={(e) => (e.preventDefault(), setDropping(true))}
            onDragLeave={() => setDropping(false)}
            onDrop={onDrop}
            // 28 Nov: a menu item like the others ("Share your moments"); it opens a short pop-up first
            className={`flex min-h-11 w-full items-center gap-3.5 px-3 py-1.5 text-start text-[16px] font-semibold leading-tight transition ${
              dropping ? "bg-tint-orange text-navy outline-dashed outline-[1.5px] -outline-offset-[1.5px] outline-orange" : "text-ink2 hover:bg-tint-sky/60"
            }`}
            data-tour="media"
          >
            <ImagePlus className="h-[22px] w-[22px] shrink-0 text-sky" aria-hidden="true" />
            {dropping ? h.mediaCtaSub : h.mediaShort}
          </button>
          <button type="button" onClick={() => setCreating(true)} className="btn-orange mt-3 h-12 w-full text-base" data-tour="create">
            <Plus className="h-5 w-5" aria-hidden="true" />
            {h.create}
          </button>
          <div className="mt-auto flex flex-col gap-3 pt-3">
            <button type="button" onClick={toggle} className="flex items-center gap-2 px-3 text-sm font-bold text-ink2 hover:text-navy">
              <Globe className="h-4 w-4 text-sky" aria-hidden="true" />
              {h.language}
            </button>
            {me && (
              <Link to="/me" className="flex items-center gap-3 border-t-[1.5px] border-hair px-1 pt-4 no-underline">
                <Avatar name={me.name} url={me.logoUrl} kind={me.kind} size={40} />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-extrabold text-navy">{me.name}</span>
                  <span className="block truncate text-xs font-semibold text-ink-faint">{[me.city, me.country].filter(Boolean).join(", ")}</span>
                </span>
              </Link>
            )}
          </div>
        </aside>

        <main className={`min-w-0 flex-1 pb-28 lg:pb-12 ${aside ? "xl:flex xl:gap-8" : ""}`}>
          <div className={`mx-auto w-full min-w-0 ${wide ? "max-w-[980px]" : "max-w-[640px]"} px-4 pt-5 lg:px-8 lg:pt-8`}>{children}</div>
          {aside && <div className="hidden w-[300px] shrink-0 flex-col gap-6 pt-8 pe-6 xl:flex">{aside}</div>}
        </main>
      </div>

      {/* phone: bottom tabs with the big + in the middle */}
      <nav
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t-[1.5px] border-hair bg-white/95 backdrop-blur lg:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        {phoneTabs.slice(0, 2).map((t) => (
          <TabLink key={t.to} {...t} />
        ))}
        <button type="button" onClick={() => setCreating(true)} className="flex flex-col items-center justify-center gap-0.5 py-1.5" aria-label={h.create} data-tour="create">
          <span className="flex h-9 w-9 items-center justify-center bg-orange text-white">
            <Plus className="h-6 w-6" aria-hidden="true" />
          </span>
          <span className="text-[11px] font-extrabold text-orange">{h.create}</span>
        </button>
        {phoneTabs.slice(2).map((t) => (
          <TabLink key={t.to} {...t} />
        ))}
      </nav>

      <CreateSheet open={creating} onClose={() => setCreating(false)} />
      <Tour />
    </div>
  );
}

function TabLink({ to, label, icon: Icon, end, also = [] }: { to: string; label: string; icon: typeof Home; end: boolean; also?: string[] }) {
  const { pathname } = useLocation();
  const extra = also.some((p) => pathname.startsWith(p));
  return (
    <NavLink
      to={to}
      end={end}
      data-tour={to === "/" ? "home" : to.slice(1)}
      className={({ isActive }) =>
        `flex flex-col items-center justify-center gap-1 py-2 text-[11px] font-bold no-underline ${isActive || extra ? "text-navy" : "text-ink-faint"}`
      }
    >
      {({ isActive }) => (
        <>
          <Icon className={`h-[22px] w-[22px] ${isActive || extra ? "text-sky" : ""}`} aria-hidden="true" />
          {label}
        </>
      )}
    </NavLink>
  );
}
