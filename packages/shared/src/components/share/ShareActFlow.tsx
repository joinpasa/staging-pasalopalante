import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Heart, Loader2, Play, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { useLanguage } from "@shared/contexts/LanguageContext";
import { useAuth } from "@shared/contexts/AuthContext";
import { Button } from "@shared/components/ui/button";
import { Input } from "@shared/components/ui/input";
import { Textarea } from "@shared/components/ui/textarea";
import { Label } from "@shared/components/ui/label";
import { supabase } from "@shared/integrations/supabase/client";
import { logConsent } from "@shared/lib/legal";
import { getAuthErrorMessage } from "@shared/lib/authErrors";

type Mode = "performed" | "witnessed" | "received";

const MAX_FILES = 6;
const MAX_FILE_SIZE = 25 * 1024 * 1024;

const detailsSchema = z.object({
  description: z.string().trim().max(1000).optional(),
  first_name: z.string().trim().max(60).optional(),
  email: z
    .string()
    .trim()
    .max(200)
    .refine((v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), "Enter a valid email")
    .optional(),
});


interface Props {
  onClose?: () => void;
  initialMode?: Mode;
  initialDescription?: string;
  /** Where to go after a successful log. Defaults to the thanks page. */
  redirectTo?: string;
  /** Set only when this act is logged via a /wave pass hand-off — the
   *  specific person it's being passed to. Lets the recipient later send a
   *  one-tap "thanks" back. Never set for a regular act. */
  toUserId?: string;
  /** Render mode-select and details as one screen (a compact radio row)
   *  instead of the two-step wizard. Used by the site-wide share popup;
   *  other call sites (the app's /log flow, inline inspiration cards) keep
   *  the wizard unchanged. */
  singleStep?: boolean;
}

