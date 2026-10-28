import { useRef, useState, type ReactNode } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@shared/components/ui/popover";
import { badgeRuleParts } from "@shared/lib/badges";
import { cn } from "@shared/lib/utils";

interface Props {
  /** The badge's rule (its description). */
  text: string;
  children: ReactNode;
  className?: string;
}

/**
 * Wraps a badge so its rule shows in a small bubble: on hover with a mouse,
 * on tap on touch screens (and in the app). Tapping again or anywhere else
 * closes it. Quoted words in the rule show in bold, without the quote marks.
 */
export default function BadgeHint({ text, children, className }: Props) {
  const [open, setOpen] = useState(false);
  const pointer = useRef<string>("mouse");

  if (!text) return <div className={className}>{children}</div>;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={className}
          onPointerDown={(e) => { pointer.current = e.pointerType; }}
          onPointerEnter={(e) => { if (e.pointerType === "mouse") setOpen(true); }}
          onPointerLeave={(e) => { if (e.pointerType === "mouse") setOpen(false); }}
          // With a mouse, hover already shows it — a click shouldn't toggle
          // it closed again. preventDefault skips Radix's own toggle.
          onClick={(e) => { if (pointer.current === "mouse") e.preventDefault(); }}
        >
          {children}
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        collisionPadding={12}
        className={cn("w-auto max-w-[240px] px-3 py-2 text-center text-xs leading-snug")}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        {badgeRuleParts(text).map((part, i) =>
          part.bold ? <strong key={i}>{part.text}</strong> : <span key={i}>{part.text}</span>,
        )}
      </PopoverContent>
    </Popover>
  );
}
