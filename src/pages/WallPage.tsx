import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ScrollToTop from "@/components/ScrollToTop";
import SEO from "@/components/SEO";
import WallOfKindness from "@/components/inspiration/WallOfKindness";

export default function WallPage() {
  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Wall of Kindness — Real Stories of Acts Creating Ripples"
        description="Read real acts of kindness shared by people around the world. Get inspired and add your own story to the global Wall of Kindness."
        path="/wall"
      />
      <Navbar />
      <main className="pt-20">
        <h1 className="sr-only">Wall of Kindness — Stories From the Global Kindness Movement</h1>
        <WallOfKindness />
      </main>
      <Footer />
      <ScrollToTop />
    </div>
  );
}
