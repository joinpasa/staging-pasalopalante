import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, Heart, ImagePlus, MessageSquareHeart, PenLine } from "lucide-react";
import { useHubCopy } from "@/lib/hubCopy";
import Sheet from "./Sheet";
import Composer from "./Composer";
import { useShareMedia } from "./ShareMedia";

/**
 * The big +: photos or videos (first, since that's what people look for), write a post, log an
 * act, or send us a story. Four choices, nothing else.
 */
export default function CreateSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { h } = useHubCopy();
  const navigate = useNavigate();
  const media = useShareMedia();
  const [composing, setComposing] = useState(false);

  const choices = [
    // the file picker opens inside this click, so the browser allows it
    ...(media ? [{ icon: ImagePlus, title: h.mediaShort, sub: h.mediaShortSub, tint: "bg-sky text-white", go: () => (media.pick(), onClose()) }] : []),
    { icon: PenLine, title: h.makePost, sub: h.makePostSub, tint: "bg-tint-sky text-sky", go: () => setComposing(true) },
    { icon: Heart, title: h.logAct, sub: h.logActSub, tint: "bg-tint-orange text-orange", go: () => (onClose(), navigate("/log")) },
    { icon: MessageSquareHeart, title: h.sendUs, sub: h.sendUsSub, tint: "bg-tint-pink text-magenta", go: () => (onClose(), navigate("/story")) },
  ];

  if (composing && open)
    return (
      <Sheet open title={h.newPost} onClose={() => (setComposing(false), onClose())} wide>
        <Composer onDone={() => (setComposing(false), onClose(), navigate("/"))} />
      </Sheet>
    );

  return (
    <Sheet open={open} onClose={onClose} title={h.createTitle}>
      <div className="flex flex-col">
        {choices.map((c) => (
          <button key={c.title} type="button" onClick={c.go} className="flex items-center gap-4 border-b-[1.5px] border-hair py-4 text-start last:border-b-0 hover:bg-tint-sky/40">
            <span className={`flex h-12 w-12 shrink-0 items-center justify-center ${c.tint}`}>
              <c.icon className="h-6 w-6" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-base font-extrabold text-navy">{c.title}</span>
              <span className="block text-sm font-medium text-ink-muted">{c.sub}</span>
            </span>
            <ChevronRight className="h-5 w-5 text-ink-faint" aria-hidden="true" />
          </button>
        ))}
      </div>
    </Sheet>
  );
}
