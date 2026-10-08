import { useRef } from "react";
import { AlertCircle, Clock, Image as ImageIcon, Play, RotateCw, Upload, X } from "lucide-react";
import { useCopy } from "@/lib/i18n";
import { ACCEPT_ATTR, formatBytes } from "@/lib/upload";
import type { useUploads } from "@/lib/useUploads";

type Uploads = ReturnType<typeof useUploads>;

/** Log 1 Act's "Add photo or video" block: picker + one progress card per file. */
export default function MediaField({ uploads, id }: { uploads: Uploads; id: string }) {
  const { t } = useCopy();
  const inputRef = useRef<HTMLInputElement>(null);
  const hasVideo = uploads.items.some((i) => i.isVideo);

  return (
    <div className="flex flex-col gap-2.5">
      <span className="label" id={`${id}-label`}>
        {t.addMedia}
      </span>
      {uploads.items.map((it) => (
        <div key={it.key} className="flex items-center gap-3.5 rounded-2xl border-[1.5px] border-line-soft bg-white p-3">
          <div
            className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl ${it.isVideo ? "bg-navy/90" : "bg-[#FFF1E8]"}`}
          >
            {it.isVideo ? (
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white">
                <Play className="h-3.5 w-3.5 fill-navy text-navy" aria-hidden="true" />
              </span>
            ) : (
              <ImageIcon className="h-[22px] w-[22px] text-orange" aria-hidden="true" />
            )}
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <div className="flex justify-between gap-2 text-[13px] font-semibold">
              <span className="truncate">
                {it.name}
                {it.size !== undefined && ` · ${formatBytes(it.size)}`}
              </span>
              {it.state === "uploading" && <span className="text-sky-deep">{it.progress}%</span>}
            </div>
            {it.state === "uploading" && (
              <div className="h-1.5 rounded-full bg-track">
                <div className="h-1.5 rounded-full bg-sky transition-[width]" style={{ width: `${it.progress}%` }} />
              </div>
            )}
            {it.state === "done" && <span className="text-xs font-semibold text-sky-ink">{t.uploadComplete}</span>}
            {it.state === "failed" && (
              <span role="alert" className="flex items-start gap-1.5 text-xs font-semibold leading-snug text-rose-ink">
                <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                {it.reason ? t.uploadErrors[it.reason] : t.uploadFailed}
              </span>
            )}
          </div>
          {it.state === "failed" && it.file && it.reason !== "type" && it.reason !== "size" && (
            <button
              type="button"
              onClick={() => uploads.retry(it.key)}
              aria-label={t.retry}
              className="flex h-11 w-11 items-center justify-center rounded-xl text-rose"
            >
              <RotateCw className="h-[18px] w-[18px]" />
            </button>
          )}
          <button
            type="button"
            onClick={() => uploads.remove(it.key)}
            aria-label={it.state === "uploading" ? t.cancelUpload : t.removeFile}
            className="flex h-11 w-11 items-center justify-center rounded-xl text-ink-muted hover:bg-canvas"
          >
            <X className="h-[18px] w-[18px]" />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        aria-describedby={`${id}-label`}
        className="flex min-h-[64px] items-center justify-center gap-2.5 rounded-2xl border-2 border-dashed border-sky/50 bg-sky-wash px-4 py-3 text-[15px] font-bold text-sky-deep hover:border-sky"
      >
        <Upload className="h-5 w-5" aria-hidden="true" />
        <span className="flex flex-col items-start">
          {t.tapToAdd}
          <span className="text-xs font-medium text-ink-muted">{t.mediaHint}</span>
        </span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT_ATTR}
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) uploads.add(e.target.files);
          e.target.value = "";
        }}
      />
      {hasVideo && (
        <div className="flex items-start gap-2 text-[13px] leading-normal text-ink-muted">
          <Clock className="mt-0.5 h-4 w-4 shrink-0 text-sky" aria-hidden="true" />
          <span>{t.videoNote}</span>
        </div>
      )}
    </div>
  );
}
