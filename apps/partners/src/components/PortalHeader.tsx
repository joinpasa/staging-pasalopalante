import { useEffect, useRef, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { Bug, ChevronDown, Globe, LifeBuoy, LogOut } from "lucide-react";
import { useCopy } from "@/lib/i18n";
import { useSession } from "@/lib/session";
import { openSupportChat } from "@/lib/supportChat";
import { REPORT_ISSUE_URL } from "@/lib/links";

export function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase() || "?";
}

export default function PortalHeader({ minimal = false }: { minimal?: boolean }) {
  const { t, toggle } = useCopy();
  const { staff, partner, logout } = useSession();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const navClass = ({ isActive }: { isActive: boolean }) =>
    `border-b-[3px] py-2 text-sm no-underline ${
      isActive ? "border-sun font-bold text-white" : "border-transparent font-semibold text-ink-onnavy hover:text-white"
    }`;

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between bg-navy px-4 lg:h-[72px] lg:px-10 xl:px-40">
      <Link to="/" className="flex items-center gap-3 no-underline">
        <img src="/logo-PKF-white.svg" alt="Pass Kindness Forward" className="h-14 w-auto lg:h-16" />
        <span className="hidden text-base font-bold text-white sm:inline">{t.portal}</span>
      </Link>
      <nav className="flex items-center gap-5 lg:gap-7">
        {!minimal && (
          <>
            <NavLink to="/" end className={navClass}>
              {t.dashboard}
            </NavLink>
            <NavLink to="/bulk" className={navClass}>
              {t.bulkLog}
            </NavLink>
          </>
        )}
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            aria-label="Account menu"
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
            className="flex h-11 items-center gap-2.5 bg-transparent pe-1.5 ps-1 text-sm font-semibold text-white"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-sun text-[13px] font-extrabold text-navy">
              {initials(staff?.name ?? "")}
            </span>
            <span className="hidden md:inline">{staff?.name}</span>
            <ChevronDown className="hidden h-4 w-4 md:block" />
          </button>
          {open && (
            <div className="absolute end-0 top-12 w-64 rounded-2xl border border-line-soft bg-white p-2 text-ink shadow-card">
              <div className="flex flex-col border-b border-line-faint px-3 pb-2.5 pt-1.5">
                <span className="truncate text-sm font-bold">{staff?.name}</span>
                <span className="truncate text-[13px] text-ink-muted">{partner?.name}</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  openSupportChat();
                  setOpen(false);
                }}
                className="mt-1 flex h-11 w-full items-center gap-2.5 rounded-xl px-3 text-start text-sm font-semibold hover:bg-canvas"
              >
                <LifeBuoy className="h-4 w-4 text-sky" />
                {t.getSupport}
              </button>
              <a
                href={REPORT_ISSUE_URL}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setOpen(false)}
                className="flex h-11 w-full items-center gap-2.5 rounded-xl px-3 text-start text-sm font-semibold text-ink no-underline hover:bg-canvas"
              >
                <Bug className="h-4 w-4 text-orange" />
                {t.reportIssue}
              </a>
              <div className="my-1 border-t border-line-faint" />
              <button
                type="button"
                onClick={() => {
                  toggle();
                  setOpen(false);
                }}
                className="flex h-11 w-full items-center gap-2.5 rounded-xl px-3 text-start text-sm font-semibold hover:bg-canvas"
              >
                <Globe className="h-4 w-4 text-sky" />
                {t.language}
              </button>
              <button
                type="button"
                onClick={() => void logout()}
                className="flex h-11 w-full items-center gap-2.5 rounded-xl px-3 text-start text-sm font-semibold hover:bg-canvas"
              >
                <LogOut className="h-4 w-4 text-rose" />
                {t.logOut}
              </button>
            </div>
          )}
        </div>
      </nav>
    </header>
  );
}
