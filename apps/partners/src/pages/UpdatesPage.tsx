import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import Shell from "@/components/Shell";
import ThisWeek from "@/components/ThisWeek";
import { useHubCopy } from "@/lib/hubCopy";
import { useUpdates } from "@/lib/hub";

/** Every weekly update so far, newest first. */
export default function UpdatesPage() {
  const { h } = useHubCopy();
  const { data: updates, isLoading } = useUpdates();
  return (
    <Shell>
      <div className="flex flex-col gap-5">
        <div className="flex items-center gap-2">
          <Link to="/" className="-ms-2 flex h-10 w-10 items-center justify-center text-navy hover:bg-tint-sky" aria-label={h.home}>
            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
          </Link>
          <h1 className="m-0 text-xl font-extrabold">{h.pastUpdates}</h1>
        </div>
        {isLoading && <div className="h-64 animate-pulse bg-tint-sky/60" />}
        {!isLoading && !updates?.length && <p className="m-0 bg-tint-sky px-4 py-3 font-semibold text-ink2">{h.noUpdateYet}</p>}
        {(updates ?? []).map((u) => (
          <ThisWeek key={u.id} update={u} full />
        ))}
      </div>
    </Shell>
  );
}
