import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes, useParams } from "react-router-dom";
import { Loader2 } from "lucide-react";

function WaveRedirect() {
  const { id } = useParams();
  return <Navigate to={`/wave/${id ?? ""}`} replace />;
}
import ErrorBoundary from "@shared/components/ErrorBoundary";
import { Toaster as Sonner } from "@shared/components/ui/sonner";
import { Toaster } from "@shared/components/ui/toaster";
import { TooltipProvider } from "@shared/components/ui/tooltip";
import { AuthProvider } from "@shared/contexts/AuthContext";
import { LanguageProvider } from "@shared/contexts/LanguageContext";
import { UIProvider } from "@shared/contexts/UIContext";
// Index (the homepage) loads eagerly — it's the page nearly every visitor
// lands on first, so a route-split extra network round trip for it would
// cost more than it saves. Every other route is lazy: each becomes its own
// JS chunk that only loads when a visitor actually navigates there, instead
// of every page's code shipping in one bundle on every visit.
import Index from "./pages/Index.tsx";
const NotFound = lazy(() => import("./pages/NotFound.tsx"));
const SharePage = lazy(() => import("./pages/SharePage.tsx"));
const ShareThanks = lazy(() => import("./pages/ShareThanks.tsx"));
const CommitPage = lazy(() => import("./pages/CommitPage.tsx"));
const AuthPage = lazy(() => import("./pages/AuthPage.tsx"));
const ResetPasswordPage = lazy(() => import("./pages/ResetPasswordPage.tsx"));
const AccountPage = lazy(() => import("./pages/AccountPage.tsx"));
const AccountSettingsPage = lazy(() => import("./pages/AccountSettingsPage.tsx"));
const IdeasPage = lazy(() => import("./pages/IdeasPage.tsx"));
const WallPage = lazy(() => import("./pages/WallPage.tsx"));
const MapPage = lazy(() => import("./pages/MapPage.tsx"));
const JoinWavePage = lazy(() => import("./pages/JoinWavePage.tsx"));
const DonatePage = lazy(() => import("./pages/DonatePage.tsx"));
const TermsPage = lazy(() => import("./pages/TermsPage.tsx"));
const PrivacyPage = lazy(() => import("./pages/PrivacyPage.tsx"));
const CommunityGuidelinesPage = lazy(() => import("./pages/CommunityGuidelinesPage.tsx"));
const ContactPage = lazy(() => import("./pages/ContactPage.tsx"));
const AboutPage = lazy(() => import("./pages/AboutPage.tsx"));
// Unlisted — live at these URLs but not linked from the Navbar, Footer, or
// prerendered for SEO (see the /partners and /ambassadors routes below).
// Reachable only by someone who already has the direct link.
const PartnersPage = lazy(() => import("./pages/PartnersPage.tsx"));
const PartnersApplyPage = lazy(() => import("./pages/PartnersApplyPage.tsx"));
const GlobalAmbassadorsPage = lazy(() => import("./pages/GlobalAmbassadorsPage.tsx"));
const ProgramsPage = lazy(() => import("./pages/ProgramsPage.tsx"));
const GetInvolvedPage = lazy(() => import("./pages/GetInvolvedPage.tsx"));
const SchoolsEducatorsPage = lazy(() => import("./pages/SchoolsEducatorsPage.tsx"));
const NonprofitsFaithPage = lazy(() => import("./pages/NonprofitsFaithPage.tsx"));
const AmbassadorsPage = lazy(() => import("./pages/AmbassadorsPage.tsx"));
const MunicipalitiesPage = lazy(() => import("./pages/MunicipalitiesPage.tsx"));
const CompaniesPage = lazy(() => import("./pages/CompaniesPage.tsx"));
import ScrollToTopOnRouteChange from "@shared/components/ScrollToTopOnRouteChange";
import StandaloneHomeRedirect from "./components/StandaloneHomeRedirect";
import CanonicalDomainGate from "./components/CanonicalDomainGate";
import ReconsentGate from "@shared/components/ReconsentGate";
import LanguageSwitcher from "@shared/components/LanguageSwitcher";
import InstallPrompt from "@shared/components/InstallPrompt";
import EmailConfirmGate from "@shared/components/EmailConfirmGate";
import GlobalShareModal from "@shared/components/share/GlobalShareModal";
import { DirectionProvider } from "@radix-ui/react-direction";
import { useLanguage } from "@shared/contexts/LanguageContext";
import { LANGUAGES } from "@shared/i18n/translations";
import type { ReactNode } from "react";


