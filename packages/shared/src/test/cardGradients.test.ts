import { describe, it, expect } from "vitest";
import { CARD_GRADIENTS, pickCardGradient } from "@shared/lib/cardGradients";

describe("pickCardGradient", () => {
  it("always returns one of the gradients, for any id", () => {
    // Some ids used to hash to a negative index and return undefined,
    // leaving Wall cards with no background.
    for (let i = 0; i < 2000; i++) {
      const id = `${i.toString(16)}-4a2b-9c3d-${(i * 7919).toString(16)}`;
      expect(CARD_GRADIENTS).toContain(pickCardGradient(id));
    }
    expect(CARD_GRADIENTS).toContain(pickCardGradient(null));
  });
});
