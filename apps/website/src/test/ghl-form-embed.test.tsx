import { act, cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import GHLFormEmbed from "@/components/GHLFormEmbed";
import { LanguageProvider } from "@shared/contexts/LanguageContext";

const FORM_ID = "Edsaxkyfgv3WcWT0Ga9O";

function renderForm() {
  window.localStorage.setItem("ppl-lang", "en");
  return render(
    <MemoryRouter>
      <LanguageProvider>
        <GHLFormEmbed formId={FORM_ID} title="Nonprofits form" audience="nonprofits" />
      </LanguageProvider>
    </MemoryRouter>,
  );
}

// Posts a message to the page as if it came from the HighLevel iframe.
function fromFrame(data: unknown) {
  const frame = document.getElementById(FORM_ID) as HTMLIFrameElement;
  act(() => {
    window.dispatchEvent(new MessageEvent("message", { data, source: frame.contentWindow }));
  });
}

describe("GHLFormEmbed thank-you card", () => {
  beforeEach(() => window.localStorage.clear());
  afterEach(cleanup);

  it("shows the form while it is being filled in", () => {
    renderForm();
    fromFrame(`[iFrameSizer]${FORM_ID}:1400:600:init`);
    // A "Next" press saves partial answers; that alone is not a submission.
    fromFrame(["set-sticky-contacts", "_ud", "{}", "loc", "fp"]);
    fromFrame(`[iFrameSizer]${FORM_ID}:1300:600:resizeObserver`);
    expect(screen.queryByText("Thank you for pledging kindness")).toBeNull();
    expect(document.getElementById(FORM_ID)?.parentElement?.className).not.toContain("hidden");
  });

  it("swaps in the branded thank-you once the contact is saved and HighLevel's end message appears", () => {
    renderForm();
    fromFrame(["set-sticky-contacts", "_ud", "{}", "loc", "fp"]);
    fromFrame(`[iFrameSizer]${FORM_ID}:1400:600:size`);
    expect(screen.getByRole("heading", { name: "Thank you for pledging kindness" })).toBeInTheDocument();
    expect(screen.getByText(/Your community is now part of the Kindness Forward movement/)).toBeInTheDocument();
    expect(document.body.textContent).not.toContain("!");
    expect(document.getElementById(FORM_ID)?.parentElement?.className).toContain("hidden");
  });

  it("ignores messages that don't come from its own iframe", () => {
    renderForm();
    act(() => {
      window.dispatchEvent(new MessageEvent("message", { data: ["set-sticky-contacts"], source: window }));
      window.dispatchEvent(new MessageEvent("message", { data: `[iFrameSizer]${FORM_ID}:400:600:size`, source: window }));
    });
    expect(screen.queryByText("Thank you for pledging kindness")).toBeNull();
  });
});
