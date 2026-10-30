import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AppBottomNav from "./AppBottomNav";

const { navigateMock, toastErrorMock } = vi.hoisted(() => ({
  navigateMock: vi.fn(),
  toastErrorMock: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: { error: toastErrorMock },
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

vi.mock("@shared/contexts/AuthContext", () => ({
  useAuth: () => ({ user: null, loading: false }),
}));

vi.mock("@shared/contexts/LanguageContext", () => ({
  useLanguage: () => ({
    t: {
      appNavigation: {
        sections: "Sections",
        home: "Home",
        wall: "Wall",
        map: "Map",
        badges: "Badges",
        shareScan: "Share and Scan",
        shareScanAria: "Share and Scan",
        loginRequired: "{feature} is for logged-in members.",
      },
      appWidgets: {
        logIn: "Log in",
      },
    },
  }),
}));

describe("AppBottomNav", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("blocks signed-out Share and Scan clicks with the login toast", () => {
    render(
      <MemoryRouter>
        <AppBottomNav />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("link", { name: /share and scan/i }));

    expect(toastErrorMock).toHaveBeenCalledWith(
      "Share and Scan is for logged-in members.",
      expect.objectContaining({
        id: "nav-login-required",
      }),
    );
    expect(navigateMock).not.toHaveBeenCalled();
  });
});
