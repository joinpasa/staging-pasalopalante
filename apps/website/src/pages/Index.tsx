import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import LiveFromWall from "@/components/LiveFromWall";
import ImpactTicker from "@/components/ImpactTicker";
import TheStory from "@/components/TheStory";
import HowItWorks from "@/components/HowItWorks";
import AnthemSection from "@/components/AnthemSection";
import ScienceProof from "@/components/ScienceProof";
import GlobalMap from "@/components/GlobalMap";
import Testimonials from "@/components/Testimonials";
import VisualTransition from "@/components/VisualTransition";
import TwoPaths from "@/components/TwoPaths";
import NovemberBand from "@/components/NovemberBand";
import DonateBand from "@/components/DonateBand";

import Footer from "@/components/Footer";
import ScrollToTop from "@/components/ScrollToTop";
import SEO from "@/components/SEO";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Pásalo Pa'lante — Sparking 1 Billion Acts of Kindness Worldwide"
        description="Join Pásalo Pa'lante, a global kindness movement by Te Amo PR. Commit, share, and ripple 1 billion acts of kindness from Nov 1 to Jan 31."
        path="/"
      />
      <Navbar />
      <Hero />
      <LiveFromWall />
      <HowItWorks />
      <AnthemSection />
      <TheStory />
      <ScienceProof />
      <GlobalMap />
      <Testimonials />
      <VisualTransition />
      <TwoPaths />
      
      <DonateBand />
      <Footer />
      <ScrollToTop />
    </div>
  );
};

export default Index;
