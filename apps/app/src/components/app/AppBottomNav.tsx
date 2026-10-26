import { NavLink, useNavigate } from "react-router-dom";
import { Home, LayoutGrid, ScanLine, Radio, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@shared/lib/utils";
import { useAuth } from "@shared/contexts/AuthContext";
import { useLanguage } from "@shared/contexts/LanguageContext";

// `needsLogin` tabs are wrapped in RequireVerified, which would silently
// bounce a signed-out visitor to the Wall — explain why instead.
const TABS = [
  { to: "/", label: "home", Icon: Home, end: true, needsLogin: false },
  { to: "/wall", label: "wall", Icon: LayoutGrid, end: false, needsLogin: false },
  { to: "/map", label: "map", Icon: Radio, end: false, needsLogin: true },
  { to: "/badges", label: "badges", Icon: Sparkles, end: false, needsLogin: true },
] as const;

/**
 * Five-slot tab bar with the Pass action raised into the middle, matching the
 * beta app's navigation.
 */
export default function AppBottomNav() {
  const { t } = useLanguage();
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const blockIfSignedOut = (needsLogin: boolean, label: string) =>
    needsLogin && !loading && !user
      ? (e: React.MouseEvent) => {
          e.preventDefault();
          toast.error(t.appNavigation.loginRequired.replace("{feature}", label), {
            id: "nav-login-required",
            action: { label: t.appWidgets.logIn, onClick: () => navigate("/join") },
          });
        }
      : undefined;

  return (
    <nav
      aria-label={t.appNavigation.sections}
      className="fixed inset-x-0 bottom-0 z-40 mx-auto flex w-full items-end justify-around border-t border-border bg-app-surface/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur 2xl:max-w-3xl"
    >
      {TABS.slice(0, 2).map(({ to, label, Icon, end, needsLogin }) => (
        <Tab
          key={to}
          to={to}
          label={t.appNavigation[label]}
          Icon={Icon}
          end={end}
          onClick={blockIfSignedOut(needsLogin, t.appNavigation[label])}
        />
      ))}

      <NavLink
        to="/pass"
        className="flex w-16 flex-col items-center gap-1"
        aria-label={t.appNavigation.shareScanAria}
      >
        {({ isActive }) => (
          <>
            <span
              className={cn(
                "-mt-7 flex h-16 w-16 items-center justify-center rounded-full shadow-lg transition-transform",
                isActive ? "bg-app-coral scale-105" : "bg-app-coral/90 hover:scale-105",
              )}
              style={{ border: "4px solid hsl(var(--app-canvas))" }}
            >
              <ScanLine className="h-7 w-7 text-app-surface" strokeWidth={2.25} />
            </span>
            <span
              className={cn(
                "text-center text-[10.5px] font-bold leading-tight",
                isActive ? "text-app-coral" : "text-muted-foreground",
              )}
            >
              {t.appNavigation.shareScan}
            </span>
          </>
        )}
      </NavLink>

      {TABS.slice(2).map(({ to, label, Icon, end, needsLogin }) => (
        <Tab
          key={to}
          to={to}
          label={t.appNavigation[label]}
          Icon={Icon}
          end={end}
          onClick={blockIfSignedOut(needsLogin, t.appNavigation[label])}
        />
      ))}
    </nav>
  );
}

function Tab({
  to,
  label,
  Icon,
  end,
  onClick,
}: {
  to: string;
  label: string;
  Icon: typeof Home;
  end: boolean;
  onClick?: (e: React.MouseEvent) => void;
}) {
  return (
    <NavLink to={to} end={end} onClick={onClick} className="flex w-16 flex-col items-center gap-1 py-1">
      {({ isActive }) => (
        <>
          <Icon
            className={cn("h-6 w-6", isActive ? "text-app-coral" : "text-muted-foreground")}
            strokeWidth={isActive ? 2.4 : 1.9}
          />
          <span
            className={cn(
              "text-xs",
              isActive ? "font-semibold text-app-coral" : "text-muted-foreground",
            )}
          >
            {label}
          </span>
        </>
      )}
    </NavLink>
  );
}
