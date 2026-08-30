import { Heart } from "lucide-react";
import { cn } from "@shared/lib/utils";

/** Single-tap heart reaction with an optimistic count, used on both AppWall
 *  and AppHome. `onToggle` is expected to update state instantly and let the
 *  network call happen in the background — see useActReactions. */
export default function ReactionButton({
  count,
  reacted,
  onToggle,
  className,
}: {
  count: number;
  reacted: boolean;
  onToggle: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      aria-pressed={reacted}
      aria-label={reacted ? "Remove heart" : "Send a heart"}
      className={cn(
        "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
        reacted ? "bg-app-coral text-app-surface" : "bg-app-coral-tint text-app-coral",
        className,
      )}
    >
      <Heart className={cn("h-3.5 w-3.5", reacted && "fill-current")} />
      {count > 0 ? count : ""}
    </button>
  );
}
