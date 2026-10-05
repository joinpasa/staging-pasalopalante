import { Link } from "react-router-dom";
import { useLanguage } from "@shared/contexts/LanguageContext";

/**
 * Signed-out prompt shown on the personal app screens: everyone can browse the
 * public wall, but your own kindness lives behind an account.
 */
export default function JoinGate({
  title,
  body,
}: {
  title?: string;
  body?: string;
}) {
  const { t } = useLanguage();
  return (
    <section className="rounded-3xl bg-app-ink p-6 text-app-surface">
      <h2 className="font-sans text-lg font-bold leading-snug">{title ?? t.appWidgets.joinGateTitle}</h2>
      <p className="mt-2 text-sm leading-relaxed text-app-surface/75">{body ?? t.appWidgets.joinGateBody}</p>
      <div className="mt-4 flex items-center gap-3">
        <Link
          to="/join"
          className="flex h-12 flex-1 items-center justify-center rounded-2xl bg-app-coral font-semibold text-app-surface"
        >
          {t.appWidgets.joinTheChain}
        </Link>
        <Link
          to="/join"
          className="flex h-12 items-center justify-center rounded-2xl border border-app-surface/25 px-4 text-sm font-semibold text-app-surface"
        >
          {t.appWidgets.logIn}
        </Link>
      </div>
    </section>
  );
}
