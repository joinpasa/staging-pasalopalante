import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ScrollToTop from "@/components/ScrollToTop";
import SEO from "@/components/SEO";
import { useLanguage } from "@shared/contexts/LanguageContext";

export default function CommunityGuidelinesPage() {
  const { t } = useLanguage();
  const tx = t.guidelinesPage;

  return (
    <div className="min-h-screen bg-warm-cream">
      <SEO
        title="Community Guidelines — Kindness Forward"
        description="Our community guidelines help keep Pásalo Pa'lante a safe, welcoming, and respectful space for sharing acts of kindness."
        path="/community-guidelines"
      />
      <Navbar />
      <main className="pt-32 pb-20 section-padding">
        <article className="max-w-3xl mx-auto">
          <header className="mb-10 text-center">
            <p className="eyebrow">Pásalo Pa'lante</p>
            <h1 className="headline-xl text-foreground mt-3">
              {tx.communityGuidelines}
            </h1>
            <p className="text-sm text-foreground/60 mt-3">
              {tx.version}
            </p>
          </header>

          <section className="space-y-5 text-foreground/85 leading-relaxed text-base md:text-lg">
            <p>
              {tx.intro}
            </p>

            <h2 className="font-display text-2xl text-foreground mt-8">
              {tx.beReal}
            </h2>
            <p>
              {tx.shareGenuineActsOf}
            </p>

            <h2 className="font-display text-2xl text-foreground mt-8">
              {tx.beRespectful}
            </h2>
            <p>
              {tx.donTPostContent}
            </p>

            <h2 className="font-display text-2xl text-foreground mt-8">
              {tx.protectOthersPrivacy}
            </h2>
            <p>
              {tx.ifSomeoneIsIdentifiable}
            </p>

            <h2 className="font-display text-2xl text-foreground mt-8">
              {tx.stayOnTopic}
            </h2>
            <p>
              {tx.thisPlatformIsFor}
            </p>

            <h2 className="font-display text-2xl text-foreground mt-8">
              {tx.minimumAge}
            </h2>
            <p>
              {tx.youMustBeAt}
            </p>

            <h2 className="font-display text-2xl text-foreground mt-8">
              {tx.enforcement}
            </h2>
            <p>
              {tx.weMayRemoveContent}
              <a href="mailto:info@passkindnessforward.com" className="text-warm-sky underline">info@passkindnessforward.com</a>.
            </p>

            <h2 className="font-display text-2xl text-foreground mt-8">
              {tx.reportContent}
            </h2>
            <p>
              {tx.ifYouSeeSomething}
              <a href="mailto:info@passkindnessforward.com" className="text-warm-sky underline">info@passkindnessforward.com</a>
              {tx.withALinkAnd}
            </p>

            <p className="text-sm text-foreground/60 mt-10">
              {tx.footerNote}
            </p>
          </section>
        </article>
      </main>
      <Footer />
      <ScrollToTop />
    </div>
  );
}
