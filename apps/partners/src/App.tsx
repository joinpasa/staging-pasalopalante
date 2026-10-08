import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import ErrorBoundary from "@shared/components/ErrorBoundary";
import { LangProvider } from "@/lib/i18n";
import { SessionProvider, useSession } from "@/lib/session";
import LoginPage from "@/pages/LoginPage";
import JoinPage from "@/pages/JoinPage";
import DashboardPage from "@/pages/DashboardPage";
import BulkLogPage from "@/pages/BulkLogPage";
import SuccessPage from "@/pages/SuccessPage";

const queryClient = new QueryClient({
  defaultOptions: { queries: { refetchOnWindowFocus: true, staleTime: 15_000 } },
});

function Splash() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas">
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

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <LangProvider>
        <SessionProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<GuestOnly><LoginPage /></GuestOnly>} />
              {/* Not guest-only: it shows the new Staff ID *after* signing in. */}
              <Route path="/join/:token" element={<JoinPage />} />
              <Route path="/" element={<RequireStaff><DashboardPage /></RequireStaff>} />
              <Route path="/log" element={<RequireStaff><DashboardPage /></RequireStaff>} />
              <Route path="/edit/:id" element={<RequireStaff><DashboardPage /></RequireStaff>} />
              <Route path="/bulk" element={<RequireStaff><BulkLogPage /></RequireStaff>} />
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
