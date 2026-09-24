import { Outlet } from "react-router-dom";
import AppBottomNav from "@/components/app/AppBottomNav";
import VerificationBanner from "@/components/app/VerificationBanner";
import ProfileBackfill from "@/components/app/ProfileBackfill";

/**
 * Shell for the Pásalo beta app screens: full-width so it fills the actual
 * viewport (a real phone screen is already narrower than the old fixed
 * 448px cap ever was, so nothing changes there) — only capped again at a
 * generous width on very large desktop monitors so it doesn't stretch to
 * an unreadable ~2000px. A fixed 448px cap used to leave a big empty gap
 * on either side any time this was viewed in an ordinary desktop browser
 * window, which read as broken rather than intentional.
 */
export default function AppShell() {
  return (
    <div className="min-h-screen bg-app-canvas">
      {/* 7rem clears the bottom nav's own height PLUS the raised center
          "Share and Scan" button, which pokes ~20px above the flat bar via
          a negative margin — a plain nav-height-sized reservation left the
          last bit of page content (e.g. AppHome's "Part of the movement"
          footer line) hidden behind that raised button on max scroll. */}
      <div className="mx-auto flex min-h-screen w-full flex-col bg-app-canvas pb-[calc(7rem+env(safe-area-inset-bottom))] 2xl:max-w-3xl">
        <ProfileBackfill />
        <VerificationBanner />
        <main className="flex flex-1 flex-col">
          <Outlet />
        </main>
      </div>
      <AppBottomNav />
    </div>
  );
}
