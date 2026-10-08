import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { useCopy } from "@/lib/i18n";
import type { Submission } from "@/lib/submissions";
import DeleteActDialog from "./DeleteActDialog";

/**
 * The ⋯ button at the end of an act row. Shows on hover/focus on desktop and
 * is always visible on touch screens (no hover there).
 */
export default function ActMenu({ act, tourTarget }: { act: Submission; tourTarget?: boolean }) {
  const { t } = useCopy();
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        data-tour={tourTarget ? "act-menu" : undefined}
        aria-label={t.actOptions}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={`flex h-10 w-10 items-center justify-center rounded-xl text-ink-muted transition hover:bg-canvas hover:text-navy focus-visible:opacity-100 md:opacity-0 md:group-hover:opacity-100 ${
          open || tourTarget ? "md:opacity-100" : ""
        }`}
      >
        <MoreHorizontal className="h-5 w-5" />
      </button>
      {open && (
        <div role="menu" className="absolute end-0 top-11 z-20 w-52 rounded-2xl border border-line-soft bg-white p-1.5 shadow-card">
          {act.status === "changes_requested" && (
            <Link
              role="menuitem"
              to={`/edit/${act.id}`}
              className="flex h-11 w-full items-center gap-2.5 rounded-xl px-3 text-sm font-semibold text-ink no-underline hover:bg-canvas"
            >
              <Pencil className="h-4 w-4 text-sky" />
              {t.editAct}
            </Link>
          )}
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              setConfirming(true);
            }}
            className="flex h-11 w-full items-center gap-2.5 rounded-xl px-3 text-start text-sm font-semibold text-rose-ink hover:bg-rose-soft"
          >
            <Trash2 className="h-4 w-4" />
            {t.deleteAct}
          </button>
        </div>
      )}
      <DeleteActDialog act={confirming ? act : null} onClose={() => setConfirming(false)} />
    </div>
  );
}
