import { useEffect, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { Award, Download, Flame, Share2, Heart, Sparkles } from "lucide-react";
import { toPng } from "html-to-image";
import { toast } from "sonner";

import { useLanguage } from "@shared/contexts/LanguageContext";
import { useAuth } from "@shared/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ShareGraphic from "@shared/components/share/ShareGraphic";
import ShareDialog from "@shared/components/share/ShareDialog";
import ThanksSummary from "@shared/components/share/ThanksSummary";
import CheckInboxCard from "@shared/components/share/CheckInboxCard";
import CommitFlow from "@/components/commit/CommitFlow";
import PledgeCounter from "@/components/commit/PledgeCounter";
import { Button } from "@shared/components/ui/button";
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
  const referralCode = useReferralCode(user?.id);
  const [searchParams, setSearchParams] = useSearchParams();
  const [act, setAct] = useState<Act | null>(null);
  const [loading, setLoading] = useState(true);
  const graphicRef = useRef<HTMLDivElement>(null);
  const [pledgeRefresh, setPledgeRefresh] = useState(0);
  const [postShare, setPostShare] = useState<{ kind: "check_inbox" | "prefill"; email: string } | null>(null);
  const [rewards, setRewards] = useState<{ unlocked_badges?: string[]; type_tag?: string } | null>(null);
  const [shareOpen, setShareOpen] = useState(false);

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

  async function handleDownload() {
    const blob = await generatePng();
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "pasalo-palante.png";
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleShare() {
    setShareOpen(true);
  }

  const shareColumn = (
    <div className="text-center">
      <div className="mb-6 mx-auto max-w-sm">
        {loading ? (
          <div className="aspect-square rounded-2xl bg-card animate-pulse" />
        ) : (
          <ShareGraphic
            ref={graphicRef}
            description={act?.description}
            firstName={act?.first_name}
            mode={act?.mode}
            seed={act?.id}
            photoUrl={
              act?.photo_paths && act.photo_paths.length > 0
                ? publicPhotoUrl(act.photo_paths[0])
                : null
            }
          />
        )}
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button onClick={handleShare} className="!py-5 !px-6">
          <Share2 size={18} /> {t.share.shareButton}
        </Button>
        <Button onClick={handleDownload} variant="outline" className="!py-5 !px-6">
          <Download size={18} /> {t.share.downloadButton}
        </Button>
      </div>
    </div>
  );

  const unlocked = rewards?.unlocked_badges || [];
  const rewardMessages = unlocked.map((badgeId) => {
    if (badgeId === "streak_3") return { icon: <Flame size={22} className="text-primary" />, text: lang === "es" ? "¡Felicidades! Alcanzaste una racha de 3 días." : "Congrats — you hit a 3-day kindness streak." };
    if (badgeId === "streak_7") return { icon: <Flame size={22} className="text-primary" />, text: lang === "es" ? "¡Una semana de bondad seguida! Tu racha de 7 días está activa." : "A full week of kindness — your 7-day streak is active." };
    if (badgeId === "hug_dealer") return { icon: <Award size={22} className="text-primary" />, text: lang === "es" ? "Desbloqueaste Repartidor de Abrazos por registrar 10 abrazos." : "You unlocked Hug Dealer for logging 10 hugs." };
    if (badgeId === "listener") return { icon: <Award size={22} className="text-primary" />, text: lang === "es" ? "Desbloqueaste Escucha Profunda por registrar 10 actos de escucha." : "You unlocked Deep Listener for logging 10 listening acts." };
    return { icon: <Sparkles size={22} className="text-primary" />, text: lang === "es" ? "Gracias por sumar a la ola — desbloqueaste una nueva insignia." : "Thanks for adding to the wave — you unlocked a new badge." };
  });

  const focusColumn = user ? (
    <div className="space-y-5">
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
  ) : postShare?.kind === "check_inbox" && id ? (
    <CheckInboxCard email={postShare.email} actId={id} />
  ) : (
    <div>
      <p className="text-xs uppercase tracking-widest text-primary mb-2">
        {t.share.takeItFurtherEyebrow}
      </p>
      <h2 className="font-display text-3xl md:text-4xl text-foreground mb-4">
        {t.share.takeItFurtherHeading}
      </h2>
      <div className="space-y-3 mb-8 text-foreground/80 text-lg md:text-xl leading-snug">
        {(t.share.takeItFurtherBullets as readonly string[]).map((b, i) => (
          <p key={i}>{b}</p>
        ))}
      </div>
      <CommitFlow
        onSuccess={() => setPledgeRefresh((k) => k + 1)}
        prefilledEmail={postShare?.kind === "prefill" ? postShare.email : undefined}
        onClearPrefilledEmail={() => {
          if (id) sessionStorage.removeItem(`share_post_${id}`);
          setPostShare(null);
        }}
      />
    </div>
  );

  return (
    <main className="pt-28 pb-24 section-padding bg-warm-cream min-h-screen">
      <ShareDialog
        open={shareOpen}
        onOpenChange={setShareOpen}
        getImageBlob={generatePng}
        shareUrl={id ? withReferral(`${siteOrigin()}/wave/${id}`, referralCode) : ""}
        shareText={`${act?.description || t.share.defaultGraphicLine} #PasaloPalante`}
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
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10 md:mb-12">
          <Heart className="mx-auto mb-5 text-primary fill-current" size={32} />
          {/* Mobile heading */}
          <h1 className="headline-xl text-foreground md:hidden">
            {t.share.thanksHeadingShort}
          </h1>
          {/* Desktop heading — single line */}
          <h1 className="hidden md:block headline-xl text-foreground lg:whitespace-nowrap">
            {t.share.thanksHeadingDesktop}
          </h1>
        </div>

        {/* Mobile-only tiny share subhead + share button (image hidden) */}
        <div className="md:hidden text-center mb-8">
          <p className="text-sm text-muted-foreground mb-4">{t.share.shareSubheadSmall}</p>
          <Button onClick={handleShare} className="!py-5 !px-6">
            <Share2 size={18} /> {t.share.shareButton}
          </Button>
        </div>

        {/* Two-column desktop layout; focus first on mobile */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 items-start">
          <div>{focusColumn}</div>
          <div className="hidden md:block">{shareColumn}</div>
        </div>

        <div className="text-center mt-12">
          <Link
            to="/share"
            className="inline-block text-sm font-bold text-primary hover:underline"
          >
            {t.share.shareAnother}
          </Link>
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
