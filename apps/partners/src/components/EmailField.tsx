import { Mail } from "lucide-react";
import { useCopy } from "@/lib/i18n";

/** "Your email" on the log forms — where review updates for these acts go. */
export default function EmailField({ id, value, onChange }: { id: string; value: string; onChange: (v: string) => void }) {
  const { t } = useCopy();
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="label">
        {t.yourEmail}
      </label>
      <div className="relative flex items-center">
        <Mail className="pointer-events-none absolute start-4 h-[18px] w-[18px] text-ink-muted" aria-hidden="true" />
        <input
          id={id}
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          placeholder={t.yourEmailPlaceholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-describedby={`${id}-help`}
          className="field ps-11"
        />
      </div>
      <span id={`${id}-help`} className="text-[13px] text-ink-muted">
        {t.yourEmailHelp}
      </span>
    </div>
  );
}
