import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ScrollToTop from "@/components/ScrollToTop";
import SEO from "@/components/SEO";
import { useLanguage } from "@shared/contexts/LanguageContext";
import { useUI } from "@shared/contexts/UIContext";
import { Link } from "react-router-dom";

export default function AboutPage() {
  const { t } = useLanguage();
  const { openShareModal } = useUI();
  const tx = t.aboutPage;

  return (
    <div className="min-h-screen bg-warm-cream">
      <SEO
        title="About Kindness Forward — A Global Kindness Movement by Te Amo PR"
        description="Learn about Pásalo Pa'lante, a global kindness movement created by Te Amo PR — a U.S. 501(c)(3) nonprofit based in Puerto Rico."
        path="/about"
        schema={{
          "@context": "https://schema.org",
          "@type": "NGO",
          name: "Pásalo Pa'lante",
          url: "https://pasalopalante.com",
          description: "Puerto Rico's kindness movement, which set a record of 1,135,096 acts of kindness in 5 days in November 2025.",
          areaServed: "Puerto Rico",
          parentOrganization: {
            "@type": "NGO",
            name: "Te Amo PR",
            taxID: "66-0975633",
            address: "550 Av. de la Constitución #905, San Juan, PR",
            url: "https://teamopr.org",
          },
        }}
      />
      <Navbar />
      <main className="pt-32 pb-20 section-padding">
        <article className="max-w-3xl mx-auto">
          <p className="eyebrow">Pásalo Pa'lante</p>
          <h1 className="headline-xl text-foreground mt-3 mb-6">
            {tx.title}
          </h1>

          <div className="prose prose-lg max-w-none text-foreground/80 space-y-6 leading-relaxed">
            <p>
              {tx.intro}
            </p>

            <h2 className="font-serif text-2xl text-foreground mt-10 mb-3">
              {tx.whoWeAre}
            </h2>
            <p>
              {tx.whoWeAreBody}
            </p>
            <ul className="list-none pl-0 space-y-1 text-sm bg-warm-cream/60 border border-border rounded-lg p-4">
              <li><strong>{tx.legalOrgLabel}</strong> Te Amo PR</li>
              <li><strong>{tx.statusLabel}</strong> {tx.statusValue}</li>
              <li><strong>EIN:</strong> 66-0975633</li>
              <li><strong>{tx.addressLabel}</strong> 550 Av. de la Constitución #905, San Juan, PR</li>
              <li><strong>{tx.websiteLabel}</strong> <a href="https://teamopr.org" target="_blank" rel="noopener noreferrer" className="text-warm-sky underline">teamopr.org</a></li>
            </ul>

            <h2 className="font-serif text-2xl text-foreground mt-10 mb-3">
              {tx.whatWeDo}
            </h2>
            <p>
              {tx.whatWeDoBody}
            </p>

            <h2 className="font-serif text-2xl text-foreground mt-10 mb-3">
              {tx.howToGetInvolved}
            </h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <Link to="/commit" className="text-warm-sky hover:underline">
                  {tx.commitOrRegisterAs}
                </Link>
              </li>
              <li>
                <button type="button" onClick={() => openShareModal()} className="text-warm-sky hover:underline">
                  {tx.shareAnActOf}
                </button>
              </li>
              <li>
                <Link to="/wall" className="text-warm-sky hover:underline">
                  {tx.visitTheWallOf}
                </Link>
              </li>
              <li>
                <Link to="/donate" className="text-warm-sky hover:underline">
                  {tx.donateToSupportThe}
                </Link>
              </li>
              <li>
                <Link to="/contact" className="text-warm-sky hover:underline">
                  {tx.contactUs}
                </Link>
              </li>
            </ul>

            <h2 className="font-serif text-2xl text-foreground mt-10 mb-3">
              {tx.contact}
            </h2>
            <p>
              Te Amo PR · <a className="text-warm-sky hover:underline" href="mailto:info@passkindnessforward.com">info@passkindnessforward.com</a> · (787) 705-0778 ·{" "}
              <a className="text-warm-sky hover:underline" href="https://teamopr.org" target="_blank" rel="noopener noreferrer">teamopr.org</a>
            </p>
          </div>
        </article>
      </main>
      <Footer />
      <ScrollToTop />
    </div>
  );
}
