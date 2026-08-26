import { describe, expect, it } from "vitest";
import baseline from "./directional-baseline.json";
import { collectDirectionalUsage } from "./directionalClasses";

/**
 * Guardrail: no *new* physical direction classes (ml/mr/pl/pr/left/right/text-left/right).
 * Use logical utilities instead: ms/me, ps/pe, start/end, text-start/text-end.
 * When you convert a file, re-run and lower its baseline number (or delete the entry).
 */
describe("RTL: physical direction classes", () => {
  const current = collectDirectionalUsage();
  const known = baseline as Record<string, number>;

  it("does not introduce direction classes in new files", () => {
    const newFiles = Object.keys(current).filter((f) => !(f in known));
    expect(newFiles, `Use logical utilities (ms/me, ps/pe, start/end) in: ${newFiles.join(", ")}`).toEqual([]);
  });

  it("does not increase direction classes in existing files", () => {
    const regressions = Object.entries(current)
      .filter(([file, count]) => file in known && count > known[file])
      .map(([file, count]) => `${file}: ${known[file]} -> ${count}`);
    expect(regressions, `RTL regressions:\n${regressions.join("\n")}`).toEqual([]);
  });

  it("keeps the baseline free of stale entries", () => {
    const stale = Object.keys(known).filter((f) => !(f in current));
    expect(stale, `Remove from directional-baseline.json: ${stale.join(", ")}`).toEqual([]);
  });
});