export default function ShareActFlow({ onClose, initialMode, initialDescription, redirectTo, toUserId, singleStep }: Props) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState<1 | 2>(initialMode || singleStep ? 2 : 1);
  const [mode, setMode] = useState<Mode | null>(initialMode ?? (singleStep ? "performed" : null));
  const [description, setDescription] = useState(initialDescription ?? "");
  const [firstName, setFirstName] = useState("");
  const [profileDisplayName, setProfileDisplayName] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [files, setFiles] = useState<{ file: File; preview: string; isVideo: boolean }[]>([]);
  const [photoConsent, setPhotoConsent] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load logged-in user's display name so we only ask for a name when missing.
  useEffect(() => {
    if (!user) {
      setProfileDisplayName(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled) return;
      const dn = (data?.display_name ?? "").toString().trim();
      setProfileDisplayName(dn || null);
    })();
    return () => { cancelled = true; };
  }, [user]);


  function handlePick(m: Mode) {
    setMode(m);
    setStep(2);
  }

  function addFiles(list: FileList | File[] | null) {
    if (!list) return;
    const next = [...files];
    for (const f of Array.from(list)) {
      if (next.length >= MAX_FILES) break;
      const isVideo = f.type.startsWith("video/");
      if (!isVideo && !f.type.startsWith("image/")) continue;
      if (f.size > MAX_FILE_SIZE) {
        toast.error(t.share.uploadError);
        continue;
      }
      next.push({ file: f, preview: URL.createObjectURL(f), isVideo });
    }
    setFiles(next);
  }

  function removeFile(i: number) {
    setFiles((prev) => prev.filter((_, idx) => idx !== i));
    setPhotoConsent(false);
  }

  async function uploadPhoto(file: File): Promise<string | null> {
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const { data, error } = await supabase.functions.invoke("sign-photo-upload", {
      body: { ext },
    });
    if (error || !data?.signed_url) return null;
    const put = await fetch(data.signed_url, {
      method: "PUT",
      headers: { "Content-Type": file.type },
      body: file,
    });
    if (!put.ok) return null;
    return data.path as string;
  }

  async function handleSubmit() {
    if (!mode) {
      toast.error(t.share.chooseModeError);
      return;
    }
    const parsed = detailsSchema.safeParse({
      description,
      first_name: firstName,
      email,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    if (files.length > 0 && !photoConsent) {
      toast.error(t.share.photoConsentRequired);
      return;
    }
    // Anonymous submitters consent by clicking Submit (disclosure is shown above).

    setSubmitting(true);
    try {
      const photoPaths: string[] = [];
      for (const f of files) {
        const path = await uploadPhoto(f.file);
        if (path) photoPaths.push(path);
      }

      const trimmedFirstName = firstName.trim();

      const { data, error } = await supabase.functions.invoke("submit-act", {
        body: {
          mode,
          description: description.trim() || undefined,
          first_name: trimmedFirstName || undefined,
          email: email.trim() || undefined,
          photo_paths: photoPaths,
          to_user_id: toUserId || undefined,
        },
      });

      if (error) {
        const msg =
          (error as { context?: { error?: string } })?.context?.error ||
          t.share.submitError;
        toast.error(msg);
        setSubmitting(false);
        return;
      }
      if (data?.status === "rejected") {
        const codes: string[] = Array.isArray(data?.reason_codes) ? data.reason_codes : [];
        const reasonText = codes.length ? ` (${codes.join(", ")})` : "";
        toast.error(
          `${t.share.submitError}${reasonText}. ${
            data?.short_reason || "Please rephrase and try again."
          }`,
        );
        setSubmitting(false);
        return;
      }
      if (!data?.id) {
        toast.error(t.share.submitError);
        setSubmitting(false);
        return;
      }

      // Everything below is a best-effort side effect (profile name, consent
      // audit log, magic link) that the redirect to the thank-you page must
      // never wait on — logConsent in particular includes a third-party IP
      // lookup with no timeout, which was stalling the redirect for 10-20s
      // whenever that external service was slow. Fire-and-forget instead of
      // awaiting; each already swallows its own errors.

      // If logged-in user supplied a name and didn't have a display_name, save it.
      if (user && trimmedFirstName && !profileDisplayName) {
        supabase
          .from("profiles")
          .update({ display_name: trimmedFirstName })
          .eq("user_id", user.id)
          .then(({ error }) => {
            if (error) console.error("profile update failed", error);
          });
      }

      // Log a consent record for this submission (audit trail).
      logConsent({
        context: user ? "signup" : "anon_act",
        act_id: data.id,
        user_id: user?.id ?? null,
        email: email.trim() || null,
      }).catch((err) => console.error("consent log failed", err));

      // If signed-out and email provided: send a magic link.
      //  - Existing account → sign-in link (claims this act on landing).
      //  - New email → sign-up link that creates an account with this display name.
      let postShare: { kind: "check_inbox" | "prefill"; email: string } | null = null;
      const trimmedEmail = email.trim().toLowerCase();
      if (!user && trimmedEmail) {
        const origin =
          window.location.origin.includes("localhost") || window.location.origin.includes("id-preview--")
            ? "https://pasalopalante.com"
            : window.location.origin;
        // Always allow user creation: if the email is already registered, Supabase
        // sends a sign-in magic link; if not, it sends a sign-up link. We intentionally
        // do not check existence client-side (prevents anonymous email enumeration).
        // Not awaited — must not delay the redirect. We optimistically show "check
        // your inbox" immediately, but still surface it if the send actually failed
        // (e.g. a rate limit) — signInWithOtp resolves with an error rather than
        // rejecting, so a bare .catch() here would never see an API-level failure.
        supabase.auth
          .signInWithOtp({
            email: trimmedEmail,
            options: {
              shouldCreateUser: true,
              emailRedirectTo: `${origin}/share/thanks/${data.id}?claim=1`,
              data: trimmedFirstName ? { display_name: trimmedFirstName } : undefined,
            },
          })
          .then(({ error }) => {
            if (error) toast.error(getAuthErrorMessage(error));
          });
        postShare = { kind: "check_inbox", email: trimmedEmail };
      }
      if (postShare) {
        sessionStorage.setItem(`share_post_${data.id}`, JSON.stringify(postShare));
      }

      // The thank-you page re-fetches by id, but a freshly submitted act is
      // often still "pending_review" (not yet "published"), and the public
      // RLS policy only exposes published acts to anonymous readers - so
      // that re-fetch can legitimately come back empty right after
      // submitting. Stash what was just submitted so the page has something
      // to show immediately regardless of publish/moderation timing.
      sessionStorage.setItem(
        `share_content_${data.id}`,
        JSON.stringify({ description: description.trim() || null, first_name: trimmedFirstName || null, mode, photo_paths: photoPaths }),
      );

      if (user) {
        sessionStorage.setItem(
          `share_rewards_${data.id}`,
          JSON.stringify({ unlocked_badges: data.unlocked_badges || [], type_tag: data.type_tag })
        );
      }

      onClose?.();
      navigate(redirectTo ?? `/share/thanks/${data.id}`);
    } catch (e) {
      console.error(e);
      toast.error(t.share.submitError);
      setSubmitting(false);
    }
  }

  const detailsFields = (
    <>
      <div className="space-y-2">
        <Label htmlFor="desc">{t.share.descriptionLabel}</Label>
        <Textarea
          id="desc"
          rows={4}
          maxLength={1000}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t.share.descriptionPlaceholder}
        />
        {singleStep && <p className="text-xs text-muted-foreground">{t.share.descriptionHelper}</p>}
      </div>

      {(!user || !profileDisplayName) && (
        <div className={singleStep ? "grid grid-cols-1 sm:grid-cols-2 gap-3.5" : "space-y-2"}>
          <div className="space-y-2">
            <Label htmlFor="first_name">{t.share.firstNameLabel}</Label>
            <Input
              id="first_name"
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder={t.share.firstNamePlaceholder}
              maxLength={60}
            />
          </div>
          {singleStep && !user && (
            <div className="space-y-2">
              <Label htmlFor="email">{t.share.emailLabel}</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t.share.emailPlaceholder}
                maxLength={200}
              />
            </div>
          )}
        </div>
      )}

      {singleStep && !user && (
        <p className="text-xs text-muted-foreground -mt-2">{t.share.claimHelper}</p>
      )}

      {!singleStep && !user && (
        <div className="space-y-2">
          <Label htmlFor="email">{t.share.emailLabel}</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t.share.emailPlaceholder}
            maxLength={200}
          />
          <p className="text-xs text-muted-foreground">{t.share.emailHelper}</p>
        </div>
      )}

      <div className="space-y-3">
        <Label>{t.share.mediaOptionalLabel}</Label>

        {files.length > 0 && (
          <div className="flex flex-wrap gap-3">
            {files.map((f, i) => (
              <div key={i} className="relative w-[84px] h-[84px] rounded-xl overflow-hidden border">
                {f.isVideo ? (
                  <div className="w-full h-full bg-muted flex items-center justify-center">
                    <Play size={22} className="text-muted-foreground fill-current" />
                  </div>
                ) : (
                  <img src={f.preview} alt="" className="w-full h-full object-cover" />
                )}
                <button
                  type="button"
                  onClick={() => removeFile(i)}
                  className="absolute top-1 end-1 w-[22px] h-[22px] rounded-full bg-black/65 text-white flex items-center justify-center"
                  aria-label="Remove"
                >
                  <X size={13} />
                </button>
              </div>
            ))}
          </div>
        )}

        {files.length < MAX_FILES && (
          <div
            role="button"
            tabIndex={0}
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") fileInputRef.current?.click(); }}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={(e) => { e.preventDefault(); setDragging(false); }}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              addFiles(e.dataTransfer.files);
            }}
            className={`rounded-2xl border-2 border-dashed px-5 py-6 flex flex-col items-center justify-center text-center cursor-pointer transition-colors ${
              dragging ? "border-primary bg-warm-blush" : "border-border bg-warm-cream hover:border-primary/50"
            }`}
          >
            <Upload size={26} className="text-primary mb-2" />
            <p className="text-sm text-foreground">
              {t.share.dropzonePrefix}{" "}
              <span className="text-primary underline underline-offset-2">{t.share.dropzoneBrowse}</span>
            </p>
            <p className="text-xs text-muted-foreground mt-1">{t.share.dropzoneHint}</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              multiple
              className="hidden"
              onChange={(e) => addFiles(e.target.files)}
            />
          </div>
        )}

        {files.length > 0 && (
          <label className="flex items-start gap-2 text-xs text-foreground/80 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={photoConsent}
              onChange={(e) => setPhotoConsent(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-primary cursor-pointer"
            />
            <span>{t.share.photoConsentLabel}</span>
          </label>
        )}
      </div>

      {!user && (
        <p className="text-sm text-foreground/85 leading-relaxed bg-warm-cream/60 border border-border rounded-xl p-4">
          {t.legal.anonDisclosure
            .split("{terms}").flatMap((seg, i, arr) =>
              i < arr.length - 1
                ? [seg, <a key={`t${i}`} href="/terms" target="_blank" rel="noopener noreferrer" className="underline text-primary">{t.legal.terms}</a>]
                : [seg])
            .flatMap((node, i) => typeof node === "string"
              ? node.split("{privacy}").flatMap((seg, j, arr) =>
                  j < arr.length - 1
                    ? [seg, <a key={`p${i}-${j}`} href="/privacy" target="_blank" rel="noopener noreferrer" className="underline text-primary">{t.legal.privacy}</a>]
                    : [seg])
              : [node])
            .flatMap((node, i) => typeof node === "string"
              ? node.split("{community}").flatMap((seg, j, arr) =>
                  j < arr.length - 1
                    ? [seg, <a key={`c${i}-${j}`} href="/community-guidelines" target="_blank" rel="noopener noreferrer" className="underline text-primary">{t.legal.community}</a>]
                    : [seg])
              : [node])}
        </p>
      )}

      <Button
        onClick={handleSubmit}
        disabled={submitting}
        className="w-full !py-6 text-base"
      >
        {submitting ? (
          <>
            <Loader2 className="animate-spin" /> {t.share.submitting}
          </>
        ) : (
          singleStep ? t.share.submitCompact : t.share.submit
        )}
      </Button>
    </>
  );

  if (singleStep) {
    const modeOptions: { key: Mode; label: string }[] = [
      { key: "performed", label: t.share.modeGaveShort },
      { key: "received", label: t.share.modeReceivedShort },
      { key: "witnessed", label: t.share.modeWitnessedShort },
    ];
    return (
      <div className="w-full max-w-2xl mx-auto space-y-6">
        <div className="space-y-2.5">
          <p className="text-xs uppercase tracking-[0.18em] text-primary font-semibold">{t.share.formEyebrow}</p>
          <h2 className="headline-md text-foreground">{t.share.formHeading}</h2>
        </div>

        <div className="space-y-2.5">
          <Label>{t.share.modeToggleLabel}</Label>
          <div className="grid grid-cols-3 gap-2.5">
            {modeOptions.map((m) => (
              <button
                key={m.key}
                type="button"
                onClick={() => setMode(m.key)}
                className={`rounded-xl px-2 py-3.5 text-sm font-semibold transition-all ${
                  mode === m.key
                    ? "border-2 border-primary bg-primary text-primary-foreground"
                    : "border-2 border-border bg-warm-cream text-foreground hover:border-primary/40"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {detailsFields}
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      <AnimatePresence mode="wait">
        {step === 1 ? (
          <motion.div
            key="step1"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3 }}
            className="text-center space-y-8"
          >
            <h2 className="headline-lg text-foreground">{t.share.modeQuestion}</h2>
            <div className="space-y-4">
              <button
                onClick={() => handlePick("performed")}
                className="group w-full rounded-2xl border-2 border-primary bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-200 px-8 py-10 text-center hover:shadow-xl hover:-translate-y-0.5 flex items-center justify-center gap-3"
              >
                <Heart size={24} className="fill-current" />
                <span className="block text-2xl sm:text-3xl font-medium" style={{ fontFamily: "'DM Serif Display', serif" }}>
                  {t.share.modePerformed}
                </span>
              </button>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { key: "received" as Mode, label: t.share.modeReceived },
                  { key: "witnessed" as Mode, label: t.share.modeWitnessed },
                ].map((m) => (
                  <button
                    key={m.key}
                    onClick={() => handlePick(m.key)}
                    className="group rounded-2xl border-2 border-border hover:border-primary bg-card hover:bg-warm-cream transition-all duration-200 p-6 text-center hover:shadow-lg hover:-translate-y-0.5"
                  >
                    <span className="block text-xl font-medium text-foreground group-hover:text-primary" style={{ fontFamily: "'DM Serif Display', serif" }}>
                      {m.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="step2"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            <button
              onClick={() => setStep(1)}
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft size={16} /> {t.share.back}
            </button>

            {mode && (
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                <Heart size={12} className="fill-current" />
                {mode === "performed"
                  ? t.share.modePerformed
                  : mode === "received"
                  ? t.share.modeReceived
                  : t.share.modeWitnessed}
              </div>
            )}

            <h2 className="headline-md text-foreground">{t.share.detailsHeading}</h2>

            {detailsFields}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
