import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * A row that slides sideways (26 Nov 2026). On a phone it's swiped with a finger, as before. On a
 * computer a hidden scrollbar meant the row couldn't be moved at all, so arrows appear at either
 * end whenever there's more to see, and only on devices with a mouse or trackpad.
 */
export default function ScrollRow({
  children,
  className = "",
  rowClassName = "",
  label,
  rowStyle,
  arrowTop = "50%",
  onScroll,
}: {
  children: ReactNode;
  /** classes for the outer box */
  className?: string;
  /** classes for the sliding row itself (gap, padding, snap, grid on wide screens...) */
  rowClassName?: string;
  rowStyle?: CSSProperties;
  label?: string;
  /** where the arrows sit, from the top of the row */
  arrowTop?: string;
  onScroll?: (el: HTMLDivElement) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: false, end: false });

  const measure = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const rtl = getComputedStyle(el).direction === "rtl";
    const left = Math.abs(el.scrollLeft);
    const max = el.scrollWidth - el.clientWidth;
    const atStart = left <= 2;
    const atEnd = left >= max - 2;
    setEdges(rtl ? { start: !atEnd && max > 2, end: !atStart && max > 2 } : { start: !atStart && max > 2, end: !atEnd && max > 2 });
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    for (const child of Array.from(el.children)) ro.observe(child);
    return () => ro.disconnect();
  }, [measure, children]);

  const go = (dir: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    const rtl = getComputedStyle(el).direction === "rtl";
    el.scrollBy({ left: dir * (rtl ? -1 : 1) * Math.max(160, el.clientWidth * 0.8), behavior: "smooth" });
  };

  const arrow = "absolute z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center border-[1.5px] border-hair bg-white text-navy shadow-[0_4px_14px_rgba(14,35,75,0.16)] hover:border-sky hover:text-sky";
  return (
    <div className={`relative ${className}`} role={label ? "region" : undefined} aria-label={label}>
      <div
        ref={ref}
        onScroll={(e) => {
          measure();
          onScroll?.(e.currentTarget);
        }}
        className={`flex overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${rowClassName}`}
        style={rowStyle}
      >
        {children}
      </div>
      {edges.start && (
        <button type="button" onClick={() => go(-1)} className={`${arrow} start-1 [@media(pointer:fine)]:flex`} style={{ top: arrowTop }} aria-label="Previous">
          <ChevronLeft className="h-5 w-5 rtl:rotate-180" aria-hidden="true" />
        </button>
      )}
      {edges.end && (
        <button type="button" onClick={() => go(1)} className={`${arrow} end-1 [@media(pointer:fine)]:flex`} style={{ top: arrowTop }} aria-label="Next">
          <ChevronRight className="h-5 w-5 rtl:rotate-180" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
