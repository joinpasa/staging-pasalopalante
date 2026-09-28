import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Flag, HelpCircle, LogOut, Settings, Users } from "lucide-react";

import { useAuth } from "@shared/contexts/AuthContext";
import { useAppMe } from "@/hooks/useAppData";
import { openSupportChat } from "@/lib/supportChat";
import { cn } from "@shared/lib/utils";

const REPORT_ISSUE_URL = "https://pasalopalante.com/tech-form";

const itemClass =
  "flex w-full items-center gap-2.5 px-4 py-3 text-left text-[13.5px] font-medium text-foreground hover:bg-app-canvas";

/**
 * The avatar button in the Dashboard's top bar and its dropdown — replaces
 * the old bare "Account" text link. Signed-out visitors still just get a
 * "Join" pill, unchanged.
 */
export default function AccountMenu({ highlighted = false }: { highlighted?: boolean }) {
  const { user, signOut } = useAuth();
  const { data: me } = useAppMe();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  if (!user) {
    return (
      <Link
        to="/join"
        className="rounded-full bg-app-coral px-3 py-1.5 text-xs font-semibold text-app-surface"
      >
        Join
      </Link>
    );
  }

  const initial = (me?.firstName || me?.displayName || "P").trim().charAt(0).toUpperCase() || "P";

  async function handleLogout() {
    await signOut();
    navigate("/wall", { replace: true });
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Account menu"
        aria-expanded={open}
        className={cn(
          "relative flex h-10 w-10 items-center justify-center rounded-full bg-app-ink text-sm font-bold text-app-surface",
          highlighted && "z-50 ring-4 ring-app-coral/40",
        )}
      >
        {initial}
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-30 w-[226px] overflow-hidden rounded-2xl border border-border bg-app-surface shadow-xl">
          <div className="flex items-center gap-2.5 border-b border-border px-4 py-3.5">
            <span className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full bg-app-ink text-[13px] font-bold text-app-surface">
              {initial}
            </span>
            <div className="min-w-0">
              <p className="truncate text-[13.5px] font-bold text-foreground">
                {me?.displayName || "Friend"}
              </p>
              <p className="truncate text-[11.5px] text-muted-foreground">{me?.place ?? "Worldwide"}</p>
            </div>
          </div>

          <Link to="/account" onClick={() => setOpen(false)} className={itemClass}>
            <Settings className="h-[17px] w-[17px] shrink-0 text-foreground" strokeWidth={1.8} />
            My Account
          </Link>
          <Link to="/connections" onClick={() => setOpen(false)} className={itemClass}>
            <Users className="h-[17px] w-[17px] shrink-0 text-foreground" strokeWidth={1.8} />
            My Network
          </Link>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              openSupportChat();
            }}
            className={itemClass}
          >
            <HelpCircle className="h-[17px] w-[17px] shrink-0 text-foreground" strokeWidth={1.8} />
            Get Support
          </button>
          <a
            href={REPORT_ISSUE_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setOpen(false)}
            className={itemClass}
          >
            <Flag className="h-[17px] w-[17px] shrink-0 text-foreground" strokeWidth={1.8} />
            Report an Issue
          </a>

          <div className="my-0.5 h-px bg-border" />

          <button type="button" onClick={handleLogout} className={cn(itemClass, "text-app-magenta")}>
            <LogOut className="h-[17px] w-[17px] shrink-0 text-app-magenta" strokeWidth={1.8} />
            Logout
          </button>
        </div>
      )}
    </div>
  );
}
