import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

/** A panel that slides up from the bottom on a phone and sits in the middle on a computer. */
export default function Sheet({ open, onClose, title, children, wide = false }: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    ref.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-navy/30 sm:items-center sm:p-6" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`flex max-h-[92vh] w-full flex-col bg-white outline-none ${wide ? "sm:max-w-[640px]" : "sm:max-w-[520px]"}`}
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <div className="h-1 shrink-0 bg-bar" aria-hidden="true" />
        <div className="flex shrink-0 items-center justify-between border-b-[1.5px] border-hair px-5 py-3.5">
          <h2 className="m-0 text-lg font-extrabold">{title}</h2>
          <button type="button" onClick={onClose} className="-me-2 flex h-9 w-9 items-center justify-center text-ink2 hover:bg-tint-sky" aria-label="Close">
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        <div className="min-h-0 overflow-y-auto px-5 py-5">{children}</div>
      </div>
    </div>
  );
}
