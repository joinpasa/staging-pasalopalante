import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { ExternalLink } from "lucide-react";

// Preview-only page (branch preview/awaken-embed) to see how
// awaken.global/kindness looks embedded on our site before deciding
// whether/where to add it for real. Not linked from anywhere.
const AWAKEN_URL = "https://awaken.global/kindness";

export default function AwakenPreviewPage() {
  return (
    <div className="min-h-screen bg-warm-cream">
      <Navbar />
      <main className="pb-16 pt-28">
        <div className="section-padding mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Join the global live broadcast on 11.11.2026</p>
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
        <div className="overflow-hidden border-y border-border bg-white">
          <iframe
            src={AWAKEN_URL}
            title="Awaken — Global Kindness"
            className="block h-[80vh] w-full"
            loading="lazy"
          />
        </div>
      </main>
      <Footer />
    </div>
  );
}
