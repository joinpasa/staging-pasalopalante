import { useRef, useState } from "react";
import { ImagePlus, Loader2, Play, RotateCw, X } from "lucide-react";
import { useHubCopy, CONSENT_VERSION } from "@/lib/hubCopy";
import { useCreatePost, useMe } from "@/lib/hub";
import { useUploads } from "@/lib/useUploads";
import { ACCEPT_ATTR } from "@/lib/upload";
import Avatar from "./Avatar";
import Consent, { consentProblem, NO_CONSENT, type ConsentState } from "./Consent";

/**
 * Writing a post (to every member) or a story (to the team, optionally to members too).
 * One text box, one "add photos" button, the consent boxes, and Send.
 */
export default function Composer({
  audience = "community",
  postKind = "post",
  placeholder,
  allowAlsoCommunity = false,
  onDone,
}: {
  audience?: "community" | "team";
  postKind?: "post" | "testimonial" | "video";
  placeholder?: string;
  allowAlsoCommunity?: boolean;
  onDone: () => void;
}) {
  const { h } = useHubCopy();
  const { data: me } = useMe();
  const uploads = useUploads();
  const create = useCreatePost();
  const [body, setBody] = useState("");
  const [consent, setConsent] = useState<ConsentState>(NO_CONSENT);
  const [alsoCommunity, setAlsoCommunity] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const hasMedia = uploads.items.length > 0;
  const empty = !body.trim() && !hasMedia;

  async function submit() {
    setError(null);
    const problem = consentProblem(consent, hasMedia, h);
    if (problem) return setError(problem);
    if (uploads.busy) return;
    try {
      await create.mutateAsync({
        audience: allowAlsoCommunity && alsoCommunity ? "community" : audience,
        postKind,
        body: body.trim(),
        media: uploads.uploaded,
        consentShare: consent.share,
        consentPeople: consent.people,
        showsMinors: consent.minors,
        consentText: `${CONSENT_VERSION}: ${h.consentShare}${hasMedia ? ` | ${h.consentPeople}` : ""}`,
      });
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : h.somethingWrong);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-3">
        <Avatar name={me?.name ?? ""} url={me?.logoUrl} kind={me?.kind ?? "organisation"} size={42} />
        <textarea
          id="composer-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={placeholder ?? h.postPlaceholder}
          rows={4}
          maxLength={2000}
          className="min-h-[110px] flex-1 resize-none border-0 p-1 text-[17px] font-medium leading-relaxed text-navy outline-none placeholder:text-ink-faint"
          autoFocus
        />
      </div>

      {hasMedia && (
        <div className="grid grid-cols-3 gap-2">
          {uploads.items.map((it) => (
            <div key={it.key} className="relative aspect-square overflow-hidden bg-tint-sky">
              {it.file && !it.isVideo ? (
                <img src={URL.createObjectURL(it.file)} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-sky">
                  <Play className="h-8 w-8" aria-hidden="true" />
                </span>
              )}
              {it.state === "uploading" && (
                <span className="absolute inset-x-0 bottom-0 h-1.5 bg-white/70">
                  <span className="block h-full bg-orange" style={{ width: `${it.progress}%` }} />
                </span>
              )}
              {it.state === "failed" && (
                <button type="button" onClick={() => uploads.retry(it.key)} className="absolute inset-0 flex items-center justify-center bg-white/80 text-xs font-bold text-rose-ink">
                  <RotateCw className="me-1 h-4 w-4" aria-hidden="true" /> Retry
                </button>
              )}
              <button
                type="button"
                onClick={() => uploads.remove(it.key)}
                className="absolute end-1 top-1 flex h-7 w-7 items-center justify-center bg-white/90 text-navy"
                aria-label={h.delete}
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between border-y-[1.5px] border-hair py-2">
        <button type="button" onClick={() => fileRef.current?.click()} className="flex items-center gap-2 px-1 py-1.5 text-sm font-bold text-sky-deep hover:text-navy">
          <ImagePlus className="h-5 w-5" aria-hidden="true" />
          {h.addMedia}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept={ACCEPT_ATTR}
          multiple
          hidden
          onChange={(e) => {
            if (e.target.files) uploads.add(Array.from(e.target.files));
            e.target.value = "";
          }}
        />
        <span className="text-xs font-semibold text-ink-faint">{body.length > 1600 ? `${body.length}/2000` : ""}</span>
      </div>

      <Consent id="composer" value={consent} onChange={setConsent} hasMedia={hasMedia} />

      {allowAlsoCommunity && (
        <label className="flex items-center gap-3 text-sm font-semibold text-ink2" htmlFor="composer-also">
          <input id="composer-also" type="checkbox" className="h-4 w-4 accent-[#00a3e0]" checked={alsoCommunity} onChange={(e) => setAlsoCommunity(e.target.checked)} />
          {h.alsoCommunity}
        </label>
      )}

      {error && (
        <p role="alert" className="m-0 bg-rose-soft px-3 py-2 text-sm font-semibold text-rose-ink">
          {error}
        </p>
      )}

      <button type="button" onClick={submit} disabled={empty || create.isPending || uploads.busy} className="btn-orange h-12 w-full text-base">
        {create.isPending || uploads.busy ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : null}
        {create.isPending ? (audience === "team" ? h.sending : h.posting) : audience === "team" ? h.sendIt : h.post}
      </button>
    </div>
  );
}
