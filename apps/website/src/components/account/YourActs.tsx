import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { toPng } from "html-to-image";
import { supabase } from "@shared/integrations/supabase/client";
import { useLanguage } from "@shared/contexts/LanguageContext";
import { Button } from "@shared/components/ui/button";
import { Skeleton } from "@shared/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@shared/components/ui/tabs";
import { Trash2, Heart, Share2 } from "lucide-react";
import { toast } from "sonner";
import ShareGraphic from "@shared/components/share/ShareGraphic";
import ShareDialog from "@shared/components/share/ShareDialog";
import { useReferralCode } from "@/hooks/useReferralCode";
import { siteOrigin, withReferral } from "@shared/lib/referral";

interface Act {
  id: string;
  description: string | null;
  mode: string;
  type_tag: string | null;
  created_at: string;
  status: string;
  reaction_count: number;
  first_name: string | null;
  photo_paths: string[] | null;
}

type Mode = "all" | "performed" | "received" | "witnessed";

const PUBLIC_BUCKET = "kindness-photos";
function publicPhotoUrl(path: string) {
  return supabase.storage.from(PUBLIC_BUCKET).getPublicUrl(path).data.publicUrl;
}

const YourActs = ({ userId }: { userId: string }) => {
  const { t, lang } = useLanguage();
  const referralCode = useReferralCode(userId);
  const [acts, setActs] = useState<Act[] | null>(null);
  const [mode, setMode] = useState<Mode>("all");
  const [shareAct, setShareAct] = useState<Act | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const graphicRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    const { data } = await supabase
      .from("acts_of_kindness")
      .select("id, description, mode, type_tag, created_at, status, first_name, photo_paths")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(60);
    const rows = (data as Omit<Act, "reaction_count">[]) || [];
    const ids = rows.map((r) => r.id);
    const counts: Record<string, number> = {};
    if (ids.length) {
      const { data: rx } = await supabase.rpc("reaction_counts", { _act_ids: ids });
      (rx ?? []).forEach((r: { act_id: string; count: number }) => {
        counts[r.act_id] = Number(r.count) || 0;
      });
    }
    setActs(rows.map((r) => ({ ...r, reaction_count: counts[r.id] ?? 0 })));
  };

  useEffect(() => { load(); }, [userId]);

  const remove = async (id: string) => {
    if (!confirm(t.account.confirmDeleteAct)) return;
    const { error } = await supabase.from("acts_of_kindness").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success(t.account.deleted);
      load();
    }
  };

  const openShare = (act: Act) => {
    setShareAct(act);
    setShareOpen(true);
  };

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

  const filtered = (acts ?? []).filter((a) => mode === "all" || a.mode === mode);
  const total = acts?.length ?? 0;

  const modeLabel = (m: string) => {
    const key = `mode${m.charAt(0).toUpperCase()}${m.slice(1)}` as keyof typeof t.share;
    return (t.share[key] as string) ?? m;
  };

  const sharePhotoUrl =
    shareAct?.photo_paths && shareAct.photo_paths.length > 0
      ? publicPhotoUrl(shareAct.photo_paths[0])
      : null;

  return (
    <section className="bg-background border border-border rounded-2xl p-6 md:p-8">
      <div className="flex items-baseline justify-between flex-wrap gap-3 mb-6">
        <h2 className="font-serif text-2xl">
          {t.account.actsHeading.replace("{count}", String(total))}
        </h2>
        <Link to="/share" className="text-sm text-terracotta hover:underline">
          + {t.account.logAnother}
        </Link>
      </div>

      <Tabs value={mode} onValueChange={(v) => setMode(v as Mode)} className="w-full mb-6">
        <TabsList className="grid grid-cols-4 w-full max-w-md">
          <TabsTrigger value="all">{lang === "es" ? "Todos" : "All"}</TabsTrigger>
          <TabsTrigger value="performed">{t.inspiration.tabGiven}</TabsTrigger>
          <TabsTrigger value="received">{t.inspiration.tabReceived}</TabsTrigger>
          <TabsTrigger value="witnessed">{t.inspiration.tabSeen}</TabsTrigger>
        </TabsList>
        <TabsContent value={mode} className="mt-0" />
      </Tabs>

      {acts === null ? (
        <div className="grid md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-foreground/60 mb-4">{t.account.emptyActs}</p>
          <Button asChild><Link to="/share">{t.share.sectionCta}</Link></Button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((a) => {
            const hasText = !!(a.description && a.description.trim());
            const displayText = hasText
              ? a.description
              : (t.account.emptyAct as Record<string, string>)[a.mode] ?? "—";
            return (
            <div key={a.id} className="border border-border rounded-xl p-4 group relative">
              {mode === "all" && (
                <div className="text-xs uppercase tracking-wide text-foreground/50 mb-2">
                  {modeLabel(a.mode)}
                </div>
              )}
              <p className={`text-sm line-clamp-3 ${hasText ? "text-foreground/80" : "text-foreground/60 italic"}`}>{displayText}</p>
              <div className="flex items-center justify-between mt-3 text-xs text-foreground/50">
                <span>{new Date(a.created_at).toLocaleDateString(lang === "es" ? "es" : "en")}</span>
                <div className="inline-flex items-center gap-3">
                  <span className="inline-flex items-center gap-1 text-primary">
                    <Heart size={12} className={a.reaction_count > 0 ? "fill-current" : ""} />
                    {a.reaction_count}
                  </span>
                  {hasText && (
                    <button
                      onClick={() => openShare(a)}
                      aria-label={t.share.shareButton}
                      className="inline-flex items-center gap-1 text-foreground/60 hover:text-primary transition-colors"
                    >
                      <Share2 size={13} />
                      <span className="hidden sm:inline">{t.share.shareButton}</span>
                    </button>
                  )}
                </div>
              </div>
              <button
                onClick={() => remove(a.id)}
                aria-label={t.account.deleted}
                className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded hover:bg-muted"
              >
                <Trash2 size={14} />
              </button>
            </div>
            );
          })}
        </div>
      )}

      {/* Off-screen graphic for PNG export */}
      {shareAct && (
        <div
          aria-hidden
          style={{
            position: "fixed",
            left: -10000,
            top: 0,
            width: 540,
            pointerEvents: "none",
            opacity: 0,
          }}
        >
          <ShareGraphic
            ref={graphicRef}
            description={shareAct.description}
            firstName={shareAct.first_name}
            mode={shareAct.mode}
            seed={shareAct.id}
            photoUrl={sharePhotoUrl}
          />
        </div>
      )}

      <ShareDialog
        open={shareOpen}
        onOpenChange={(o) => {
          setShareOpen(o);
          if (!o) setShareAct(null);
        }}
        getImageBlob={generatePng}
        shareUrl={withReferral(`${siteOrigin()}/wave/${shareAct?.id ?? ""}`, referralCode)}
        shareText={`${shareAct?.description || t.share.defaultGraphicLine} #PasaloPalante`}
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
    </section>
  );
};

export default YourActs;
