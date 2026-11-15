import { describe, expect, it } from "vitest";
import { canSend, pickAudience, scheduleBody, sendAtPR } from "../../../../supabase/functions/hub-ghl/send";

describe("sending a newsletter", () => {
  it("picks people with an email and an included tag, leaving out excluded tags and deletion requests", () => {
    const contacts = [
      { id: "a", email: "a@example.org", tags: ["pledged"] },
      { id: "b", email: "b@example.org", tags: ["Pledged", "pasalo palante"] },
      { id: "c", email: "", tags: ["pledged"] },
      { id: "d", email: "d@example.org", tags: ["pledged", "data deletion requested"] },
      { id: "e", email: "e@example.org", tags: ["champions"] },
      { id: "a", email: "a@example.org", tags: ["pledged"] },
    ];
    expect(pickAudience(contacts, { include: ["pledged"], exclude: ["pasalo palante"] })).toEqual(["a"]);
    expect(pickAudience(contacts, { include: ["pasalo palante"], exclude: [] })).toEqual(["b"]);
  });

  it("writes the send time the way HighLevel wants it, in Puerto Rico time", () => {
    expect(sendAtPR("2026-11-19T15:11:00Z")).toBe("2026-11-19 11:11 AM");
    expect(sendAtPR("2026-11-19T04:30:00Z")).toBe("2026-11-19 12:30 AM");
    expect(sendAtPR("2026-11-19T17:05:00Z")).toBe("2026-11-19 01:05 PM");
  });

  it("only lets an approver send an approved email to a real list at a real time", () => {
    const ok = { role: "approver", stage: "approved", subject: "This week", fromName: "Team", fromEmail: "team@example.org", count: 301, when: "2026-11-19T15:11:00Z", now: Date.parse("2026-11-16T12:00:00Z"), include: ["pledged"] };
    expect(canSend(ok)).toBeNull();
    expect(canSend({ ...ok, role: "member" })).toMatch(/approver/);
    expect(canSend({ ...ok, stage: "review" })).toMatch(/approved/);
    expect(canSend({ ...ok, count: 0 })).toMatch(/Nobody/);
    expect(canSend({ ...ok, when: "2026-11-16T12:02:00Z" })).toMatch(/passed/);
    expect(canSend({ ...ok, when: "now" })).toBeNull();
  });

  it("sends to the tags when nobody is left out, and to an exact list when someone is", () => {
    const base = { when: "2026-11-19T15:11:00Z", userId: "u", userName: "Edith", subject: "S", fromName: "F", fromEmail: "{{business.email}}", previewText: "P", resendHours: 0 };
    const byTag = scheduleBody({ ...base, tagIds: ["t1"] });
    expect(byTag).toMatchObject({ scheduleType: "scheduled", timeZone: "America/Puerto_Rico", recipients: { type: "tag", tagIds: ["t1"] }, scheduleConfig: { sendAt: "2026-11-19 11:11 AM", resend: { enabled: false } } });
    const byList = scheduleBody({ ...base, when: "now", contactIds: ["a", "b"], resendHours: 24, resendSubject: "In case you missed it" });
    expect(byList).toMatchObject({ scheduleType: "immediate", recipients: { type: "contact", contactIds: ["a", "b"] }, scheduleConfig: { resend: { enabled: true, waitHours: 24, subject: "In case you missed it" } } });
    expect((byList.scheduleConfig as Record<string, unknown>).sendAt).toBeUndefined();
  });
});
