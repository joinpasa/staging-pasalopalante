import { Link, Navigate, useLocation } from "react-router-dom";
import { Clock } from "lucide-react";
import PortalHeader from "@/components/PortalHeader";
import { useCopy } from "@/lib/i18n";
import type { SubmitResult } from "@/lib/submissions";

export default function SuccessPage() {
  const { t, locale } = useCopy();
  const result = useLocation().state as SubmitResult | null;
  if (!result) return <Navigate to="/" replace />;

  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <PortalHeader minimal />
      <main className="flex flex-1 items-center justify-center px-4 py-8 lg:p-12">
        <section className="flex w-full max-w-[640px] flex-col items-center gap-5 rounded-[32px] bg-white px-6 py-10 text-center shadow-[0_12px_40px_rgba(14,35,75,0.10)] lg:gap-[22px] lg:px-16 lg:py-14">
          <div className="relative flex h-[168px] w-[168px] items-center justify-center" aria-hidden="true">
            <div className="absolute inset-0 rounded-full bg-sun-soft" />
            <div className="absolute inset-[22px] rounded-full bg-white shadow-[0_8px_24px_rgba(14,35,75,0.10)]" />
            <span className="absolute end-[18px] top-1.5 h-3.5 w-3.5 rounded-full bg-sun" />
            <span className="absolute bottom-[18px] start-1 h-2.5 w-2.5 rounded-full bg-sky" />
            <span className="absolute start-0 top-10 h-2 w-2 rounded-full bg-orange" />
            <span className="absolute bottom-1 end-[34px] h-2 w-2 rounded-full bg-rose" />
            <img src="/logo-PKF-icon.png" srcSet="/logo-PKF-icon.png 1x, /logo-PKF-icon@2x.png 2x" alt="" className="relative w-[84px]" />
          </div>
          <div className="flex flex-col gap-2.5">
            <h1 className="m-0 text-[32px] font-extrabold lg:text-[40px]">
              {result.resubmitted ? t.resubmittedTitle : t.thankYou}
            </h1>
            <p className="m-0 text-lg font-semibold leading-snug lg:text-xl">
              {result.resubmitted ? t.resubmittedBody : t.onTheirWay}
            </p>
          </div>
          {!result.resubmitted && (
            <span className="rounded-full bg-sky-soft px-4 py-2 text-sm font-bold text-sky-ink">
              {t.summary(result.activities, result.acts.toLocaleString(locale))}
            </span>
          )}
          <div className="flex items-center gap-2.5 rounded-[14px] bg-canvas px-[18px] py-3.5 text-start text-[15px] text-ink-muted">
            <Clock className="h-5 w-5 shrink-0 text-sky" aria-hidden="true" />
            <span>{t.reviewNote}</span>
          </div>
          <div className="mt-2 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <Link to="/log" className="btn-primary no-underline">
              {t.logMore}
            </Link>
            <Link to="/" className="btn-secondary no-underline">
              {t.backDash}
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
