import { describe, expect, it } from "vitest";
import { seasonCountdown, SEASON_END, SEASON_START } from "@/lib/season";
import { formatStaffCode } from "@/lib/session";
import { actsLogged, type Submission } from "@/lib/submissions";

describe("seasonCountdown", () => {
  it("counts down to the season start before Nov 1", () => {
    const cd = seasonCountdown(new Date(SEASON_START.getTime() - (2 * 24 * 60 + 3 * 60 + 5) * 60_000));
    expect(cd).toEqual({ phase: "before", days: 2, hours: 3, minutes: 5 });
  });

  it("counts down to the season end during the season", () => {
    const cd = seasonCountdown(new Date(SEASON_END.getTime() - 61 * 60_000));
    expect(cd.phase).toBe("during");
    expect(cd.days).toBe(0);
    expect(cd.hours).toBe(1);
  });

  it("is over after Jan 31", () => {
    expect(seasonCountdown(new Date(SEASON_END.getTime() + 1000)).phase).toBe("after");
  });
});

describe("formatStaffCode", () => {
  it("groups 8-character IDs as XXXX-XXXX regardless of how they were typed", () => {
    expect(formatStaffCode("7kqm 4rtx")).toBe("7KQM-4RTX");
    expect(formatStaffCode("7KQM-4RTX")).toBe("7KQM-4RTX");
  });
});

describe("actsLogged", () => {
  const row = (people_count: number, status: Submission["status"]) => ({ people_count, status }) as Submission;

  it("sums people across everything except rejected rows", () => {
    expect(actsLogged([row(24, "pending"), row(120, "approved"), row(36, "changes_requested"), row(80, "rejected")])).toBe(180);
  });

  it("is zero with no rows", () => {
    expect(actsLogged(undefined)).toBe(0);
  });
});
