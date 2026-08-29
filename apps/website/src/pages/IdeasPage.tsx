import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ScrollToTop from "@/components/ScrollToTop";
import SEO from "@/components/SEO";
import KindnessIdeas from "@/components/inspiration/KindnessIdeas";
import VolunteerDirectory from "@/components/inspiration/VolunteerDirectory";
import { useLanguage } from "@shared/contexts/LanguageContext";

function Hero() {
  const { t } = useLanguage();
  return (
    <header className="pt-36 pb-4 section-padding bg-warm-cream">
      <div className="max-w-3xl mx-auto text-center">
        <p className="eyebrow">{t.navbar.ideas}</p>
        <h1 className="sr-only">Kindness Ideas — Simple Ways to Spread Kindness Today</h1>
      </div>
    </header>
  );
}

export default function IdeasPage() {
  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Kindness Ideas — Pásalo Pa'lante"
        description="Browse curated kindness ideas you can do today — at home, with strangers, online, or in your community. Pick one and pass it on."
        path="/ideas"
      />
      <Navbar />
      <main>
        <Hero />
        <section id="ideas">
          <KindnessIdeas />
        </section>
        <section id="volunteer">
          <VolunteerDirectory />
        </section>
      </main>
      <Footer />
      <ScrollToTop />
    </div>
  );
}
