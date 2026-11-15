import { Link } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import type { Format } from "@/lib/types";

// How to make each kind of card, step by step, so anyone picking one up knows where to start and
// what "done" looks like. The house rules are in the Brand page; this is the order of work.

const LOGO = "Logos are on the shared drive: 00 - Branding, PKF Logos (Pasalo Palante for the Spanish posts). Use them exactly as they are; never redraw a logo.";
const LOOK = "Words in Montserrat, brand colours at full strength (navy, sky, orange, gold, magenta), no exclamation marks and no all caps.";
const SEND = "Add the files here, read the captions once more, and press Send for review. Edith or Rohini approves it; after that it can be scheduled.";

const STEPS: Record<Format, string[]> = {
  reel: [
    "Find the footage in Videos (Our videos, Vertical) and the Story bank. Only people who said yes; a child needs a parent's or guardian's written yes.",
    "Edit at 1080 × 1920, under 30 seconds. Give a reason to watch in the first three seconds: a real face, or a question on screen.",
    LOOK,
    `End on the call to action, Pass kindness forward, and the logo. ${LOGO}`,
    "Make a cover at 1080 × 1920 with the title on it. A video never goes out with the default frame as its cover.",
    SEND,
  ],
  video: [
    "Find the footage in Videos and the Story bank. Only people who said yes; a child needs a parent's or guardian's written yes.",
    "Edit at 1920 × 1080 for YouTube or LinkedIn, or 1080 × 1920 if it is also a reel. Open on the most human moment you have.",
    LOOK,
    `End on the call to action and the logo. ${LOGO}`,
    "Make a cover with the title on it. A video never goes out with the default frame as its cover.",
    SEND,
  ],
  image: [
    "Make it at 1080 × 1350 for the feed. If it is also a story, make a 1080 × 1920 version.",
    LOOK,
    LOGO,
    "If the card goes to Pásalo Pa'lante too, make the Spanish version as its own file.",
    SEND,
  ],
  carousel: [
    "Up to ten slides at 1080 × 1350. The first slide is the hook, the last one the call to action.",
    LOOK,
    LOGO,
    "Export each slide as its own image and add them here in order. Make the Spanish set as separate files.",
    SEND,
  ],
  story: [
    "Make it at 1080 × 1920. Keep words away from the top and bottom 250 pixels, where Instagram puts its own buttons.",
    LOOK,
    "Question, poll and link stickers are added in the Instagram app when it is posted; they cannot be scheduled.",
    SEND,
  ],
  email: [
    "Write it in the fields here: a subject under 50 characters, then one story, one act, one number and one invitation.",
    "Write the Spanish version too, in the same shape. The story needs consent on file in the Story bank.",
    "Press Send for review. Once it is approved, Dee builds it in HighLevel and sends it at the time on the card.",
  ],
};

export default function MakeGuide({ format }: { format: Format }) {
  const steps = STEPS[format] ?? STEPS.image;
  return (
    <details className="group rounded-xl border border-line">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-[14px] font-bold">
        How to make it, step by step
        <ChevronDown size={16} className="shrink-0 text-ink-faint transition group-open:rotate-180" />
      </summary>
      <ol className="space-y-2 px-4 pb-4">
        {steps.map((s, i) => (
          <li key={i} className="flex gap-3 text-[13.5px] leading-relaxed">
            <span className="mt-[1px] flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full bg-navy text-[12px] font-bold tabular-nums text-white">{i + 1}</span>
            <span>{s}</span>
          </li>
        ))}
        <li className="pl-[34px] text-[13px] text-ink-muted">
          The full house rules are on the{" "}
          <Link to="/library" className="font-semibold text-sky-ink hover:underline">
            Brand
          </Link>{" "}
          page, and footage to start from is in{" "}
          <Link to="/videos" className="font-semibold text-sky-ink hover:underline">
            Videos
          </Link>
          .
        </li>
      </ol>
    </details>
  );
}
