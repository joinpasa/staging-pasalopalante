import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes, useParams } from "react-router-dom";

function WaveRedirect() {
  const { id } = useParams();
  return <Navigate to={`/wave/${id ?? ""}`} replace />;
}
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { UIProvider } from "@/contexts/UIContext";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import SharePage from "./pages/SharePage.tsx";
import ShareThanks from "./pages/ShareThanks.tsx";
import CommitPage from "./pages/CommitPage.tsx";
import AuthPage from "./pages/AuthPage.tsx";
import AccountPage from "./pages/AccountPage.tsx";
import IdeasPage from "./pages/IdeasPage.tsx";
import WallPage from "./pages/WallPage.tsx";
import MapPage from "./pages/MapPage.tsx";
import JoinWavePage from "./pages/JoinWavePage.tsx";
import DonatePage from "./pages/DonatePage.tsx";
import TermsPage from "./pages/TermsPage.tsx";
import PrivacyPage from "./pages/PrivacyPage.tsx";
import CommunityGuidelinesPage from "./pages/CommunityGuidelinesPage.tsx";
import ContactPage from "./pages/ContactPage.tsx";
import AboutPage from "./pages/AboutPage.tsx";
import ProgramsPage from "./pages/ProgramsPage.tsx";
import GetInvolvedPage from "./pages/GetInvolvedPage.tsx";
import OAuthConsent from "./pages/OAuthConsent.tsx";
import AppShell from "./pages/app/AppShell.tsx";
import AppHome from "./pages/app/AppHome.tsx";
import AppWall from "./pages/app/AppWall.tsx";
import AppPass from "./pages/app/AppPass.tsx";
import AppMap from "./pages/app/AppMap.tsx";
import AppBadges from "./pages/app/AppBadges.tsx";
import AppJoin from "./pages/app/AppJoin.tsx";
import AppLog from "./pages/app/AppLog.tsx";
import ScrollToTopOnRouteChange from "./components/ScrollToTopOnRouteChange";
import StandaloneHomeRedirect from "./components/StandaloneHomeRedirect";
import ReconsentGate from "./components/ReconsentGate";
import LanguageSwitcher from "./components/LanguageSwitcher";
import InstallPrompt from "./components/InstallPrompt";
import { DirectionProvider } from "@radix-ui/react-direction";
import { useLanguage } from "@/contexts/LanguageContext";
import { LANGUAGES } from "@/i18n/translations";
import { useLocation } from "react-router-dom";
import type { ReactNode } from "react";


const queryClient = new QueryClient();

/** Keeps Radix primitives (tabs, popovers, selects) in sync with the active language. */
const RadixDirection = ({ children }: { children: ReactNode }) => {
  const { lang } = useLanguage();
  const rtl = LANGUAGES.find((l) => l.code === lang)?.rtl;
  return <DirectionProvider dir={rtl ? "rtl" : "ltr"}>{children}</DirectionProvider>;
};

/** The installed-app screens carry their own chrome, so hide the language
 *  switcher there. The install prompt is still shown on /app so that people
 *  who arrive by scanning a pass QR (which opens pasalopalante.com/app) get a
 *  download/install popup. */
const SiteWidgets = () => {
  const { pathname } = useLocation();
  const isApp = pathname === "/app" || pathname.startsWith("/app/");
  return (
    <>
      {!isApp && <LanguageSwitcher />}
      <InstallPrompt />
    </>
  );
};


const App = () => (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
      <RadixDirection>
      <AuthProvider>
        <UIProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <ScrollToTopOnRouteChange />
            <StandaloneHomeRedirect />
            <ReconsentGate />
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/share" element={<SharePage />} />
              <Route path="/share/thanks/:id" element={<ShareThanks />} />
              <Route path="/commit" element={<CommitPage />} />
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/account" element={<AccountPage />} />
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
              <Route path="/programs" element={<ProgramsPage />} />
              <Route path="/how-it-works" element={<ProgramsPage />} />
              <Route path="/get-involved" element={<GetInvolvedPage />} />
              <Route path="/app" element={<AppShell />}>
                <Route index element={<AppHome />} />
                <Route path="wall" element={<AppWall />} />
                <Route path="pass" element={<AppPass />} />
                <Route path="map" element={<AppMap />} />
                <Route path="badges" element={<AppBadges />} />
                <Route path="join" element={<AppJoin />} />
                <Route path="log" element={<AppLog />} />
              </Route>
              <Route path="/.lovable/oauth/consent" element={<OAuthConsent />} />
              <Route path="/register" element={<Navigate to="/commit" replace />} />
              <Route path="/volunteer" element={<Navigate to="/commit" replace />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
            <SiteWidgets />
          </BrowserRouter>

        </TooltipProvider>
        </UIProvider>
      </AuthProvider>
      </RadixDirection>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;
