import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "sonner";
import ErrorBoundary from "@shared/components/ErrorBoundary";
import ItemDrawer from "@/components/ItemDrawer";
import PostPanel from "@/components/PostPanel";
import Shell from "@/components/Shell";
import StoryPanel from "@/components/StoryPanel";
import { HubProvider } from "@/lib/hub";
import CommunityPage from "@/pages/CommunityPage";
import GrowthPage from "@/pages/GrowthPage";
import HomePage from "@/pages/HomePage";
import IdeasPage from "@/pages/IdeasPage";
import InboxPage from "@/pages/InboxPage";
import KitPage from "@/pages/KitPage";
import LibraryPage from "@/pages/LibraryPage";
import PlanPage from "@/pages/PlanPage";
import ReviewPage from "@/pages/ReviewPage";
import SettingsPage from "@/pages/SettingsPage";
import { Gate } from "@/pages/SignInPage";
import SpacePage from "@/pages/SpacePage";
import StoriesPage from "@/pages/StoriesPage";
import { SuggestFormPage } from "@/pages/SuggestionsPage";
import VideosPage from "@/pages/VideosPage";
import NewsletterPage from "@/pages/NewsletterPage";
import { BASE } from "@/lib/base";

const queryClient = new QueryClient({
  defaultOptions: { queries: { refetchOnWindowFocus: false, staleTime: 5_000 } },
});

function Inside() {
  return (
    <Shell>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/inbox" element={<InboxPage />} />
        <Route path="/plan" element={<PlanPage />} />
        <Route path="/stories" element={<StoriesPage />} />
        <Route path="/videos" element={<VideosPage />} />
        <Route path="/newsletter/:id" element={<NewsletterPage />} />
        <Route path="/community" element={<CommunityPage />} />
        <Route path="/growth" element={<GrowthPage />} />
        <Route path="/library" element={<LibraryPage />} />
        <Route path="/ideas" element={<IdeasPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        {/* the addresses the hub used before, so old links still land in the right place */}
        <Route path="/pipeline" element={<Navigate to="/plan?view=board" replace />} />
        <Route path="/calendar" element={<Navigate to="/plan?view=calendar" replace />} />
        <Route path="/posts" element={<Navigate to="/plan?view=posts" replace />} />
        <Route path="/emails" element={<Navigate to="/plan?view=emails" replace />} />
        <Route path="/suggestions" element={<Navigate to="/inbox" replace />} />
        <Route path="/results" element={<Navigate to="/growth?tab=results" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <ItemDrawer />
      <PostPanel />
      <StoryPanel />
    </Shell>
  );
}

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <HubProvider>
        <BrowserRouter basename={BASE.replace(/\/$/, "") || undefined}>
          <Routes>
            {/* these stand alone: plain links for a phone, or for people outside the team */}
            <Route path="/review" element={<Gate><ReviewPage /></Gate>} />
            <Route path="/suggest" element={<SuggestFormPage />} />
            <Route path="/kit" element={<KitPage />} />
            <Route path="/space" element={<SpacePage />} />
            <Route path="/*" element={<Gate><Inside /></Gate>} />
          </Routes>
        </BrowserRouter>
        <Toaster position="bottom-center" toastOptions={{ style: { fontFamily: "Montserrat, sans-serif", fontWeight: 600, borderRadius: 12 } }} />
      </HubProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
