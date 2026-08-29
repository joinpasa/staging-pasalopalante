import { NavLink } from "react-router-dom";
import { Home, LayoutGrid, ScanLine, Radio, Sparkles } from "lucide-react";
import { cn } from "@shared/lib/utils";

const TABS = [
  { to: "/", label: "Home", Icon: Home, end: true },
  { to: "/wall", label: "Wall", Icon: LayoutGrid, end: false },
  { to: "/map", label: "Map", Icon: Radio, end: false },
  { to: "/badges", label: "Badges", Icon: Sparkles, end: false },
];

/**
 * Five-slot tab bar with the Pass action raised into the middle, matching the
 * beta app's navigation.
 */
export default function AppBottomNav() {
  return (
    <nav
      aria-label="App sections"
      className="fixed inset-x-0 bottom-0 z-40 mx-auto flex max-w-md items-end justify-around border-t border-border bg-app-surface/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur"
    >
      {TABS.slice(0, 2).map(({ to, label, Icon, end }) => (
        <Tab key={to} to={to} label={label} Icon={Icon} end={end} />
      ))}

      <NavLink
        to="/pass"
        className="flex w-16 flex-col items-center gap-1"
        aria-label="Pass it forward"
      >
        {({ isActive }) => (
          <>
            <span
              className={cn(
                "-mt-6 flex h-14 w-14 items-center justify-center rounded-2xl shadow-lg transition-transform",
                isActive ? "bg-app-coral scale-105" : "bg-app-coral/90 hover:scale-105",
              )}
            >
              <ScanLine className="h-7 w-7 text-app-surface" strokeWidth={2.25} />
            </span>
            <span
              className={cn(
                "text-[11px] font-semibold",
                isActive ? "text-app-coral" : "text-muted-foreground",
              )}
            >
              Pass
            </span>
          </>
        )}
      </NavLink>

      {TABS.slice(2).map(({ to, label, Icon, end }) => (
        <Tab key={to} to={to} label={label} Icon={Icon} end={end} />
      ))}
    </nav>
  );
}

function Tab({
  to,
  label,
  Icon,
  end,
}: {
  to: string;
  label: string;
  Icon: typeof Home;
  end: boolean;
}) {
  return (
    <NavLink to={to} end={end} className="flex w-16 flex-col items-center gap-1 py-1">
      {({ isActive }) => (
        <>
          <Icon
            className={cn("h-5 w-5", isActive ? "text-app-coral" : "text-muted-foreground")}
            strokeWidth={isActive ? 2.4 : 1.9}
          />
          <span
            className={cn(
              "text-[11px]",
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
