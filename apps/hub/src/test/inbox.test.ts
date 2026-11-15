import { describe, expect, it } from "vitest";
import { channelOf, commentThreads, mapConversation, mapMessages, ownWords, replyRequest } from "../../../../supabase/functions/hub-ghl/inbox";

describe("the Inbox's HighLevel mapping", () => {
  it("files each message type under its channel", () => {
    expect(channelOf("TYPE_EMAIL")).toBe("email");
    expect(channelOf("TYPE_CAMPAIGN_EMAIL")).toBe("email");
    expect(channelOf("TYPE_INSTAGRAM")).toBe("instagram");
    expect(channelOf("TYPE_FACEBOOK")).toBe("facebook");
    expect(channelOf("TYPE_LIVE_CHAT")).toBe("chat");
    expect(channelOf("TYPE_WHATSAPP")).toBe("other");
  });

  it("keeps only what someone wrote in an email, not the newsletter quoted under it", () => {
    const body = "Can I see recording?\n\n\n\n> On Nov 9, 2026, at 12:22 PM, Team Kindness Forward <team@mg.example.org> wrote:\n> Tomorrow: 11.11";
    expect(ownWords(body)).toBe("Can I see recording?");
    expect(ownWords("Thanks [https://example.org/x.png]\nOn Mon, 9 Nov 2026 Kindness Forward wrote:\nold")).toBe("Thanks");
  });

  it("marks a conversation as waiting when the last word is theirs", () => {
    const t = mapConversation({ id: "c1", lastMessageType: "TYPE_INSTAGRAM", lastMessageDirection: "inbound", lastMessageBody: "It was an accidental tag", fullName: "A person", contactId: "k1", lastMessageDate: 1794701704766, unreadCount: 3 }, "https://app.example/v2/location/L");
    expect(t).toMatchObject({ kind: "message", channel: "instagram", waiting: true, contactId: "k1", unread: 3, link: "https://app.example/v2/location/L/conversations/conversations/c1" });
    expect(mapConversation({ id: "c2", lastMessageType: "TYPE_EMAIL", lastMessageDirection: "outbound" }, "x").waiting).toBe(false);
  });

  it("puts a conversation's messages in order and leaves out activity notes", () => {
    const out = mapMessages({ messages: { messages: [
      { id: "2", direction: "outbound", messageType: "TYPE_EMAIL", body: "Here is the link", dateAdded: "2026-11-12T10:00:00Z" },
      { id: "1", direction: "inbound", messageType: "TYPE_EMAIL", body: "Can I see recording?\n> quoted", dateAdded: "2026-11-11T10:00:00Z" },
      { id: "3", direction: "outbound", messageType: "TYPE_ACTIVITY_CONTACT", body: "Contact updated", dateAdded: "2026-11-13T10:00:00Z" },
    ] } });
    expect(out.map((m) => [m.from, m.text])).toEqual([["them", "Can I see recording?"], ["us", "Here is the link"]]);
  });

  it("finds the comments nobody from our accounts has answered, and knows the team", () => {
    const ours = new Set(["17841436921889307", "passkindnessforward"]);
    const posts = [{ _id: "p1", platform: "instagram", content: "13 or B?\n\nLook once", author: { name: "passkindnessforward" }, previewLink: "https://instagram.com/p/x" }];
    const comments = {
      p1: [
        { _id: "a", platform: "instagram", content: "13", author: { id: "1", name: "someone" }, publishedAt: "2026-11-13T14:00:34Z" },
        { _id: "b", platform: "instagram", content: "B", author: { id: "2", name: "another" }, replyCount: 1, publishedAt: "2026-11-13T12:16:50Z" },
        { _id: "c", platform: "instagram", content: "13 or B? Tell us", author: { id: "17841436921889307", name: "passkindnessforward" } },
        { _id: "d", platform: "instagram", content: "So lovely", author: { id: "9", name: "rohini_emanuelsson" } },
      ],
    };
    const replies = { b: [{ _id: "r", author: { id: "17841436921889307", name: "passkindnessforward" }, content: "A B it is" }] };
    const out = commentThreads(posts, comments, replies, ours, new Set(["rohini", "mark"]));
    expect(out.map((t) => [t.id, t.waiting, !!t.team])).toEqual([["a", true, false], ["b", false, false], ["d", false, true]]);
    expect(out[0]).toMatchObject({ kind: "comment", channel: "instagram", post: "13 or B?", link: "https://instagram.com/p/x" });
  });

  it("builds replies the way HighLevel wants them, and refuses what it cannot send", () => {
    expect(replyRequest({ kind: "comment", id: "a", channel: "instagram" }, "Thank you")).toEqual({ path: "/social-media-posting/comments/instagram", body: { parentId: "a", isParentThread: false, content: "Thank you" } });
    expect(replyRequest({ kind: "comment", id: "a", channel: "tiktok" }, "x".repeat(151))).toEqual({ refuse: expect.stringContaining("limit is 150") });
    expect(replyRequest({ kind: "message", id: "m", channel: "instagram", contactId: "k" }, "Hello")).toEqual({ path: "/conversations/messages", body: { type: "IG", contactId: "k", message: "Hello" } });
    const email = replyRequest({ kind: "message", id: "m", channel: "email", contactId: "k", subject: "Your 11:11 reminder" }, "Here it is.\n\nThank you");
    expect(email).toEqual({ path: "/conversations/messages", body: { type: "Email", contactId: "k", subject: "Re: Your 11:11 reminder", html: "<p>Here it is.</p><p>Thank you</p>" } });
    expect(replyRequest({ kind: "message", id: "m", channel: "other", contactId: "k" }, "Hi")).toEqual({ refuse: expect.any(String) });
    expect(replyRequest({ kind: "message", id: "m", channel: "email" }, "Hi")).toEqual({ refuse: expect.stringContaining("reply in HighLevel") });
    expect(replyRequest({ kind: "comment", id: "a", channel: "instagram" }, "   ")).toEqual({ refuse: "Write the reply first." });
  });
});
