import { useState } from "react";
import { Baby, CircleCheck, CircleDashed, Clock, Play, Quote } from "lucide-react";
import { cx } from "./bits";
import { CONSENT, consentOk } from "@/lib/stories";
import type { Consent, Story } from "@/lib/types";

/** Consent, said the same way everywhere: an icon and plain words, never colour alone. */
export function ConsentLine({ consent, minors, className }: { consent: Consent; minors?: boolean; className?: string }) {
  const ok = consentOk(consent, minors);
  const Icon = ok ? CircleCheck : consent === "asked" ? Clock : CircleDashed;
  return (
    <span className={cx("inline-flex items-center gap-1.5 text-[12.5px] font-medium", ok ? "text-ink-muted" : minors ? "text-rose-ink" : "text-orange-ink", className)}>
      <Icon size={14} className={cx("shrink-0", ok && "text-[#2f9e6e]")} />
      {minors && !ok ? "Child shown. Needs a written yes" : CONSENT[consent].label}
    </span>
  );
}

/** The picture that stands for a story. Words get a quiet card of their own. */
export function StoryPicture({ story, className }: { story: Story; className?: string }) {
  const [broken, setBroken] = useState(false);
  const src = story.kind === "clip" ? story.poster : story.url;
  if (story.kind === "words" || !src || broken)
    return (
      <div className={cx("flex flex-col justify-between bg-paper p-4", className)}>
        <Quote size={18} className="text-sun" strokeWidth={2.4} />
        <p className="line-clamp-5 text-[14px] font-semibold leading-snug">{story.words || story.title}</p>
      </div>
    );
  return (
    <div className={cx("relative bg-paper", className)}>
      <img src={src} alt="" loading="lazy" onError={() => setBroken(true)} className="h-full w-full object-cover" />
      {story.kind === "clip" && (
        <span className="absolute bottom-2 left-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-navy/85 text-white">
          <Play size={13} fill="currentColor" />
        </span>
      )}
    </div>
  );
}

export default function StoryTile({ story, used, onOpen }: { story: Story; used?: number; onOpen: () => void }) {
  return (
    <button type="button" onClick={onOpen} className="group block w-full overflow-hidden rounded-xl border border-line bg-white text-left transition hover:border-navy/40">
      <StoryPicture story={story} className="aspect-[4/3] w-full border-b border-line" />
      <div className="p-3">
        <p className="truncate text-[14px] font-semibold">{story.title || "Untitled"}</p>
        <p className="mt-0.5 truncate text-[12.5px] text-ink-muted">{[story.people, story.country].filter(Boolean).join(" · ") || "Who is in it is not recorded yet"}</p>
        <div className="mt-2.5 flex items-center justify-between gap-2">
          <ConsentLine consent={story.consent} minors={story.minors} className="min-w-0 truncate" />
          {story.minors && consentOk(story.consent, true) && <Baby size={14} className="shrink-0 text-ink-faint" aria-label="A child is in this" />}
        </div>
        {used !== undefined && <p className="mt-1.5 text-[12px] text-ink-faint">{used === 0 ? "Not used yet" : `Used in ${used} post${used === 1 ? "" : "s"}`}</p>}
      </div>
    </button>
  );
}
