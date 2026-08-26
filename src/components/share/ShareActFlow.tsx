import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ChevronDown, Heart, ImagePlus, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { logConsent } from "@/lib/legal";

type Mode = "performed" | "witnessed" | "received";

const detailsSchema = z.object({
  description: z.string().trim().max(1000).optional(),
  first_name: z.string().trim().max(60).optional(),
  email: z
    .string()
    .trim()
    .max(200)
    .refine((v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), "Enter a valid email")
    .optional(),
  video_url: z
    .string()
    .trim()
    .max(500)
    .refine((v) => !v || /^https?:\/\//i.test(v), "Must start with http(s)://")
    .optional(),
});


interface Props {
  onClose?: () => void;
  initialMode?: Mode;
  initialDescription?: string;
  /** Where to go after a successful log. Defaults to the thanks page. */
  redirectTo?: string;
}

export default function ShareActFlow({ onClose, initialMode, initialDescription, redirectTo }: Props) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState<1 | 2>(initialMode ? 2 : 1);
  const [mode, setMode] = useState<Mode | null>(initialMode ?? null);
  const [description, setDescription] = useState(initialDescription ?? "");
  const [firstName, setFirstName] = useState("");
  const [profileDisplayName, setProfileDisplayName] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [photos, setPhotos] = useState<{ file: File; preview: string }[]>([]);
  const [photoConsent, setPhotoConsent] = useState(false);
  const [mediaOpen, setMediaOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

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

  function addPhotos(files: FileList | null) {
    if (!files) return;
    const next = [...photos];
    for (const f of Array.from(files)) {
      if (next.length >= 1) break;
      if (!f.type.startsWith("image/")) continue;
      if (f.size > 5 * 1024 * 1024) {
        toast.error(t.share.uploadError);
        continue;
      }
      next.push({ file: f, preview: URL.createObjectURL(f) });
    }
    setPhotos(next);
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
    if (!mode) return;
    const parsed = detailsSchema.safeParse({
      description,
      first_name: firstName,
      email,
      video_url: videoUrl,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    if (photos.length > 0 && !photoConsent) {
      toast.error(t.share.photoConsentRequired);
      return;
    }
    // Anonymous submitters consent by clicking Submit (disclosure is shown above).

    setSubmitting(true);
    try {
      const photoPaths: string[] = [];
      for (const p of photos) {
        const path = await uploadPhoto(p.file);
        if (path) photoPaths.push(path);
      }

      const trimmedFirstName = firstName.trim();

      const { data, error } = await supabase.functions.invoke("submit-act", {
        body: {
          mode,
          description: description.trim() || undefined,
          first_name: trimmedFirstName || undefined,
          email: email.trim() || undefined,
          video_url: videoUrl.trim() || undefined,
          photo_paths: photoPaths,
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

      // If logged-in user supplied a name and didn't have a display_name, save it.
      if (user && trimmedFirstName && !profileDisplayName) {
        try {
          await supabase
            .from("profiles")
            .update({ display_name: trimmedFirstName })
            .eq("user_id", user.id);
        } catch (err) {
          console.error("profile update failed", err);
        }
      }

      // Log a consent record for this submission (audit trail).
      try {
        await logConsent({
          context: user ? "signup" : "anon_act",
          act_id: data.id,
          user_id: user?.id ?? null,
          email: email.trim() || null,
        });
      } catch (err) {
        console.error("consent log failed", err);
      }

      // If signed-out and email provided: send a magic link.
      //  - Existing account → sign-in link (claims this act on landing).
      //  - New email → sign-up link that creates an account with this display name.
      let postShare: { kind: "check_inbox" | "prefill"; email: string } | null = null;
      const trimmedEmail = email.trim().toLowerCase();
      if (!user && trimmedEmail) {
        try {
          const origin =
            window.location.origin.includes("localhost") || window.location.origin.includes("id-preview--")
              ? "https://kindnessworldwide.lovable.app"
              : window.location.origin;
          // Always allow user creation: if the email is already registered, Supabase
          // sends a sign-in magic link; if not, it sends a sign-up link. We intentionally
          // do not check existence client-side (prevents anonymous email enumeration).
          await supabase.auth.signInWithOtp({
            email: trimmedEmail,
            options: {
              shouldCreateUser: true,
              emailRedirectTo: `${origin}/share/thanks/${data.id}?claim=1`,
              data: trimmedFirstName ? { display_name: trimmedFirstName } : undefined,
            },
          });
          postShare = { kind: "check_inbox", email: trimmedEmail };
        } catch (err) {
          console.error("magic link send failed", err);
        }
      }
      if (postShare) {
        sessionStorage.setItem(`share_post_${data.id}`, JSON.stringify(postShare));
      }

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
            </div>

            {(!user || !profileDisplayName) && (
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
            )}

            {!user && (

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

            <Collapsible open={mediaOpen} onOpenChange={setMediaOpen}>
              <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium text-foreground hover:text-primary transition-colors">
                <ChevronDown
                  size={16}
                  className={`transition-transform ${mediaOpen ? "" : "-rotate-90"}`}
                />
                {t.share.addMedia}
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-6 pt-4">
                <div className="space-y-3">
                  <Label>{t.share.photoLabel}</Label>
                  <div className="flex flex-wrap gap-3">
                    {photos.map((p, i) => (
                      <div key={i} className="relative w-24 h-24 rounded-lg overflow-hidden border">
                        <img src={p.preview} alt="" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => {
                            setPhotos(photos.filter((_, idx) => idx !== i));
                            setPhotoConsent(false);
                          }}
                          className="absolute top-1 end-1 bg-background/90 rounded-full p-0.5 shadow"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                    {photos.length < 1 ? (
                      <label className="w-24 h-24 rounded-lg border-2 border-dashed border-border hover:border-primary flex items-center justify-center cursor-pointer text-muted-foreground hover:text-primary transition-colors">
                        <ImagePlus size={20} />
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => addPhotos(e.target.files)}
                        />
                      </label>
                    ) : null}
                  </div>
                  {photos.length > 0 && (
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

                <div className="space-y-2">
                  <Label htmlFor="video">{t.share.videoLabel}</Label>
                  <Input
                    id="video"
                    type="url"
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    placeholder={t.share.videoPlaceholder}
                    maxLength={500}
                  />
                </div>
              </CollapsibleContent>
            </Collapsible>

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
                t.share.submit
              )}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
