import { Outlet } from "react-router-dom";
import AppBottomNav from "@/components/app/AppBottomNav";
import VerificationBanner from "@/components/app/VerificationBanner";

/**
 * Phone-shaped shell for the Pásalo beta app screens: a centred column with a
 * fixed tab bar, so the experience matches the installed home-screen app.
 */
export default function AppShell() {
  return (
    <div className="min-h-screen bg-app-canvas">
      <div className="mx-auto flex min-h-screen max-w-md flex-col bg-app-canvas pb-[calc(4.25rem+env(safe-area-inset-bottom))]">
        <VerificationBanner />
        <main className="flex flex-1 flex-col">
          <Outlet />
        </main>
      </div>
      <AppBottomNav />
    </div>
  );
}
