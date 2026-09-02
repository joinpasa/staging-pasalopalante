import { ReactNode } from "react";
import { Button } from "@shared/components/ui/button";

export interface ShareOption {
  key: string;
  label: string;
  icon: ReactNode;
  onClick: () => Promise<void> | void;
  accent?: boolean;
}

/** The grid of share-destination buttons — shared by ShareDialog (a popup,
 *  still used where a page wants that pattern) and any page that wants the
 *  same buttons rendered directly inline instead. */
export default function ShareOptionsGrid({
  options,
  busy,
}: {
  options: ShareOption[];
  busy: string | null;
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
      {options.map((o) => (
        <Button
          key={o.key}
          type="button"
          variant={o.accent ? "default" : "outline"}
          disabled={busy === o.key}
          onClick={() => o.onClick()}
          className="justify-start gap-2 h-11"
        >
          <span className="shrink-0">{o.icon}</span>
          <span className="truncate text-xs sm:text-sm">{o.label}</span>
        </Button>
      ))}
    </div>
  );
}
