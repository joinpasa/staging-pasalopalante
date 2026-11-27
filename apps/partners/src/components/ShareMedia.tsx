import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { ImagePlus, Info, Megaphone, PartyPopper, Send } from "lucide-react";
import { useHubCopy } from "@/lib/hubCopy";
import { ACCEPT_ATTR, mediaTypeOf } from "@/lib/upload";
import Sheet from "./Sheet";
import Composer from "./Composer";

/**
 * Photos and videos, straight away (27 Nov 2026). A tester said it took a while to find where
 * pictures and videos go, so any "Add photos or videos" button opens the file picker at once (or
 * takes files dropped on it), and the chosen files land in a ready post. One choice on top: post
 * it for every member, or send it only to Kindness Forward for our socials.
 *
 * 28 Nov 2026, the same tester: it's "Share your moments" now, and a click first opens a short
 * pop-up saying what happens to the pictures (and that we may use them on our socials), with one
 * big button that opens the picker. Files dropped on a button skip the pop-up; the consent boxes
 * in the post still say the same.
 */

interface ShareMediaApi {
  /** Open the "Share your moments" pop-up, whose button opens the file picker. */
  pick: () => void;
  /** Share files someone dropped on a button. */
  share: (files: FileList | File[]) => void;
}

const Ctx = createContext<ShareMediaApi | null>(null);

export function useShareMedia() {
  return useContext(Ctx);
}

const isMedia = (f: File) => /^(image|video)\//.test(mediaTypeOf(f));

export function ShareMediaProvider({ children }: { children: ReactNode }) {
  const input = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[] | null>(null);
  const [intro, setIntro] = useState(false);
  const pick = useCallback(() => setIntro(true), []);
  const share = useCallback((list: FileList | File[]) => {
    const ok = Array.from(list).filter(isMedia);
    if (ok.length) {
      setIntro(false);
      setFiles(ok);
    }
  }, []);
  const api = useMemo(() => ({ pick, share }), [pick, share]);

  return (
    <Ctx.Provider value={api}>
      {children}
      <input
        ref={input}
        type="file"
        accept={ACCEPT_ATTR}
        multiple
        hidden
        onChange={(e) => {
          if (e.target.files) share(e.target.files);
          e.target.value = "";
        }}
      />
      {intro && (
        <MomentsIntro
          onClose={() => setIntro(false)}
          // the picker opens inside this click, so the browser allows it
          onPick={() => input.current?.click()}
          onDrop={share}
        />
      )}
      {files && <ShareMediaSheet files={files} onClose={() => setFiles(null)} />}
    </Ctx.Provider>
  );
}

/** What happens to the photos and videos, before the picker opens. */
function MomentsIntro({ onClose, onPick, onDrop }: { onClose: () => void; onPick: () => void; onDrop: (files: FileList) => void }) {
  const { h } = useHubCopy();
  const [dropping, setDropping] = useState(false);
  return (
    <Sheet open onClose={onClose} title={h.momentsTitle}>
      <div className="flex flex-col gap-4">
        <p className="m-0 text-[15px] font-medium leading-relaxed text-ink2">{h.momentsBody}</p>
        <p className="m-0 flex items-start gap-2.5 bg-tint-gold px-3 py-2.5 text-[13.5px] font-semibold leading-snug text-navy">
          <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          {h.momentsNote}
        </p>
        <button
          type="button"
          onClick={onPick}
          onDragOver={(e) => (e.preventDefault(), setDropping(true))}
          onDragLeave={() => setDropping(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDropping(false);
            if (e.dataTransfer.files.length) onDrop(e.dataTransfer.files);
          }}
          className={`flex flex-col items-center gap-1.5 border-[1.5px] border-dashed px-4 py-6 text-center transition ${
            dropping ? "border-orange bg-tint-orange" : "border-sky bg-tint-sky/50 hover:bg-tint-sky"
          }`}
        >
          <span className="flex h-12 w-12 items-center justify-center bg-sky text-white">
            <ImagePlus className="h-6 w-6" aria-hidden="true" />
          </span>
          <span className="text-[16px] font-extrabold text-navy">{h.momentsPick}</span>
          <span className="text-[13px] font-medium text-ink-muted">{h.momentsPickSub}</span>
        </button>
      </div>
    </Sheet>
  );
}

function ShareMediaSheet({ files, onClose }: { files: File[]; onClose: () => void }) {
  const { h } = useHubCopy();
  const navigate = useNavigate();
  const [to, setTo] = useState<"community" | "team">("community");
  const [sent, setSent] = useState(false);

  const choices = [
    { id: "community" as const, icon: Megaphone, title: h.toEveryone, sub: h.toEveryoneSub },
    { id: "team" as const, icon: Send, title: h.toUs, sub: h.toUsSub },
  ];

  return (
    <Sheet open onClose={onClose} title={h.shareMediaTitle} wide>
      {sent ? (
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <span className="flex h-14 w-14 items-center justify-center bg-tint-pink text-magenta">
            <PartyPopper className="h-7 w-7" aria-hidden="true" />
          </span>
          <h3 className="m-0 text-xl font-extrabold">{h.thanksTitle}</h3>
          <p className="m-0 text-[15px] font-medium text-ink-muted">{h.thanksBody}</p>
          <button type="button" onClick={onClose} className="btn-orange mt-2 h-11 px-5">
            {h.close}
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label={h.shareMediaTitle}>
            {choices.map((c) => (
              <button
                key={c.id}
                type="button"
                role="radio"
                aria-checked={to === c.id}
                onClick={() => setTo(c.id)}
                className={`flex items-start gap-3 px-3 py-3 text-start ${
                  to === c.id ? "bg-tint-sky outline outline-2 outline-sky" : "border-[1.5px] border-hair hover:border-sky"
                }`}
              >
                <c.icon className={`mt-0.5 h-5 w-5 shrink-0 ${to === c.id ? "text-sky" : "text-ink-faint"}`} aria-hidden="true" />
                <span className="min-w-0">
                  <span className="block text-[15px] font-extrabold leading-snug text-navy">{c.title}</span>
                  <span className="block text-[13px] font-medium leading-snug text-ink-muted">{c.sub}</span>
                </span>
              </button>
            ))}
          </div>
          <Composer
            audience={to}
            postKind="post"
            initialFiles={files}
            autoFocusText={false}
            mediaFirst
            placeholder={h.mediaPlaceholder}
            allowAlsoCommunity={to === "team"}
            onDone={() => {
              if (to === "team") return setSent(true);
              onClose();
              navigate("/");
            }}
          />
        </div>
      )}
    </Sheet>
  );
}
