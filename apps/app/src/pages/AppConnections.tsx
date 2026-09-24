import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowDownLeft, ArrowLeft, ArrowUpRight, Globe2, Link2, Users } from "lucide-react";
import { useLongestChain, useMyConnections, type Connection, type ConnectionDirection } from "@/hooks/useAppData";
import { timeAgo } from "@shared/lib/appActs";
import { cn } from "@shared/lib/utils";

const FILTERS: { key: "all" | ConnectionDirection; label: string }[] = [
  { key: "all", label: "All" },
  { key: "passed_to", label: "Passed to" },
  { key: "received_from", label: "Received from" },
];

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function DirectionBadge({ direction }: { direction: ConnectionDirection }) {
  if (direction === "both") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-app-sky/10 px-2 py-0.5 text-[10.5px] font-bold text-app-sky">
        <ArrowUpRight className="h-3 w-3" />
        <ArrowDownLeft className="h-3 w-3 -ml-1.5" />
        Both ways
      </span>
    );
  }
  if (direction === "passed_to") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-app-coral/10 px-2 py-0.5 text-[10.5px] font-bold text-app-coral">
        <ArrowUpRight className="h-3 w-3" />
        You passed to them
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-app-teal/10 px-2 py-0.5 text-[10.5px] font-bold text-app-teal">
      <ArrowDownLeft className="h-3 w-3" />
      They passed to you
    </span>
  );
}

export default function AppConnections() {
  const { data: connections, isLoading } = useMyConnections();
  const { data: longestChain } = useLongestChain();
  const [filter, setFilter] = useState<"all" | ConnectionDirection>("all");

  const list = connections ?? [];
  const countries = useMemo(
    () => new Set(list.map((c) => c.country).filter((c): c is string => !!c)),
    [list],
  );
  const filtered = useMemo(
    () => (filter === "all" ? list : list.filter((c) => c.direction === filter || c.direction === "both")),
    [list, filter],
  );

  return (
    <div className="px-5 pt-6 pb-4">
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Home
      </Link>

      <h1 className="mt-3 font-sans text-3xl font-extrabold tracking-tight text-foreground">
        My Network
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Everyone you've connected with in person via Pass.
      </p>

      <div className="mt-5 grid grid-cols-3 gap-3">
        <div className="flex flex-col gap-1.5 rounded-2xl bg-app-magenta/10 p-3">
          <Users className="h-[17px] w-[17px] text-app-magenta" strokeWidth={1.6} />
          <p className="text-[19px] font-extrabold leading-none text-foreground">{list.length}</p>
          <p className="text-[10.5px] leading-tight text-muted-foreground">Connections</p>
        </div>
        <div className="flex flex-col gap-1.5 rounded-2xl bg-app-sky/10 p-3">
          <Globe2 className="h-[17px] w-[17px] text-app-sky" strokeWidth={1.6} />
          <p className="text-[19px] font-extrabold leading-none text-foreground">{countries.size}</p>
          <p className="text-[10.5px] leading-tight text-muted-foreground">Countries</p>
        </div>
        <div className="flex flex-col gap-1.5 rounded-2xl bg-app-gold/15 p-3">
          <Link2 className="h-[17px] w-[17px] text-app-gold" strokeWidth={1.6} />
          <p className="text-[19px] font-extrabold leading-none text-foreground">{longestChain ?? 0}</p>
          <p className="text-[10.5px] leading-tight text-muted-foreground">Longest chain</p>
        </div>
      </div>

      {list.length > 0 && (
        <div className="mt-5 flex gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={cn(
                "rounded-full px-3.5 py-1.5 text-xs font-bold",
                filter === f.key
                  ? "bg-app-coral text-app-surface"
                  : "bg-app-surface text-muted-foreground border border-border",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}

      {isLoading ? (
        <div className="mt-5 space-y-3" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-2xl bg-app-surface" />
          ))}
        </div>
      ) : list.length === 0 ? (
        <div className="mt-5 flex flex-col items-center gap-3 rounded-3xl bg-app-surface p-8 text-center">
          <Users className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm leading-relaxed text-muted-foreground">
            No connections yet. Scan someone's pass, or have them scan yours, to connect.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="mt-5 flex flex-col items-center gap-3 rounded-3xl bg-app-surface p-8 text-center">
          <p className="text-sm leading-relaxed text-muted-foreground">
            No connections in this category yet.
          </p>
        </div>
      ) : (
        <ul className="mt-5 space-y-3">
          {filtered.map((c: Connection) => (
            <li
              key={c.userId}
              className="flex items-center gap-3 rounded-2xl bg-app-surface p-4"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-app-coral-tint text-sm font-bold text-app-coral">
                {initials(c.name) || "PP"}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-foreground">{c.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {c.country ? `${c.country} · ` : ""}
                  Connected {timeAgo(c.connectedAt)}
                </p>
                <div className="mt-1.5">
                  <DirectionBadge direction={c.direction} />
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
