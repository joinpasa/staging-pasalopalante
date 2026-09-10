import { Link } from "react-router-dom";
import { ArrowLeft, Users } from "lucide-react";
import { useMyConnections } from "@/hooks/useAppData";
import { timeAgo } from "@shared/lib/appActs";

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export default function AppConnections() {
  const { data: connections, isLoading } = useMyConnections();
  const list = connections ?? [];

  return (
    <div className="px-5 pt-6">
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Home
      </Link>

      <h1 className="mt-3 font-sans text-3xl font-extrabold tracking-tight text-foreground">
        Connections
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Everyone you've connected with in person via Pass.
      </p>

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
      ) : (
        <ul className="mt-5 space-y-3 pb-4">
          {list.map((c) => (
            <li
              key={c.userId}
              className="flex items-center gap-3 rounded-2xl bg-app-surface p-4"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-app-coral-tint text-sm font-bold text-app-coral">
                {initials(c.name) || "PP"}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-foreground">{c.name}</p>
                <p className="text-xs text-muted-foreground">Connected {timeAgo(c.connectedAt)}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
