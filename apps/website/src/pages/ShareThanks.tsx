import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Award, Building2, Download, Flame, Heart, Instagram, MessageCircle, Sparkles, Twitter, Users } from "lucide-react";
import { toPng } from "html-to-image";
import { toast } from "sonner";
import schoolImage from "@/assets/getinvolved-build.jpg";
import ambassadorImage from "@/assets/community-5.jpg";

import { useLanguage } from "@shared/contexts/LanguageContext";
import { useAuth } from "@shared/contexts/AuthContext";
import { useUI } from "@shared/contexts/UIContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ShareGraphic from "@shared/components/share/ShareGraphic";
import ShareDialog from "@shared/components/share/ShareDialog";
import KindnessCard from "@shared/components/share/KindnessCard";
import ThanksSummary from "@shared/components/share/ThanksSummary";
import CheckInboxCard from "@shared/components/share/CheckInboxCard";
import { useShareActions } from "@shared/components/share/useShareActions";
import { Button } from "@shared/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@shared/components/ui/dialog";
import { supabase } from "@shared/integrations/supabase/client";
import { useReferralCode } from "@/hooks/useReferralCode";
import { siteOrigin, withReferral } from "@shared/lib/referral";

interface Act {
  id: string;
  description: string | null;
  first_name: string | null;
  mode: string;
  photo_paths: string[] | null;
}

const PUBLIC_BUCKET = "kindness-photos";
function publicPhotoUrl(path: string) {
  return supabase.storage.from(PUBLIC_BUCKET).getPublicUrl(path).data.publicUrl;
}

