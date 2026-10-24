import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import { useLanguage } from "@shared/contexts/LanguageContext";
import { ExternalLink } from "lucide-react";

// /live: the 11.11.2026 global live broadcast, embedded from Awaken's own
// page. Linked from the Explore menu.
const AWAKEN_URL = "https://awaken.global/kindness";
const HIDE_TOP_PX = 85;

export default function LivePage() {
  const { t } = useLanguage();
  return (
    <div className="min-h-screen bg-warm-cream">
      <SEO
        title="Global Live Broadcast — 11.11.2026 | Kindness Forward"
        description="Join the global live kindness broadcast on 11.11.2026, together with Awaken and Pass Kindness Forward."
        path="/live"
      />
      <Navbar />
      <main className="pb-16 pt-28">
        <div className="section-padding mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">{t.navbar.liveBanner}</p>
            <h1 className="text-3xl text-foreground md:text-4xl">Awaken — Global Kindness</h1>
          </div>
          <a
            href={AWAKEN_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-bold text-[#0079A8] hover:underline"
          >
            Open awaken.global/kindness in a new tab
            <ExternalLink size={14} />
          </a>
        </div>
        {/* Awaken's own announcement bar + menu (~85px) are cropped off the
            top: the iframe is pulled up by that much inside a clipping box.
            Their header is sticky, so it stays hidden while scrolling inside
            the embed too. Cross-origin, so cropping is the only option —
            bump HIDE_TOP_PX if their header height changes. */}
        <div className="relative h-[80vh] overflow-hidden border-y border-border bg-white">
          <iframe
            src={AWAKEN_URL}
            title="Awaken — Global Kindness"
            className="absolute inset-x-0 block w-full"
            style={{ top: -HIDE_TOP_PX, height: `calc(100% + ${HIDE_TOP_PX}px)` }}
            loading="lazy"
          />
        </div>
      </main>
      <Footer />
    </div>
  );
}
