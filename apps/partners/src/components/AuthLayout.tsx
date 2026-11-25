import type { ReactNode } from "react";
import { Globe } from "lucide-react";
import { useCopy } from "@/lib/i18n";

interface Props {
  /** Small line above the headline (the season). */
  chip: string;
  headline: string;
  body: string;
  children: ReactNode;
}

function LangToggle({ className = "" }: { className?: string }) {
  const { t, toggle } = useCopy();
  return (
    <button type="button" onClick={toggle} className={`inline-flex h-10 items-center gap-1.5 bg-white px-3 text-sm font-bold text-navy hover:bg-tint-sky ${className}`}>
      <Globe className="h-4 w-4 text-sky" aria-hidden="true" />
      {t.language}
    </button>
  );
}

/** Sign-in and join screens in the Partners Hub look: a sunny sky beside (or above) the form. */
export default function AuthLayout({ chip, headline, body, children }: Props) {
  return (
    <div className="flex min-h-screen flex-col bg-white text-ink lg:flex-row">
      <aside className="relative flex shrink-0 flex-col justify-between gap-6 bg-[#8fd3f2] bg-[url('/hub/sky.jpg')] bg-cover bg-[center_35%] px-5 pb-6 pt-5 lg:w-[46%] lg:max-w-[640px] lg:px-14 lg:py-12">
        <div className="flex items-start justify-between gap-3">
          <span className="bg-white px-3.5 py-2.5">
            <img src="/kf-logo.webp" alt="Kindness Forward" width={164} height={48} className="h-9 w-auto lg:h-11" />
          </span>
          <LangToggle />
        </div>
        <div className="flex flex-col items-start gap-2.5 lg:gap-3">
          <span className="bg-white/90 px-2 py-1 text-[12.5px] font-bold text-ink2">{chip}</span>
          <h2 className="m-0">
            <span className="box bg-magenta text-[26px] text-white lg:text-[40px]">{headline}</span>
          </h2>
          <p className="m-0 hidden max-w-[460px] bg-white px-3 py-2 text-[15px] font-semibold leading-snug text-navy sm:block lg:text-[17px]">{body}</p>
        </div>
        <div className="absolute inset-x-0 bottom-0 h-2 bg-bar" aria-hidden="true" />
      </aside>

      <main className="flex flex-1 flex-col items-center px-5 pb-8 pt-8 lg:justify-center lg:p-12">
        <div className="flex w-full max-w-[440px] flex-col gap-6">{children}</div>
      </main>
    </div>
  );
}
