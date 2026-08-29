import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import WaveForwardArrow from "@shared/components/icons/WaveForwardArrow";

import { useLanguage } from "@shared/contexts/LanguageContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import KindnessCard from "@shared/components/share/KindnessCard";
import CommitFlow from "@/components/commit/CommitFlow";
import CommitRoles from "@/components/commit/CommitRoles";
import { supabase } from "@shared/integrations/supabase/client";
import { getStoredReferral } from "@shared/lib/referral";

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
  const { t } = useLanguage();
  const [act, setAct] = useState<Act | null>(null);
  const [loading, setLoading] = useState(true);
  const [inviterName, setInviterName] = useState<string | null>(null);

  useEffect(() => {
    const code =
      new URLSearchParams(window.location.search).get("r")?.trim() ||
      getStoredReferral();
    if (!code) return;
    (async () => {
      const { data } = await supabase.rpc("referrer_display_name", { code });
      if (typeof data === "string" && data.trim()) setInviterName(data.trim());
    })();
  }, []);

  useEffect(() => {
    if (!id) {
      setAct(null);
      setLoading(false);
      return;
    }
    (async () => {
      const { data } = await supabase
        .from("acts_of_kindness")
        .select("id, description, first_name, mode, photo_paths")
        .eq("id", id)
        .eq("status", "published")
        .maybeSingle();
      setAct((data as Act) || null);
      setLoading(false);
    })();
  }, [id]);

  const photoUrl =
    act?.photo_paths && act.photo_paths.length > 0
      ? publicPhotoUrl(act.photo_paths[0])
      : null;

  return (
    <main className="pt-28 pb-24 section-padding bg-warm-cream min-h-screen">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10 md:mb-12">
          <WaveForwardArrow className="mx-auto mb-5 text-primary" size={40} />
          <p className="text-xs uppercase tracking-widest text-primary mb-2">
            {inviterName
              ? t.joinWave.invitedEyebrow.replace("{name}", inviterName)
              : t.joinWave.eyebrow}
          </p>
          <h1 className="headline-xl text-foreground mb-4">{t.joinWave.heading}</h1>
          <p className="body-lg text-muted-foreground max-w-2xl mx-auto">
            {inviterName
              ? t.joinWave.invitedIntro.split("{name}").join(inviterName)
              : t.joinWave.intro}
          </p>
        </div>

        {/* Two-column */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 items-start">
          {/* Featured act */}
          <div>
            {loading ? (
              <div className="aspect-square rounded-2xl bg-card animate-pulse" />
            ) : act ? (
              <div className="mx-auto max-w-md">
                <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3 text-center">
                  {t.joinWave.featuredEyebrow}{" "}
                  <span className="text-foreground font-semibold">
                    {act.first_name || t.inspiration.anonymous}
                  </span>
                </p>
                <KindnessCard
                  variant="branded"
                  description={act.description}
                  firstName={act.first_name}
                  mode={act.mode}
                  seed={act.id}
                  photoUrl={photoUrl}
                />
              </div>
            ) : (
              <div className="mx-auto max-w-md">
                <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3 text-center">
                  {t.joinWave.genericEyebrow}
                </p>
                <KindnessCard
                  variant="branded"
                  description={t.joinWave.genericCardText}
                  firstName={t.joinWave.genericCardName}
                  mode={null}
                  seed="pasalo-generic"
                  photoUrl={null}
                />
              </div>
            )}

          </div>

          {/* Right: commit */}
          <div>
            <p className="text-xs uppercase tracking-widest text-primary mb-2">
              {t.joinWave.nextStepEyebrow}
            </p>
            <h2 className="font-display text-3xl md:text-4xl text-foreground mb-3">
              {t.joinWave.nextStepHeading}
            </h2>
            <p className="text-foreground/80 text-lg mb-6 leading-snug">
              {t.joinWave.nextStepBody}
            </p>

            <p className="text-sm text-muted-foreground mb-4">
              {t.joinWave.orShare}{" "}
              <Link to="/share" className="text-primary font-bold hover:underline">
                {t.joinWave.shareCta} →
              </Link>
            </p>

            <div className="bg-card border border-border rounded-2xl p-6 md:p-8 shadow-sm">
              <CommitFlow />
            </div>
          </div>
        </div>

        {/* Lower content: roles & what you get */}
        <CommitRoles />
      </div>
    </main>
  );
}

export default function JoinWavePage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <Inner />
      <Footer />
    </div>
  );
}
