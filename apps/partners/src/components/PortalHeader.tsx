import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Globe } from "lucide-react";
import { useCopy } from "@/lib/i18n";
import { useHubCopy } from "@/lib/hubCopy";

/**
 * The light top bar for full-screen tasks (log many acts, invite your team, done), the way a social
 * app opens a task over the feed: back on the left, the logo, the language on the right.
 */
export default function PortalHeader({ minimal = false }: { minimal?: boolean }) {
  const { toggle } = useCopy();
  const { h } = useHubCopy();
  const navigate = useNavigate();
  return (
    <header className="sticky top-0 z-30 border-b-[1.5px] border-hair bg-white/95 backdrop-blur">
      <div className="h-1 bg-bar" aria-hidden="true" />
      <div className="mx-auto flex h-14 max-w-[1100px] items-center justify-between gap-3 px-4 lg:px-8">
        {minimal ? (
          <span className="w-10" />
        ) : (
          <button type="button" onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/me"))} className="-ms-2 flex h-10 w-10 items-center justify-center text-navy hover:bg-tint-sky" aria-label={h.me}>
            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
          </button>
        )}
        <Link to="/" className="no-underline" aria-label={h.home}>
          <img src="/kf-logo.webp" alt="Kindness Forward" className="h-8 w-auto" />
        </Link>
        <button type="button" onClick={toggle} className="flex h-10 items-center gap-1.5 px-2 text-[13px] font-bold text-ink2" aria-label={h.language}>
          <Globe className="h-4 w-4 text-sky" aria-hidden="true" />
          {h.language === "Español" ? "ES" : "EN"}
        </button>
      </div>
    </header>
  );
}
