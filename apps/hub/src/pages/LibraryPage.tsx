import { Ban, Check, Download, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { PageHead } from "@/components/bits";
import { WORDING_RULES } from "@/lib/checks";
import { asset } from "@/lib/base";

const COLOURS = [
  { name: "Navy", hex: "#0e234b" },
  { name: "Sky", hex: "#00a3e0" },
  { name: "Orange", hex: "#f37023" },
  { name: "Gold", hex: "#fdb813" },
  { name: "Magenta", hex: "#d81b60" },
];

const NAMES = [
  { name: "Kindness Forward", use: "The brand" },
  { name: "Pass Kindness Forward", use: "The call to action" },
  { name: "Global Kindness Season", use: "The annual activation, 1 November to 31 January" },
  { name: "Pásalo Pa'lante", use: "The Puerto Rico identity" },
];

const SAY = [
  { say: "More than 1.1 million pledges, recognised by Official World Record", not: "1.1 million acts, Guinness, broke the record" },
  { say: "Latin Grammy (for Sie7e)", not: "Grammy" },
  { say: "195 countries invited", not: "195 countries participating" },
  { say: "#PassKindnessForward", not: "Other spellings of the hashtag" },
];

const VIDEO = ["A reason to watch in the opening frame", "One hook, one story, one call to action", "Real human moments over animation", "Inclusive of all partners", "A designed cover on every video", "AI behind the scenes, real people on screen, consent on file"];

const H2 = "text-[18px] font-extrabold tracking-[-0.02em]";

/** The brand in one place, so nobody has to go looking for it. */
export default function LibraryPage() {
  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${text} copied`);
    } catch {
      toast(text);
    }
  };

  return (
    <>
      <PageHead title="Brand library" sub="Colours, type, logos and the words we use. The checks on every card come from this page." />

      <section>
        <h2 className={H2}>Colours</h2>
        <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
          {COLOURS.map((c) => (
            <li key={c.hex}>
              <button type="button" onClick={() => copy(c.hex)} title="Copy the colour code" className="group block w-full text-left">
                <span className="block h-20 rounded-xl transition group-hover:opacity-90" style={{ background: c.hex }} />
                <span className="mt-2 block text-[13.5px] font-bold">{c.name}</span>
                <span className="block text-[12.5px] tabular-nums text-ink-muted">{c.hex}</span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-12 grid gap-x-14 gap-y-12 lg:grid-cols-2">
        <section>
          <h2 className={H2}>Type</h2>
          <p className="mt-4 text-[48px] font-extrabold leading-none tracking-[-0.035em]">Montserrat</p>
          <p className="mt-4 text-[14.5px] leading-relaxed text-ink-muted">Montserrat only, in every weight. Sentence case, no all caps and no exclamation marks.</p>
          <p className="mt-4 flex flex-wrap gap-x-6 gap-y-1 border-t border-line pt-4 text-[18px]">
            <span className="font-normal">Regular</span>
            <span className="font-semibold">Semibold</span>
            <span className="font-bold">Bold</span>
            <span className="font-extrabold">Extrabold</span>
          </p>
        </section>

        <section>
          <h2 className={H2}>Logos</h2>
          <div className="mt-4 grid grid-cols-2 gap-4">
            {[
              { src: asset("kf-logo.webp"), label: "Kindness Forward, for light backgrounds" },
              { src: asset("kf-heart.webp"), label: "Heart mark, for small sizes" },
            ].map((l) => (
              <a key={l.src} href={l.src} download className="group block">
                <span className="flex h-32 items-center justify-center rounded-xl border border-line p-6 transition group-hover:border-navy/40">
                  <img src={l.src} alt="" className="max-h-full max-w-full" />
                </span>
                <span className="mt-2 flex items-start gap-1.5 text-[13px] font-semibold leading-snug">
                  <Download size={14} className="mt-0.5 shrink-0 text-ink-faint" /> {l.label}
                </span>
              </a>
            ))}
          </div>
          <p className="mt-4 text-[13.5px] leading-relaxed text-ink-muted">Use the official artwork exactly as it is. Never ask an AI tool to redraw it.</p>
        </section>

        <section>
          <h2 className={H2}>Names</h2>
          <ul className="mt-3 border-t border-line">
            {NAMES.map((n) => (
              <li key={n.name} className="flex items-baseline justify-between gap-4 border-b border-line py-3">
                <span className="text-[15px] font-bold">{n.name}</span>
                <span className="text-right text-[13px] text-ink-muted">{n.use}</span>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className={H2}>Words we use</h2>
          <ul className="mt-3 border-t border-line">
            {SAY.map((s) => (
              <li key={s.say} className="border-b border-line py-3">
                <p className="flex items-start gap-2 text-[14.5px] font-semibold leading-snug">
                  <Check size={16} strokeWidth={2.6} className="mt-0.5 shrink-0 text-[#2f9e6e]" /> {s.say}
                </p>
                <p className="mt-1 flex items-start gap-2 text-[13.5px] leading-snug text-ink-muted">
                  <Ban size={14} className="mt-0.5 shrink-0 text-rose" /> {s.not}
                </p>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className={H2}>For video</h2>
          <ul className="mt-4 space-y-2.5">
            {VIDEO.map((v) => (
              <li key={v} className="flex items-start gap-2 text-[14.5px] leading-snug">
                <Check size={16} strokeWidth={2.6} className="mt-0.5 shrink-0 text-[#2f9e6e]" /> {v}
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className={H2}>What the hub checks in every caption</h2>
          <p className="mt-1 text-[13.5px] text-ink-muted">Red stops a post from going out. Amber asks for a second look.</p>
          <ul className="mt-4 space-y-3">
            {WORDING_RULES.map((r) => (
              <li key={r.id} className="flex items-start gap-2">
                {r.level === "block" ? <Ban size={15} className="mt-0.5 shrink-0 text-rose" /> : <TriangleAlert size={15} className="mt-0.5 shrink-0 text-orange" />}
                <div>
                  <p className="text-[14px] font-semibold leading-snug">{r.title}</p>
                  <p className="text-[13px] leading-snug text-ink-muted">{r.detail}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}