function Inner() {
  const { id } = useParams<{ id: string }>();
  const { t, lang } = useLanguage();
  const { user } = useAuth();
  const { openShareModal } = useUI();
  const navigate = useNavigate();
  const referralCode = useReferralCode(user?.id);
  const [searchParams, setSearchParams] = useSearchParams();
  const [act, setAct] = useState<Act | null>(null);
  const [loading, setLoading] = useState(true);
  const graphicRef = useRef<HTMLDivElement>(null);
  const [postShare, setPostShare] = useState<{ kind: "check_inbox" | "prefill"; email: string } | null>(null);
  const [rewards, setRewards] = useState<{ unlocked_badges?: string[]; type_tag?: string } | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [showClaim, setShowClaim] = useState(false);
  const [readMoreOpen, setReadMoreOpen] = useState(false);

  useEffect(() => {
    if (!id) return;
    try {
      const raw = sessionStorage.getItem(`share_post_${id}`);
      if (raw) setPostShare(JSON.parse(raw));
      const rewardRaw = sessionStorage.getItem(`share_rewards_${id}`);
      if (rewardRaw) setRewards(JSON.parse(rewardRaw));
    } catch { /* noop */ }
    (async () => {
      const { data } = await supabase
        .from("acts_of_kindness")
        .select("id, description, first_name, mode, photo_paths")
        .eq("id", id)
        .maybeSingle();
      setAct(data);
      setLoading(false);
    })();
  }, [id]);

  // After magic-link sign-in lands here (?claim=1), attach prior anonymous acts.
  useEffect(() => {
    if (!user) return;
    if (searchParams.get("claim") !== "1") return;
    (async () => {
      try {
        const { data } = await supabase.rpc("claim_my_acts");
        if (typeof data === "number" && data > 0) {
          toast.success(t.share.claimedToast);
        }
      } catch (e) {
        console.error("claim_my_acts failed", e);
      } finally {
        // Drop the query param so refresh doesn't re-run.
        searchParams.delete("claim");
        setSearchParams(searchParams, { replace: true });
        if (id) sessionStorage.removeItem(`share_post_${id}`);
      }
    })();
  }, [user, searchParams, setSearchParams, t, id]);

  async function generatePng(): Promise<Blob | null> {
    if (!graphicRef.current) return null;
    const dataUrl = await toPng(graphicRef.current, {
      cacheBust: true,
      pixelRatio: 2,
      backgroundColor: "#ffffff",
    });
    const res = await fetch(dataUrl);
    return await res.blob();
  }

  const shareUrl = id ? withReferral(`${siteOrigin()}/wave/${id}`, referralCode) : "";
  const shareText = `${act?.description || t.share.defaultGraphicLine} #PasaloPalante`;

  const { busy, withBusy, downloadImage, shareInstagram, shareTwitter, shareWhatsApp } = useShareActions({
    getImageBlob: generatePng,
    shareUrl,
    shareText,
    labels: {
      copied: t.share.copied,
      instagramHint: t.share.shareDialog.instagramHint,
      shareFailed: t.share.shareDialog.shareFailed,
    },
  });

  function handleClaimProfile() {
    if (postShare?.kind === "check_inbox") {
      setShowClaim(true);
    } else {
      navigate("/auth");
    }
  }

  const unlocked = rewards?.unlocked_badges || [];
  const rewardMessages = unlocked.map((badgeId) => {
    if (badgeId === "streak_3") return { icon: <Flame size={22} className="text-primary" />, text: lang === "es" ? "¡Felicidades! Alcanzaste una racha de 3 días." : "Congrats — you hit a 3-day kindness streak." };
    if (badgeId === "streak_7") return { icon: <Flame size={22} className="text-primary" />, text: lang === "es" ? "¡Una semana de bondad seguida! Tu racha de 7 días está activa." : "A full week of kindness — your 7-day streak is active." };
    if (badgeId === "hug_dealer") return { icon: <Award size={22} className="text-primary" />, text: lang === "es" ? "Desbloqueaste Repartidor de Abrazos por registrar 10 abrazos." : "You unlocked Hug Dealer for logging 10 hugs." };
    if (badgeId === "listener") return { icon: <Award size={22} className="text-primary" />, text: lang === "es" ? "Desbloqueaste Escucha Profunda por registrar 10 actos de escucha." : "You unlocked Deep Listener for logging 10 listening acts." };
    return { icon: <Sparkles size={22} className="text-primary" />, text: lang === "es" ? "Gracias por sumar a la ola — desbloqueaste una nueva insignia." : "Thanks for adding to the wave — you unlocked a new badge." };
  });

  const photoUrl =
    act?.photo_paths && act.photo_paths.length > 0 ? publicPhotoUrl(act.photo_paths[0]) : null;

  return (
    <main className="pt-28 pb-24 section-padding bg-warm-cream min-h-screen">
      <ShareDialog
        open={shareOpen}
        onOpenChange={setShareOpen}
        getImageBlob={generatePng}
        shareUrl={shareUrl}
        shareText={shareText}
        title={t.share.shareDialog.title}
        description={t.share.shareDialog.description}
        helperText={t.share.shareDialog.helper}
        labels={{
          nativeShare: t.share.shareDialog.nativeShare,
          facebook: t.share.shareDialog.facebook,
          twitter: t.share.shareDialog.twitter,
          whatsapp: t.share.shareDialog.whatsapp,
          linkedin: t.share.shareDialog.linkedin,
          instagram: t.share.shareDialog.instagram,
          copyLink: t.share.shareDialog.copyLink,
          download: t.share.shareDialog.download,
          copied: t.share.copied,
          instagramHint: t.share.shareDialog.instagramHint,
          shareFailed: t.share.shareDialog.shareFailed,
        }}
      />

      <Dialog open={readMoreOpen} onOpenChange={setReadMoreOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t.share.readFullStory}</DialogTitle>
          </DialogHeader>
          <p className="whitespace-pre-wrap text-foreground/90 leading-relaxed">{act?.description}</p>
        </DialogContent>
      </Dialog>

      {/* Off-screen graphic — powers the Download button only, never shown. */}
      <div
        aria-hidden
        style={{ position: "fixed", left: -10000, top: 0, width: 540, pointerEvents: "none", opacity: 0 }}
      >
        <ShareGraphic
          ref={graphicRef}
          description={act?.description}
          firstName={act?.first_name}
          mode={act?.mode}
          seed={act?.id}
          photoUrl={photoUrl}
        />
      </div>

      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10 md:mb-12">
          <Heart className="mx-auto mb-5 text-primary fill-current" size={32} />
          <h1 className="headline-xl text-foreground">{t.share.thanksHeadingDesktop}</h1>
        </div>

        {/* Stage 1 */}
        <p className="text-xs uppercase tracking-widest text-primary font-semibold mb-2">
          {t.share.thanksStageOneEyebrow}
        </p>
        <h2 className="headline-lg text-foreground mb-8">{t.share.thanksStageOneHeading}</h2>

        {user && (
          <div className="mb-8 space-y-3">
            {rewardMessages.length > 0 && (
              <div className="bg-card border border-primary/20 rounded-2xl p-5 shadow-sm space-y-3">
                {rewardMessages.map((item, i) => (
                  <div key={i} className="flex items-center gap-3 text-foreground">
                    <div className="w-10 h-10 rounded-full bg-primary/10 grid place-items-center shrink-0">{item.icon}</div>
                    <p className="font-medium leading-snug">{item.text}</p>
                  </div>
                ))}
              </div>
            )}
            <ThanksSummary userId={user.id} email={user.email || ""} />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 items-start mb-8">
          {/* Step 1: share card */}
          <div>
            <p className="text-sm font-semibold text-foreground/70 mb-4">{t.share.thanksStepOneEyebrow}</p>
            <div className="max-w-sm">
              {loading ? (
                <div className="aspect-square rounded-2xl bg-card animate-pulse" />
              ) : (
                <KindnessCard
                  variant="minimal"
                  showModeEyebrow
                  description={act?.description}
                  firstName={act?.first_name}
                  mode={act?.mode}
                  photoUrl={photoUrl}
                  seed={act?.id}
                  onReadMore={() => setReadMoreOpen(true)}
                />
              )}
            </div>
          </div>

          {/* Step 2: pass it forward */}
          <div>
            <p className="text-sm font-semibold text-foreground/70 mb-2">{t.share.thanksStepTwoEyebrow}</p>
            <p className="text-foreground/80 mb-5">{t.share.thanksStepTwoBody}</p>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                disabled={busy === "whatsapp"}
                onClick={() => withBusy("whatsapp", shareWhatsApp)}
                className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white bg-[#25D366] hover:opacity-90 transition-opacity disabled:opacity-60"
              >
                <MessageCircle size={16} /> {t.share.shareDialog.whatsapp}
              </button>
              <button
                type="button"
                disabled={busy === "instagram"}
                onClick={() => withBusy("instagram", shareInstagram)}
                className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-tr from-amber-400 via-pink-500 to-purple-600 hover:opacity-90 transition-opacity disabled:opacity-60"
              >
                <Instagram size={16} /> {t.share.shareDialog.instagram}
              </button>
              <button
                type="button"
                disabled={busy === "twitter"}
                onClick={() => withBusy("twitter", shareTwitter)}
                className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white bg-black hover:opacity-90 transition-opacity disabled:opacity-60"
              >
                <Twitter size={16} /> {t.share.shareDialog.twitterShort}
              </button>
              <button
                type="button"
                disabled={busy === "download"}
                onClick={() => withBusy("download", downloadImage)}
                className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-primary-foreground bg-primary hover:bg-primary/90 transition-colors disabled:opacity-60"
              >
                <Download size={16} /> {t.share.shareDialog.downloadShort}
              </button>
            </div>
            <button
              type="button"
              onClick={() => setShareOpen(true)}
              className="mt-3 text-sm text-muted-foreground hover:text-foreground underline underline-offset-2"
            >
              {t.share.thanksMoreOptions}
            </button>
          </div>
        </div>

        {/* Share another / claim profile row */}
        <div className="bg-background rounded-2xl border border-border p-6 mb-16">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <Button onClick={() => openShareModal()}>{t.share.shareAnother}</Button>
            {!showClaim && (
              user ? (
                <Link to="/account" className="text-sm font-bold text-primary hover:underline">
                  {t.share.viewProfileCta}
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={handleClaimProfile}
                  className="text-sm font-bold text-primary hover:underline"
                >
                  {t.share.claimProfilePrompt} {t.share.claimProfileCta}
                </button>
              )
            )}
          </div>
          {showClaim && postShare && id && (
            <div className="mt-5">
              <CheckInboxCard email={postShare.email} actId={id} />
            </div>
          )}
        </div>

        {/* Stage 2 */}
        <div className="flex items-center gap-4 mb-3">
          <span className="inline-flex items-center rounded-full bg-cyan-900 px-4 py-1.5 text-[11.5px] font-bold uppercase tracking-[0.18em] text-warm-cream">
            {t.share.thanksStageTwoEyebrow}
          </span>
          <span className="h-px flex-1 bg-border" />
        </div>
        <h2 className="headline-lg text-foreground mb-3">{t.share.thanksStageTwoHeading}</h2>
        <p className="text-foreground/70 text-lg md:text-xl leading-relaxed max-w-[62ch] mb-8 md:mb-12">
          {t.share.thanksStageTwoBody}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-8">
          {/* Bring To School or Workplace */}
          <div className="flex flex-col overflow-hidden rounded-[22px] bg-card">
            <img
              src={schoolImage}
              alt=""
              className="h-[180px] md:h-[230px] w-full object-cover object-top"
            />
            <div className="flex flex-1 flex-col p-7 md:p-9">
              <div className="mb-[18px] grid h-12 w-12 place-items-center rounded-xl bg-primary/10">
                <Building2 size={22} className="text-primary" strokeWidth={1.9} />
              </div>
              <h3 className="font-display text-2xl md:text-3xl leading-tight text-foreground mb-2.5">
                {t.share.thanksSchoolTitle}
              </h3>
              <p className="flex-1 text-base md:text-[16.5px] leading-relaxed text-muted-foreground mb-7">
                {t.share.thanksSchoolBody}
              </p>
              <Button asChild className="self-start rounded-full px-7 py-6 text-[15.5px]">
                <Link to="/contact">{t.share.thanksSchoolCta}</Link>
              </Button>
            </div>
          </div>

          {/* Become an Ambassador */}
          <div className="flex flex-col overflow-hidden rounded-[22px] bg-card">
            <img
              src={ambassadorImage}
              alt=""
              className="h-[180px] md:h-[230px] w-full object-cover object-top"
            />
            <div className="flex flex-1 flex-col p-7 md:p-9">
              <div className="mb-[18px] grid h-12 w-12 place-items-center rounded-xl bg-cyan-900/10">
                <Users size={22} className="text-cyan-900" strokeWidth={1.9} />
              </div>
              <h3 className="font-display text-2xl md:text-3xl leading-tight text-foreground mb-2.5">
                {t.share.thanksAmbassadorTitle}
              </h3>
              <p className="flex-1 text-base md:text-[16.5px] leading-relaxed text-muted-foreground mb-7">
                {t.share.thanksAmbassadorBody}
              </p>
              <Button
                asChild
                variant="outline"
                className="self-start rounded-full border-2 border-cyan-900 px-7 py-6 text-[15.5px] text-cyan-900 hover:bg-cyan-900/5"
              >
                <Link to="/commit">{t.share.thanksAmbassadorCta}</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function ShareThanks() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <Inner />
      <Footer />
    </div>
  );
}
