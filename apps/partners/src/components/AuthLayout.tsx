import type { ReactNode } from "react";
import { useCopy } from "@/lib/i18n";

interface Props {
  /** Desktop navy panel: chip text, headline, body. */
  chip: string;
  headline: string;
  body: string;
  children: ReactNode;
}

function LangToggle({ className = "" }: { className?: string }) {
  const { t, toggle } = useCopy();
  return (
    <button
      type="button"
      onClick={toggle}
      className={`h-11 rounded-full border-2 border-orange px-5 text-sm font-bold transition hover:bg-orange hover:text-white ${className}`}
    >
      {t.language}
    </button>
  );
}

const STRIPES = ["bg-sky", "bg-orange", "bg-sun", "bg-rose"];

/** Login / Create account frame: navy story panel on desktop, stacked lockup on mobile. */
export default function AuthLayout({ chip, headline, body, children }: Props) {
  const { t } = useCopy();
  return (
    <div className="flex min-h-screen bg-canvas text-ink">
      <aside className="hidden w-[600px] shrink-0 flex-col gap-10 bg-navy px-16 py-14 text-white lg:flex">
        <div className="flex items-center gap-[18px]">
          <span className="text-xl font-bold tracking-[0.02em]">{t.partners}</span>
          <span className="text-2xl font-medium text-sky">×</span>
          <img src="/kf-logo-on-dark.webp" alt="Kindness Forward" width={197} height={64} className="h-16 w-auto" />
          <LangToggle className="ms-auto text-white" />
        </div>
        <div className="mt-auto flex flex-col gap-5">
          <span className="self-start rounded-full bg-sun px-3.5 py-2 text-[13px] font-bold text-navy">{chip}</span>
          <h2 className="m-0 text-[44px] font-extrabold leading-[1.15]">{headline}</h2>
          <p className="m-0 text-[17px] leading-relaxed text-ink-onnavy">{body}</p>
        </div>
        <div className="flex gap-2.5" aria-hidden="true">
          {STRIPES.map((c) => (
            <span key={c} className={`h-1.5 w-10 rounded-full ${c}`} />
          ))}
        </div>
      </aside>

      <main className="flex flex-1 flex-col items-center px-5 pb-6 pt-10 lg:justify-center lg:p-12">
        <div className="flex w-full max-w-[460px] flex-1 flex-col gap-6 lg:flex-none lg:gap-7">
          <div className="flex items-center justify-center gap-3.5 lg:hidden">
            <span className="text-[17px] font-bold tracking-[0.02em]">{t.partners}</span>
            <span className="text-xl font-medium text-sky">×</span>
            <img src="/kf-logo.webp" alt="Kindness Forward" width={172} height={56} className="h-14 w-auto" />
          </div>
          {children}
          <div className="mt-auto flex flex-col items-center gap-2 pt-2 lg:hidden">
            <LangToggle className="text-navy" />
            <span className="inline-flex items-center gap-2 rounded-full bg-sun-soft px-3.5 py-2 text-xs font-semibold text-sun-ink">
              <span className="h-2 w-2 rounded-full bg-sun" />
              {t.seasonChip}
            </span>
          </div>
        </div>
      </main>
    </div>
  );
}
