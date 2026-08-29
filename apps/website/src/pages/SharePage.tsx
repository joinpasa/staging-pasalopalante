import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { X } from "lucide-react";
import MinimalFooter from "@/components/MinimalFooter";
import SEO from "@/components/SEO";
import ShareActFlow from "@shared/components/share/ShareActFlow";
import { useLanguage } from "@shared/contexts/LanguageContext";
import { useUI } from "@shared/contexts/UIContext";

function Inner() {
  const { t } = useLanguage();
  const { setShareModalOpen } = useUI();
  const navigate = useNavigate();

  useEffect(() => {
    setShareModalOpen(true);
    return () => setShareModalOpen(false);
  }, [setShareModalOpen]);

  return (
    <main className="relative min-h-screen bg-warm-cream pt-20 pb-24 section-padding">
      <button
        onClick={() => navigate("/")}
        aria-label="Close"
        className="fixed top-6 right-6 z-50 w-11 h-11 rounded-full bg-foreground/5 hover:bg-foreground/10 text-foreground flex items-center justify-center transition-colors"
      >
        <X size={22} />
      </button>
      <div className="max-w-3xl mx-auto text-center mb-10">
        <p className="text-xs uppercase tracking-[0.3em] text-primary font-semibold mb-4">
          {t.share.sectionEyebrow}
        </p>
        <h1 className="headline-xl text-foreground">{t.share.sectionHeading}</h1>
      </div>
      <ShareActFlow onClose={() => navigate("/")} />
    </main>
  );
}

export default function SharePage() {
  return (
    <div className="min-h-screen bg-warm-cream flex flex-col">
      <SEO
        title="Share an Act of Kindness — Pásalo Pa'lante"
        description="Share an act of kindness — given, received, or witnessed — and add a new ripple to the global Pásalo Pa'lante wave."
        path="/share"
      />
      <div className="flex-1">
        <Inner />
      </div>
      <MinimalFooter />
    </div>
  );
}
