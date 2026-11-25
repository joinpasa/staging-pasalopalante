import { useState } from "react";
import { Link } from "react-router-dom";
import { Check, X } from "lucide-react";
import { useHubCopy } from "@/lib/hubCopy";
import type { Me } from "@/lib/hub";

const KEY = "pkf-hub-welcome-hidden";

/** Three first steps for a new member, ticked off as they go. Hides itself once done or dismissed. */
export default function Welcome({ me, posted, onPost }: { me: Me; posted: boolean; onPost: () => void }) {
  const { h } = useHubCopy();
  const [hidden, setHidden] = useState(() => {
    try {
      return localStorage.getItem(`${KEY}-${me.id}`) === "1";
    } catch {
      return false;
    }
  });
  const kitSeen = (() => {
    try {
      return localStorage.getItem(`pkf-hub-kit-seen-${me.id}`) === "1";
    } catch {
      return false;
    }
  })();
  const steps = [
    { done: !!me.logoUrl && !!me.country, label: me.kind === "ambassador" ? h.addPhoto : h.stepLogo, to: "/me/edit" },
    { done: kitSeen, label: h.stepKit, to: "/kit" },
    { done: posted, label: h.stepPost, onClick: onPost },
  ];
  if (hidden || steps.every((s) => s.done)) return null;
  const hide = () => {
    setHidden(true);
    try {
      localStorage.setItem(`${KEY}-${me.id}`, "1");
    } catch {
      /* fine */
    }
  };
  return (
    <section className="relative bg-tint-sky px-4 py-4">
      <button type="button" onClick={hide} className="absolute end-2 top-2 flex h-8 w-8 items-center justify-center text-ink-faint hover:text-navy" aria-label={h.dismiss}>
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
      <h2 className="m-0 pe-8 text-[16px] font-extrabold">{h.welcomeTitle}</h2>
      <ol className="m-0 mt-3 flex list-none flex-col gap-2 p-0">
        {steps.map((s, i) => {
          const inner = (
            <>
              <span className={`flex h-7 w-7 shrink-0 items-center justify-center text-[13px] font-extrabold ${s.done ? "bg-sky text-white" : "border-2 border-sky bg-white text-sky"}`}>
                {s.done ? <Check className="h-4 w-4" aria-hidden="true" /> : i + 1}
              </span>
              <span className={`text-[15px] font-bold ${s.done ? "text-ink-faint line-through" : "text-navy"}`}>{s.label}</span>
            </>
          );
          return (
            <li key={s.label}>
              {s.to ? (
                <Link to={s.to} className="flex items-center gap-3 no-underline">
                  {inner}
                </Link>
              ) : (
                <button type="button" onClick={s.onClick} className="flex items-center gap-3">
                  {inner}
                </button>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
