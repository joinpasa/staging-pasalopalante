import { useCopy } from "@/lib/i18n";
import type { SubmissionStatus } from "@/lib/submissions";

const STYLES: Record<SubmissionStatus, { pill: string; dot: string }> = {
  pending: { pill: "bg-sun-soft text-sun-ink", dot: "bg-sun" },
  approved: { pill: "bg-sky-soft text-sky-ink", dot: "bg-sky" },
  changes_requested: { pill: "bg-rose-soft text-rose-ink", dot: "bg-rose" },
  rejected: { pill: "bg-sand text-ink-muted", dot: "bg-ink-faint" },
};

export default function StatusPill({ status }: { status: SubmissionStatus }) {
  const { t } = useCopy();
  const label = {
    pending: t.pending,
    approved: t.approved,
    changes_requested: t.changes,
    rejected: t.rejected,
  }[status];
  const s = STYLES[status] ?? STYLES.pending;
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-[13px] font-bold ${s.pill}`}
    >
      <span className={`h-2 w-2 rounded-full ${s.dot}`} />
      {label}
    </span>
  );
}