const queryClient = new QueryClient();

/** Keeps Radix primitives (tabs, popovers, selects) in sync with the active language. */
const RadixDirection = ({ children }: { children: ReactNode }) => {
  const { lang } = useLanguage();
  const rtl = LANGUAGES.find((l) => l.code === lang)?.rtl;
  return <DirectionProvider dir={rtl ? "rtl" : "ltr"}>{children}</DirectionProvider>;
};

const SiteWidgets = () => (
  <>
    <LanguageSwitcher />
    <InstallPrompt />
    <GlobalShareModal />
  </>
);

const RouteFallback = () => (
  <div className="flex min-h-screen items-center justify-center">
    <Loader2 className="animate-spin text-primary" size={28} />
  </div>
);


const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <RadixDirection>
        <AuthProvider ghlSource="PPL Website">
          <UIProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
            <ScrollToTopOnRouteChange />
            <StandaloneHomeRedirect />
            <CanonicalDomainGate />
            <EmailConfirmGate />
            <ReconsentGate />
            <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/share" element={<SharePage />} />
              <Route path="/share/thanks/:id" element={<ShareThanks />} />
              <Route path="/commit" element={<CommitPage />} />
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route path="/account" element={<AccountPage />} />
              <Route path="/account/settings" element={<AccountSettingsPage />} />
              <Route path="/ideas" element={<IdeasPage />} />
              <Route path="/wall" element={<WallPage />} />
              <Route path="/map" element={<MapPage />} />
              <Route path="/wave" element={<JoinWavePage />} />
              <Route path="/wave/:id" element={<JoinWavePage />} />
              <Route path="/k/:id" element={<WaveRedirect />} />
              <Route path="/inspiration" element={<Navigate to="/ideas" replace />} />
              <Route path="/donate" element={<DonatePage />} />
              <Route path="/terms" element={<TermsPage />} />
              <Route path="/privacy" element={<PrivacyPage />} />
              <Route path="/community-guidelines" element={<CommunityGuidelinesPage />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="/about" element={<AboutPage />} />
              {/* Unlisted on purpose — live but not linked from the Navbar,
                  Footer, or Explore menu, and left out of the prerender
                  list in scripts/prerender.ts so it isn't surfaced for SEO
                  either. Only reachable by direct URL. */}
              <Route path="/partners" element={<PartnersPage />} />
              <Route path="/partners/apply" element={<PartnersApplyPage />} />
              <Route path="/ambassadors" element={<GlobalAmbassadorsPage />} />
              <Route path="/programs" element={<ProgramsPage />} />
              <Route path="/how-it-works" element={<ProgramsPage />} />
              <Route path="/get-involved" element={<GetInvolvedPage />} />
              <Route path="/get-involved/schools" element={<SchoolsEducatorsPage />} />
              <Route path="/get-involved/nonprofits" element={<NonprofitsFaithPage />} />
              <Route path="/get-involved/ambassadors" element={<AmbassadorsPage />} />
              <Route path="/get-involved/municipalities" element={<MunicipalitiesPage />} />
              <Route path="/get-involved/companies" element={<CompaniesPage />} />
              <Route path="/register" element={<Navigate to="/commit" replace />} />
              <Route path="/volunteer" element={<Navigate to="/commit" replace />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
            </Suspense>
            <SiteWidgets />
          </BrowserRouter>

        </TooltipProvider>
        </UIProvider>
      </AuthProvider>
      </RadixDirection>
    </LanguageProvider>
  </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
