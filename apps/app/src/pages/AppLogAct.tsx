import { useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Play, Upload, X } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { useAppMe } from "@/hooks/useAppData";
import { supabase } from "@shared/integrations/supabase/client";
import { cn } from "@shared/lib/utils";

const CHIP_LABELS = [
  "Helped a neighbor",
  "Gave a compliment",
  "Volunteered",
  "Donated",
  "Paid for someone",
  "Listened & supported",
  "Something else",
];

const MAX_FILE_SIZE = 25 * 1024 * 1024;

/**
 * The redesigned, chip-based "Log an Act of Kindness" screen — the primary
 * destination for /log now (the Dashboard's own quick-log field handles the
 * bare one-line case; this is what "pick a specific act" on that card links
 * to). The previous mode-picker/multi-photo/anonymous-capture flow
 * (ShareActFlow) is still reachable from here as "more detail" for anyone
 * who wants it — it moved to /log/detailed rather than being replaced,
 * since its mode axis (witnessed/received) and multi-photo support aren't
 * things this simpler chip flow covers.
 */
export default function AppLogAct() {
  const navigate = useNavigate();
  const { data: me } = useAppMe();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const withName = searchParams.get("with")?.trim();
  const toUserId = searchParams.get("toUserId")?.trim();

  const [picked, setPicked] = useState<string | null>(null);
  const [note, setNote] = useState(withName ? `Passed it forward to ${withName}: ` : "");
  const [file, setFile] = useState<{ file: File; preview: string; isVideo: boolean } | null>(null);
  const [shareOnWall, setShareOnWall] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [newTotal, setNewTotal] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function pickFile(list: FileList | null) {
    const f = list?.[0];
    if (!f) return;
    const isVideo = f.type.startsWith("video/");
    if (!isVideo && !f.type.startsWith("image/")) return;
    if (f.size > MAX_FILE_SIZE) {
      toast.error("That file is too large — please pick something under 25MB.");
      return;
    }
    if (file) URL.revokeObjectURL(file.preview);
    setFile({ file: f, preview: URL.createObjectURL(f), isVideo });
  }

  function removeFile() {
    if (file) URL.revokeObjectURL(file.preview);
    setFile(null);
  }

  async function submit() {
    if (!picked || submitting) return;
    setSubmitting(true);
    try {
      let photoPaths: string[] = [];
      if (file) {
        const ext = file.file.name.split(".").pop()?.toLowerCase() || "jpg";
        const { data, error } = await supabase.functions.invoke("sign-photo-upload", { body: { ext } });
        if (!error && data?.signed_url) {
          const put = await fetch(data.signed_url, {
            method: "PUT",
            headers: { "Content-Type": file.file.type },
            body: file.file,
          });
          if (put.ok) photoPaths = [data.path as string];
          else toast.error("The photo couldn't be uploaded, but your act will still be logged.");
        } else {
          toast.error("The photo couldn't be uploaded, but your act will still be logged.");
        }
      }

      const { data, error } = await supabase.functions.invoke("submit-act", {
        body: {
          mode: "performed",
          description: note.trim() || undefined,
          photo_paths: photoPaths,
          to_user_id: toUserId || undefined,
          act_type: picked,
          share_on_wall: shareOnWall,
        },
      });
      const failure = (data as { error?: string } | null)?.error ?? error?.message;
      if (failure) {
        toast.error(failure);
        return;
      }
      if (data?.status === "rejected") {
        toast.error(data?.short_reason || "Couldn't log that — please rephrase and try again.");
        return;
      }
      if (!data?.id) {
        toast.error("Something went wrong. Please try again.");
        return;
      }
      setNewTotal((me?.actsPassedForward ?? 0) + 1);
      setSubmitted(true);
      queryClient.invalidateQueries({ queryKey: ["app", "me"] });
      queryClient.invalidateQueries({ queryKey: ["app", "my-acts"] });
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 py-16 text-center">
        <div className="flex h-[88px] w-[88px] items-center justify-center rounded-full bg-app-coral/10">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-app-coral">
            <CheckCircle2 className="h-[30px] w-[30px] text-app-surface" strokeWidth={2.4} />
          </div>
        </div>
        <p className="text-[21px] font-bold text-foreground">Nice work!</p>
        <p className="max-w-[280px] text-sm leading-relaxed text-muted-foreground">
          {shareOnWall
            ? "Your act of kindness was added to the Wall and passed forward to the chain."
            : "Your act of kindness was logged and passed forward to the chain."}{" "}
          That's <strong className="text-foreground">{newTotal}</strong> acts and counting.
        </p>
        <Link
          to="/"
          className="mt-2 w-full rounded-2xl bg-app-coral py-[15px] text-[15px] font-bold text-app-surface"
        >
          Back to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex h-16 shrink-0 items-center gap-1.5 border-b border-border bg-app-surface px-2">
        <button
          type="button"
          onClick={() => navigate("/")}
          aria-label="Cancel"
          className="flex h-10 w-10 items-center justify-center rounded-xl"
        >
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </button>
        <p className="text-[15.5px] font-bold text-foreground">Log an Act of Kindness</p>
      </div>

      <div className="flex flex-1 flex-col gap-[18px] px-4 py-5">
        <div>
          <p className="mb-2.5 text-sm font-bold text-foreground">What did you do?</p>
          <div className="flex flex-wrap gap-2">
            {CHIP_LABELS.map((label) => (
              <button
                key={label}
                type="button"
                onClick={() => setPicked(label)}
                className={cn(
                  "rounded-full border-[1.5px] px-4 py-2.5 text-[13px] font-semibold",
                  picked === label
                    ? "border-app-coral bg-app-coral text-app-surface"
                    : "border-app-ink/[0.14] bg-app-surface text-foreground",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label htmlFor="log-note" className="mb-2 block text-sm font-bold text-foreground">
            Tell us more <span className="font-medium text-muted-foreground">(optional)</span>
          </label>
          <textarea
            id="log-note"
            rows={3}
            maxLength={1000}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="A quick word about what happened..."
            className="w-full resize-none rounded-2xl border-[1.5px] border-app-ink/[0.14] bg-app-surface px-3.5 py-3 text-[13.5px] text-foreground"
          />
        </div>

        <div>
          <p className="mb-2 text-sm font-bold text-foreground">
            Add a photo or video <span className="font-medium text-muted-foreground">(optional)</span>
          </p>
          {!file ? (
            <>
              <label
                htmlFor="log-media"
                className="flex h-[104px] cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-[1.5px] border-dashed border-app-ink/[0.22] bg-app-ink/[0.03]"
              >
                <Upload className="h-[22px] w-[22px] text-app-ink/40" />
                <span className="text-xs font-semibold text-app-ink/50">
                  Tap to attach a photo or video
                </span>
              </label>
              <input
                ref={fileInputRef}
                id="log-media"
                type="file"
                accept="image/*,video/*"
                onChange={(e) => pickFile(e.target.files)}
                className="sr-only"
              />
            </>
          ) : (
            <div className="relative h-[180px] overflow-hidden rounded-2xl bg-app-ink">
              {file.isVideo ? (
                <video src={file.preview} controls className="h-full w-full object-cover" />
              ) : (
                <img src={file.preview} alt="Attached preview" className="h-full w-full object-cover" />
              )}
              <button
                type="button"
                onClick={removeFile}
                aria-label="Remove attachment"
                className="absolute right-2 top-2 flex h-[30px] w-[30px] items-center justify-center rounded-full bg-app-ink/70"
              >
                <X className="h-3.5 w-3.5 text-app-surface" />
              </button>
              {file.isVideo && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <Play className="h-8 w-8 text-app-surface/80" />
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between rounded-2xl border border-border bg-app-surface p-3.5">
          <div>
            <p className="text-[13.5px] font-bold text-foreground">Share on the Wall of Kindness</p>
            <p className="mt-0.5 text-[11.5px] text-muted-foreground">Inspire someone else to pass it on</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={shareOnWall}
            onClick={() => setShareOnWall((v) => !v)}
            className={cn(
              "flex h-[27px] w-[46px] shrink-0 items-center rounded-full p-[3px] transition-colors",
              shareOnWall ? "justify-end bg-app-coral" : "justify-start bg-app-ink/15",
            )}
          >
            <span className="block h-[21px] w-[21px] rounded-full bg-app-surface shadow" />
          </button>
        </div>

        <button
          type="button"
          onClick={submit}
          disabled={!picked || submitting}
          className={cn(
            "w-full rounded-2xl py-4 text-[15px] font-bold text-app-surface",
            picked ? "bg-app-coral" : "bg-app-ink/25",
          )}
        >
          {submitting ? "…" : "Log This Act"}
        </button>

        <Link to="/pass" className="text-center text-xs font-semibold text-app-sky">
          or scan someone's Kindness QR instead
        </Link>

        <Link to={`/log/detailed${toUserId ? `?with=${encodeURIComponent(withName ?? "")}&toUserId=${encodeURIComponent(toUserId)}` : ""}`} className="text-center text-xs font-semibold text-muted-foreground underline underline-offset-2">
          Want to log something witnessed or received, or add more photos? Use the detailed form
        </Link>
      </div>
    </div>
  );
}
