import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import WelcomeCarousel from "@/components/account/WelcomeCarousel";

describe("WelcomeCarousel", () => {
  it("does not crash when lastName/country are null (fresh website signup)", () => {
    expect(() =>
      render(
        <WelcomeCarousel
          firstName={null}
          lastName={null}
          country={null}
          onFinish={() => {}}
        />,
      ),
    ).not.toThrow();
  });
});
