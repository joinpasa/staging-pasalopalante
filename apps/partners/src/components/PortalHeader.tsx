import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { Bug, ChevronDown, Compass, Globe, Layers, LayoutDashboard, LifeBuoy, LogOut, Menu, QrCode, X } from "lucide-react";
import { useCopy } from "@/lib/i18n";
import { useSession } from "@/lib/session";
import { openSupportChat } from "@/lib/supportChat";
import { REPORT_ISSUE_URL } from "@/lib/links";
import { TOUR_EVENT } from "@/lib/tour";

export function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase() || "?";
}

const itemClass =
  "flex h-11 w-full items-center gap-2.5 rounded-xl px-3 text-start text-sm font-semibold text-ink no-underline hover:bg-canvas";

/** Account actions shared by the desktop dropdown and the mobile menu. */
function AccountItems({ close }: { close: () => void }) {
  const { t, toggle } = useCopy();
  const { staff, partner, logout } = useSession();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  return (
    <>
      <button
        type="button"
        onClick={() => {
          close();
          // The tour lives on the dashboard; from elsewhere, go there and start it.
          if (pathname === "/") window.dispatchEvent(new Event(TOUR_EVENT));
          else navigate("/", { state: { tour: true } });
        }}
        className={itemClass}
      >
        <Compass className="h-4 w-4 text-sun-ink" />
        {t.takeTour}
      </button>
      <button
        type="button"
        onClick={() => {
          openSupportChat(staff ? { name: staff.name, organization: partner?.name } : undefined);
          close();
        }}
        className={itemClass}
      >
        <LifeBuoy className="h-4 w-4 text-sky" />
        {t.getSupport}
      </button>
      <a href={REPORT_ISSUE_URL} target="_blank" rel="noopener noreferrer" onClick={close} className={itemClass}>
        <Bug className="h-4 w-4 text-orange" />
        {t.reportIssue}
      </a>
      <div className="my-1 border-t border-line-faint" />
      <button
        type="button"
        onClick={() => {
          toggle();
          close();
        }}
        className={itemClass}
      >
        <Globe className="h-4 w-4 text-sky" />
        {t.language}
      </button>
      <button type="button" onClick={() => void logout()} className={itemClass}>
        <LogOut className="h-4 w-4 text-rose" />
        {t.logOut}
      </button>
    </>
  );
}

function useDismiss(open: boolean, setOpen: (o: boolean) => void, ref: React.RefObject<HTMLElement>) {
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, setOpen, ref]);
}

export default function PortalHeader({ minimal = false }: { minimal?: boolean }) {
  const { t } = useCopy();
  const { staff, partner } = useSession();
  const { pathname } = useLocation();
  const [desktopOpen, setDesktopOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const desktopRef = useRef<HTMLDivElement>(null);
  const mobileRef = useRef<HTMLDivElement>(null);
  useDismiss(desktopOpen, setDesktopOpen, desktopRef);
  useDismiss(mobileOpen, setMobileOpen, mobileRef);

  // Close the mobile menu after navigating.
  useEffect(() => setMobileOpen(false), [pathname]);

  const navClass = ({ isActive }: { isActive: boolean }) =>
    `border-b-[3px] py-2 text-sm no-underline ${
      isActive ? "border-sun font-bold text-white" : "border-transparent font-semibold text-ink-onnavy hover:text-white"
    }`;
  const mobileNavClass = ({ isActive }: { isActive: boolean }) =>
    `${itemClass} ${isActive ? "bg-sky-wash text-sky-ink" : ""}`;

  return (
    <header className="sticky top-0 z-30 bg-navy" ref={mobileRef}>
      <div className="flex h-16 items-center justify-between px-4 lg:h-[72px] lg:px-10 xl:px-40">
        <Link to="/" className="flex items-center gap-3 no-underline">
          <img src="/kf-logo-on-dark.webp" alt="Kindness Forward" width={123} height={40} className="h-9 w-auto lg:h-10" />
          <span className="hidden border-s border-white/25 ps-3 text-base font-bold text-white sm:inline">{t.portal}</span>
        </Link>

        {/* Desktop: inline nav + account dropdown */}
        <nav className="hidden items-center gap-5 md:flex lg:gap-7">
          {!minimal && (
            <>
              <NavLink to="/" end className={navClass}>
                {t.dashboard}
              </NavLink>
              <NavLink to="/bulk" className={navClass}>
                {t.bulkLog}
              </NavLink>
              <NavLink to="/invite" data-tour="invite" className={navClass}>
                {t.inviteTeam}
              </NavLink>
            </>
          )}
          <div className="relative" ref={desktopRef}>
            <button
              type="button"
              data-tour="menu"
              aria-label={t.accountMenu}
              aria-expanded={desktopOpen}
              onClick={() => setDesktopOpen((o) => !o)}
              className="flex h-11 items-center gap-2.5 bg-transparent pe-1.5 ps-1 text-sm font-semibold text-white"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-sun text-[13px] font-extrabold text-navy">
                {initials(staff?.name ?? "")}
              </span>
              <span>{staff?.name}</span>
              <ChevronDown className="h-4 w-4" />
            </button>
            {desktopOpen && (
              <div className="absolute end-0 top-12 w-64 rounded-2xl border border-line-soft bg-white p-2 text-ink shadow-card">
                <div className="mb-1 flex flex-col border-b border-line-faint px-3 pb-2.5 pt-1.5">
                  <span className="truncate text-sm font-bold">{staff?.name}</span>
                  <span className="truncate text-[13px] text-ink-muted">{partner?.name}</span>
                </div>
                <AccountItems close={() => setDesktopOpen(false)} />
              </div>
            )}
          </div>
        </nav>

        {/* Mobile: one menu button for everything */}
        <button
          type="button"
          data-tour="menu"
          aria-label={mobileOpen ? t.closeMenu : t.openMenu}
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((o) => !o)}
          className="flex h-11 items-center gap-2 rounded-full bg-white/10 pe-3 ps-1 text-white md:hidden"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-sun text-[13px] font-extrabold text-navy">
            {initials(staff?.name ?? "")}
          </span>
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {mobileOpen && (
        <div className="max-h-[calc(100vh-4rem)] overflow-y-auto border-t border-white/10 bg-white px-4 pb-4 pt-3 text-ink shadow-card md:hidden">
          <div className="mb-2 flex items-center gap-3 px-3 py-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-sun text-sm font-extrabold text-navy">
              {initials(staff?.name ?? "")}
            </span>
            <span className="flex min-w-0 flex-col">
              <span className="truncate text-sm font-bold">{staff?.name}</span>
              <span className="truncate text-[13px] text-ink-muted">{partner?.name}</span>
            </span>
          </div>
          {!minimal && (
            <>
              <NavLink to="/" end className={mobileNavClass}>
                <LayoutDashboard className="h-4 w-4 text-navy" />
                {t.dashboard}
              </NavLink>
              <NavLink to="/bulk" className={mobileNavClass}>
                <Layers className="h-4 w-4 text-navy" />
                {t.bulkLog}
              </NavLink>
              <NavLink to="/invite" className={mobileNavClass}>
                <QrCode className="h-4 w-4 text-navy" />
                {t.inviteTeam}
              </NavLink>
              <div className="my-1 border-t border-line-faint" />
            </>
          )}
          <AccountItems close={() => setMobileOpen(false)} />
        </div>
      )}
    </header>
  );
}
