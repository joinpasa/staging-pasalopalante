import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Camera, MessageSquareQuote, PartyPopper, Video } from "lucide-react";
import Shell from "@/components/Shell";
import Composer from "@/components/Composer";
import { useHubCopy } from "@/lib/hubCopy";
import { useUpdates } from "@/lib/hub";

type StoryKind = "post" | "testimonial" | "video";

/** "Send us your story": photos, videos and testimonials for Kindness Forward to feature. */
export default function StoryPage() {
  const { h, lang } = useHubCopy();
  const { data: updates } = useUpdates();
  const [kind, setKind] = useState<StoryKind>("post");
  const [sent, setSent] = useState(false);
  const ask = updates?.[0]?.items?.find((i) => i.kind === "ask");
  const prompt = (ask && ((lang === "es" && ask.textEs) || ask.text)) || h.storyPrompt;

  const kinds: { id: StoryKind; label: string; icon: typeof Camera }[] = [
    { id: "post", label: h.storyKinds.post, icon: Camera },
    { id: "testimonial", label: h.storyKinds.testimonial, icon: MessageSquareQuote },
    { id: "video", label: h.storyKinds.video, icon: Video },
  ];

  if (sent)
    return (
      <Shell>
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <span className="flex h-16 w-16 items-center justify-center bg-tint-pink text-magenta">
            <PartyPopper className="h-8 w-8" aria-hidden="true" />
          </span>
          <h1 className="m-0 text-2xl font-extrabold">{h.thanksTitle}</h1>
          <p className="m-0 text-[15px] font-medium text-ink-muted">{h.thanksBody}</p>
          <Link to="/" className="btn-orange mt-2 h-11">
            {h.backHome}
          </Link>
        </div>
      </Shell>
    );

  return (
    <Shell>
      <div className="flex flex-col gap-5">
        <div className="flex items-start gap-2">
          <Link to="/" className="-ms-2 flex h-10 w-10 shrink-0 items-center justify-center text-navy hover:bg-tint-sky" aria-label={h.home}>
            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
          </Link>
          <div>
            <h1 className="m-0 text-xl font-extrabold">{h.storyTitle}</h1>
            <p className="m-0 text-[14px] font-medium text-ink-muted">{h.storySub}</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2" role="radiogroup">
          {kinds.map((k) => (
            <button
              key={k.id}
              type="button"
              role="radio"
              aria-checked={kind === k.id}
              onClick={() => setKind(k.id)}
              className={`flex flex-col items-center gap-1.5 px-2 py-3 text-[13px] font-extrabold ${kind === k.id ? "bg-tint-pink text-navy outline outline-2 outline-magenta" : "border-[1.5px] border-hair text-ink2"}`}
            >
              <k.icon className={`h-5 w-5 ${kind === k.id ? "text-magenta" : "text-ink-faint"}`} aria-hidden="true" />
              {k.label}
            </button>
          ))}
        </div>

        <p className="m-0 border-s-4 border-gold bg-tint-gold px-3 py-2.5 text-[15px] font-bold text-navy">{prompt}</p>

        <Composer key={kind} audience="team" postKind={kind} placeholder={h.storyPlaceholder} allowAlsoCommunity onDone={() => setSent(true)} />
      </div>
    </Shell>
  );
}
