import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import ErrorBoundary from "@shared/components/ErrorBoundary";
import { LangProvider } from "@/lib/i18n";
import { SessionProvider, useSession } from "@/lib/session";
import LoginPage from "@/pages/LoginPage";
import JoinPage from "@/pages/JoinPage";
import LinkPage from "@/pages/LinkPage";
import HomePage from "@/pages/HomePage";
import MapPage from "@/pages/MapPage";
import KitPage from "@/pages/KitPage";
import MePage from "@/pages/MePage";
import ProfileEditPage from "@/pages/ProfileEditPage";
import StoryPage from "@/pages/StoryPage";
import UpdatesPage from "@/pages/UpdatesPage";
import BulkLogPage from "@/pages/BulkLogPage";
import SuccessPage from "@/pages/SuccessPage";
import InvitePage from "@/pages/InvitePage";
import PeoplePage from "@/pages/PeoplePage";
import IdeasPage from "@/pages/IdeasPage";
import OpenJoinPage from "@/pages/OpenJoinPage";

const queryClient = new QueryClient({
  defaultOptions: { queries: { refetchOnWindowFocus: true, staleTime: 15_000 } },
});

function Splash() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white">
      <img src="/kf-heart.webp" alt="" className="h-14 w-14 animate-pulse" />
    </div>
  );
}

function RequireStaff({ children }: { children: ReactNode }) {
  const { status } = useSession();
  if (status === "loading") return <Splash />;
  if (status === "out") return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function GuestOnly({ children }: { children: ReactNode }) {
  const { status } = useSession();
  if (status === "loading") return <Splash />;
  if (status === "in") return <Navigate to="/" replace />;
  return <>{children}</>;
}

/**
 * The Partners Hub (25 Nov 2026), grown out of the partner portal at the same address.
 * Tabs: Home (the feed), Community (members and the map), Ideas, News, Kit, Me; the + makes a
 * post, logs an act or sends us a story. A short tour opens the first time someone comes in.
 * The old addresses (/log, /edit/:id, /bulk, /invite, /done, /join/:token) all still work.
 */
const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <LangProvider>
        <SessionProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<GuestOnly><LoginPage /></GuestOnly>} />
              {/* Not guest-only: it shows the new Kindness ID *after* signing in. */}
              {/* one open link for everyone (26 Nov 2026); /join/:token is a member's own link */}
              <Route path="/join" element={<OpenJoinPage />} />
              <Route path="/join/:token" element={<JoinPage />} />
              <Route path="/link/:token" element={<LinkPage />} />
              <Route path="/" element={<RequireStaff><HomePage /></RequireStaff>} />
              <Route path="/map" element={<RequireStaff><MapPage /></RequireStaff>} />
              <Route path="/people" element={<RequireStaff><PeoplePage /></RequireStaff>} />
              <Route path="/ideas" element={<RequireStaff><IdeasPage /></RequireStaff>} />
              <Route path="/kit" element={<RequireStaff><KitPage /></RequireStaff>} />
              <Route path="/me" element={<RequireStaff><MePage /></RequireStaff>} />
              <Route path="/me/edit" element={<RequireStaff><ProfileEditPage /></RequireStaff>} />
              <Route path="/log" element={<RequireStaff><MePage /></RequireStaff>} />
              <Route path="/edit/:id" element={<RequireStaff><MePage /></RequireStaff>} />
              <Route path="/story" element={<RequireStaff><StoryPage /></RequireStaff>} />
              <Route path="/updates" element={<RequireStaff><UpdatesPage /></RequireStaff>} />
              <Route path="/bulk" element={<RequireStaff><BulkLogPage /></RequireStaff>} />
              <Route path="/invite" element={<RequireStaff><InvitePage /></RequireStaff>} />
              <Route path="/done" element={<RequireStaff><SuccessPage /></RequireStaff>} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </SessionProvider>
      </LangProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
