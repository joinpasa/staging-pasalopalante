import { describe, expect, it } from "vitest";
import { designText, renderNewsletter, starterDesign } from "@/lib/newsletter";
import type { NewsletterDesign } from "@/lib/types";

// the weekly email of 19 November 2026, as designed in the hub (the plan itself is not in the repository)
const email: { design: NewsletterDesign } = {
  design: {
    subject: {
      en: "This week: thank someone who works with children",
      es: "Esta semana: agradécele a quien trabaja con niños",
    },
    preview: {
      en: "Friday is World Children's Day.",
      es: "El viernes es el Día Mundial de la Infancia.",
    },
    fromName: {
      en: "Team Pass Kindness Forward",
      es: "Pásalo Pa'lante x Te Amo PR",
    },
    fromEmail: { en: "{{business.email}}", es: "team@mg.pasalopalante.com" },
    blocks: [
      {
        id: "e1",
        type: "heading",
        en: "Hi {{contact.first_name}},",
        es: "Hola, {{contact.first_name}}:",
      },
      {
        id: "e2",
        type: "act",
        en: "Thank someone who works with children.",
        es: "Dale las gracias a alguien que trabaja con niños.",
      },
      {
        id: "e3",
        type: "text",
        en: "Friday is World Children's Day. A teacher, a coach, a school cook, a neighbour who keeps an eye on the kids after school. Think of one person, and tell them what they did.",
        es: "El viernes es el Día Mundial de la Infancia. Una maestra, un entrenador, la cocinera de la escuela, el vecino que cuida a los nenes después de clases. Piensa en una persona y dile lo que hizo.",
      },
      {
        id: "e4",
        type: "quote",
        en: "[One real moment from the story bank, with consent on file]",
        es: "[Un momento real del banco de historias, con permiso]",
        who: "",
      },
      {
        id: "e5",
        type: "number",
        value: "More than 1.1 million",
        en: "pledges, recognised by Official World Record.",
        es: "promesas, reconocidas por Official World Record.",
      },
      {
        id: "e6",
        type: "text",
        en: "Your invitation: pass this email to one person who would do it too.",
        es: "Tu invitación: pásale este correo a una persona que también lo haría.",
      },
      {
        id: "e7",
        type: "button",
        en: "Make your pledge",
        es: "Haz tu promesa",
        url: "https://passkindnessforward.com/commit",
        urlEs: "https://pasalopalante.com/commit",
      },
    ],
  },
};

describe("the newsletter designer", () => {
  it("makes the English and Spanish emails with the right logo, sender footer and unsubscribe link", () => {
    const en = renderNewsletter(email.design!, "en");
    const es = renderNewsletter(email.design!, "es");
    expect(en).toContain("6ae37b408201162be97f9ffc.png");
    expect(es).toContain("logo-PPL.png");
    for (const html of [en, es]) {
      expect(html).toContain("{{email.unsubscribe_link}}");
      expect(html).toContain("{{contact.first_name}}");
      expect(html).toContain("font-family:Montserrat,Arial,sans-serif");
    }
    expect(en).toContain("Thank someone who works with children.");
    expect(es).toContain("Dale las gracias a alguien que trabaja con niños.");
    expect(es).toContain(
      "https://pasalopalante.com/commit?utm_source=newsletter&amp;utm_medium=email",
    );
    expect(en).toContain(
      "utm_campaign=this-week-thank-someone-who-works-with-children",
    );
  });

  it("escapes what people type, so a stray bracket cannot break the email", () => {
    const d = starterDesign({
      title: "Test",
      subject: "Hi <b>",
      captionEn: "A & B",
      captionEs: "",
    });
    const html = renderNewsletter(d, "en");
    expect(html).toContain("Hi &lt;b&gt;");
    expect(html).not.toContain("<b>");
  });

  it("keeps the house wording in this week's email", () => {
    for (const lang of ["en", "es"] as const) {
      const words = designText(email.design!, lang);
      expect(words).not.toMatch(/!/);
      expect(words).not.toMatch(/million acts|Guinness/i);
      expect(email.design!.subject[lang].length).toBeLessThanOrEqual(50);
    }
  });
});

describe("tracked links", () => {
  it("tags our own links once, and leaves other sites alone", async () => {
    const { tagged, sourceLabel } = await import("@/lib/links");
    expect(
      tagged("https://passkindnessforward.com/commit", {
        source: "instagram",
        medium: "bio",
      }),
    ).toBe(
      "https://passkindnessforward.com/commit?utm_source=instagram&utm_medium=bio",
    );
    expect(
      tagged("https://passkindnessforward.com/commit?utm_source=x", {
        source: "instagram",
        medium: "bio",
      }),
    ).toBe("https://passkindnessforward.com/commit?utm_source=x");
    expect(
      tagged("https://www.youtube.com/watch?v=1", {
        source: "newsletter",
        medium: "email",
      }),
    ).toBe("https://www.youtube.com/watch?v=1");
    expect(sourceLabel("instagram", "bio")).toBe("Instagram bio link");
    expect(sourceLabel("newsletter", "email")).toBe("Weekly email");
  });
});
