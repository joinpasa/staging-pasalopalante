import { useSearchParams } from "react-router-dom";
import { CheckCircle2, Heart } from "lucide-react";

import { useLanguage } from "@shared/contexts/LanguageContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import CommitFlow from "@/components/commit/CommitFlow";
import CommitRoles from "@/components/commit/CommitRoles";

function Inner() {
  const { t } = useLanguage();
  const [params] = useSearchParams();
  const sentTo = params.get("sent");

  if (sentTo) {
    return (
      <main className="pt-28 pb-24 section-padding bg-warm-cream min-h-screen">
        <div className="max-w-xl mx-auto text-center bg-card border border-border rounded-2xl p-10 shadow-sm">
          <CheckCircle2 className="mx-auto text-primary mb-4" size={44} />
          <h1 className="font-serif text-3xl text-foreground mb-3">{t.commit.thanks}</h1>
          <p className="text-foreground/70 mb-2">{t.commit.thanksBody}</p>
          <p className="text-sm text-foreground/60 mt-6">
            {t.auth.magicSentBody.replace("{email}", sentTo)}
          </p>
          <div className="mt-6 pt-6 border-t border-border/60 text-left">
            <p className="text-sm font-medium text-foreground mb-1">
              {t.share.checkInboxDidntGet}
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {t.share.checkInboxUsePersonalHelper}
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="pt-28 pb-24 section-padding bg-warm-cream min-h-screen">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-10">
          <Heart className="mx-auto mb-6 text-primary fill-current" size={36} />
          <p className="text-xs uppercase tracking-widest text-primary mb-2">
            {t.navbar.getInvolved}
          </p>
          <h1 className="headline-xl text-foreground mb-3">{t.commit.sectionHeading}</h1>
          <p className="body-lg text-muted-foreground mb-8">{t.commit.sectionBody}</p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-8 md:p-10 shadow-sm">
          <CommitFlow />
        </div>

        <CommitRoles />
      </div>
    </main>
  );
}

export default function CommitPage() {
  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Commit to Kindness — Join the Pásalo Pa'lante Wave"
        description="Pledge an act of kindness and join thousands creating ripples worldwide. Choose your role: Mover, Ambassador, or Leader."
        path="/commit"
      />
      <Navbar />
      <Inner />
      <Footer />
    </div>
  );
}
