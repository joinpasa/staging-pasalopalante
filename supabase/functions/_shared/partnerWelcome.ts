import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { escapeHtml, SENDER_DOMAIN } from "./ops.ts";

/**
 * The Partners Hub welcome email (25 Nov 2026): one email for every new member — organisation,
 * company or ambassador — sent the moment their account exists, in English and Spanish in one
 * message. It carries their invite link (the first sign-in) and explains the email sign-in for
 * next time. Sent through the site's own email queue, so it doesn't depend on HighLevel.
 * Used by sync-partners, sync-ambassador and partner-auth (send_welcome).
 */

export const HUB_URL = "https://partners.passkindnessforward.com";
const LOGO = `${HUB_URL}/hub/kf-logo-2x.png`;
const QUESTIONS = "socials@passkindnessforward.com";

export type MemberKind = "organisation" | "company" | "ambassador";

export function kindOf(orgType: string | null | undefined): MemberKind {
  return orgType === "company" ? "company" : orgType === "ambassador" ? "ambassador" : "organisation";
}

const WORDS: Record<"en" | "es", Record<MemberKind, { space: string; team: string | null }>> = {
  en: {
    organisation: { space: "your organisation's space in the movement", team: "Want your team in too? Share this same link with them, and each person gets their own sign-in." },
    company: { space: "your company's space in the movement", team: "Want your colleagues in too? Share this same link with them, and each person gets their own sign-in." },
    ambassador: { space: "your space as a Kindness Forward ambassador", team: null },
  },
  es: {
    organisation: { space: "el espacio de tu organización en el movimiento", team: "¿Quieres sumar a tu equipo? Compárteles este mismo enlace y cada persona tendrá su propio acceso." },
    company: { space: "el espacio de tu empresa en el movimiento", team: "¿Quieres sumar a tus compañeros? Compárteles este mismo enlace y cada persona tendrá su propio acceso." },
    ambassador: { space: "tu espacio como embajador/a de Pásalo Pa'lante", team: null },
  },
};

export function welcomeEmail(o: { name: string; kind: MemberKind; link: string }) {
  const name = o.name.trim() || "there";
  const en = WORDS.en[o.kind];
  const es = WORDS.es[o.kind];
  const subject = "Your Partners Hub is ready · Tu Partners Hub está listo";
  const p = (t: string) => `<p style="margin:0 0 14px;font-size:15px;line-height:1.55;color:#33415e">${t}</p>`;
  const button = (label: string) =>
    `<p style="margin:6px 0 20px"><a href="${o.link}" style="display:inline-block;background:#f37023;color:#ffffff;font-weight:700;font-size:16px;text-decoration:none;padding:14px 22px">${escapeHtml(label)}</a></p>`;
  const html = `<div style="font-family:Montserrat,Arial,Helvetica,sans-serif;color:#0e234b;max-width:560px;margin:0 auto">
<div style="height:8px;background:#f37023;background:linear-gradient(90deg,#fdb813,#f37023)"></div>
<div style="padding:24px 4px 0"><img src="${LOGO}" alt="Kindness Forward" width="160" style="display:block;width:160px;height:auto;border:0"></div>
<h1 style="font-size:24px;line-height:1.25;margin:22px 0 12px">Welcome to the Partners Hub, ${escapeHtml(name)}</h1>
${p(`This is ${escapeHtml(en.space)}: your kit, your pledge, and a place to share your kindness with organisations, companies and ambassadors around the world.`)}
${button("Open your Partners Hub")}
${p("The first time, just type your name and you're in.")}
${p(`Next time, go to <a href="${HUB_URL}" style="color:#0086ba;font-weight:700">partners.passkindnessforward.com</a> and type this email address. We'll send you a sign-in link. No password needed.`)}
${en.team ? p(escapeHtml(en.team)) : ""}
<div style="border-top:1.5px solid #dcecf5;margin:26px 0 22px"></div>
<h2 style="font-size:20px;line-height:1.3;margin:0 0 12px">Bienvenidos al Partners Hub, ${escapeHtml(name)}</h2>
${p(`Este es ${escapeHtml(es.space)}: tu kit, tu compromiso y un lugar para compartir tu bondad con organizaciones, empresas y embajadores de todo el mundo.`)}
${button("Abrir tu Partners Hub")}
${p("La primera vez, escribe tu nombre y ya estás dentro.")}
${p(`La próxima vez, entra a <a href="${HUB_URL}" style="color:#0086ba;font-weight:700">partners.passkindnessforward.com</a> y escribe este correo. Te enviaremos un enlace para entrar. No necesitas contraseña.`)}
${es.team ? p(escapeHtml(es.team)) : ""}
<div style="border-top:1.5px solid #dcecf5;margin:26px 0 16px"></div>
<p style="margin:0 0 6px;font-size:13px;color:#6b7790">Questions? / ¿Preguntas? ${QUESTIONS}</p>
<p style="margin:0 0 24px;font-size:13px;color:#6b7790">Kindness Forward · Pásalo Pa'lante</p>
<div style="height:6px;background:#f37023;background:linear-gradient(90deg,#fdb813,#f37023)"></div>
</div>`;
  const text = [
    `Welcome to the Partners Hub, ${name}`,
    "",
    `This is ${en.space}: your kit, your pledge, and a place to share your kindness.`,
    "",
    `Open your Partners Hub: ${o.link}`,
    "The first time, just type your name and you're in.",
    `Next time, go to ${HUB_URL} and type this email address. We'll send you a sign-in link. No password needed.`,
    en.team ?? "",
    "",
    `Bienvenidos al Partners Hub, ${name}`,
    "",
    `Este es ${es.space}: tu kit, tu compromiso y un lugar para compartir tu bondad.`,
    "",
    `Abrir tu Partners Hub: ${o.link}`,
    "La primera vez, escribe tu nombre y ya estás dentro.",
    `La próxima vez, entra a ${HUB_URL} y escribe este correo. Te enviaremos un enlace para entrar.`,
    es.team ?? "",
    "",
    `Questions? / ¿Preguntas? ${QUESTIONS}`,
  ].join("\n");
  return { subject, html, text };
}

/**
 * Sends the welcome email to a member's contact email and records when, so it goes once.
 * Returns false (and sends nothing) when there's no email or it was already sent, unless forced.
 */
export async function sendWelcome(
  admin: SupabaseClient,
  partner: { id: string; name: string; org_type: string | null; contact_email: string | null; invite_token: string; welcome_sent_at?: string | null },
  force = false,
): Promise<boolean> {
  if (!partner.contact_email) return false;
  if (partner.welcome_sent_at && !force) return false;
  const mail = welcomeEmail({ name: partner.name, kind: kindOf(partner.org_type), link: `${HUB_URL}/join/${partner.invite_token}` });
  const { error } = await admin.rpc("enqueue_email", {
    queue_name: "transactional_emails",
    payload: {
      message_id: crypto.randomUUID(),
      to: partner.contact_email,
      from: `Kindness Forward <noreply@${SENDER_DOMAIN}>`,
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
      label: "partners_hub_welcome",
      queued_at: new Date().toISOString(),
    },
  });
  if (error) throw new Error(`could not queue the welcome email: ${error.message}`);
  await admin.from("partners").update({ welcome_sent_at: new Date().toISOString() }).eq("id", partner.id);
  return true;
}
