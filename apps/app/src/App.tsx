import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import { Toaster as Sonner } from "@shared/components/ui/sonner";
import { Toaster } from "@shared/components/ui/toaster";
import { TooltipProvider } from "@shared/components/ui/tooltip";
import { AuthProvider } from "@shared/contexts/AuthContext";
import { LanguageProvider } from "@shared/contexts/LanguageContext";
import { UIProvider } from "@shared/contexts/UIContext";
import AppShell from "./pages/AppShell.tsx";
import AppHome from "./pages/AppHome.tsx";
import AppWall from "./pages/AppWall.tsx";
import AppPass from "./pages/AppPass.tsx";
import AppMap from "./pages/AppMap.tsx";
import AppBadges from "./pages/AppBadges.tsx";
import AppJoin from "./pages/AppJoin.tsx";
import AppLog from "./pages/AppLog.tsx";
import AppWave from "./pages/AppWave.tsx";
import AppAccount from "./pages/AppAccount.tsx";
import RequireVerified from "@/components/app/RequireVerified";
import ScrollToTopOnRouteChange from "@shared/components/ScrollToTopOnRouteChange";
import ReconsentGate from "@shared/components/ReconsentGate";
import InstallPrompt from "@shared/components/InstallPrompt";
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

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
      <RadixDirection>
      <AuthProvider ghlSource="PPL App">
        <UIProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <ScrollToTopOnRouteChange />
            <ReconsentGate />
            <Routes>
              <Route path="/" element={<AppShell />}>
                <Route index element={<AppHome />} />
                <Route path="wall" element={<AppWall />} />
                <Route path="pass" element={<RequireVerified><AppPass /></RequireVerified>} />
                <Route path="map" element={<RequireVerified><AppMap /></RequireVerified>} />
                <Route path="badges" element={<RequireVerified><AppBadges /></RequireVerified>} />
                <Route path="join" element={<AppJoin />} />
                <Route path="log" element={<RequireVerified><AppLog /></RequireVerified>} />
                {/* Handles its own auth branching (redirects to /join with
                    the code intact if not signed in), so not wrapped in
                    RequireVerified like the routes above. */}
                <Route path="wave" element={<AppWave />} />
                <Route path="account" element={<RequireVerified><AppAccount /></RequireVerified>} />
              </Route>
              {/* No standalone 404 screen in the phone-shaped shell — send
                  anything unmatched back to the app home. */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
            <InstallPrompt />
          </BrowserRouter>

        </TooltipProvider>
        </UIProvider>
      </AuthProvider>
      </RadixDirection>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;
