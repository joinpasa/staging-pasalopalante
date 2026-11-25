import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { Briefcase, Building2, Check, Loader2, MailCheck, Sparkles } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";
import { useHubCopy } from "@/lib/hubCopy";
import { useCopy } from "@/lib/i18n";
import { callFunction } from "@/lib/portalClient";
import { COUNTRY_NAMES, countryLabel } from "@/lib/geo";
import { orgTypeLabel, orgTypesFor, type Kind } from "@/lib/kinds";

/**
 * /join: one open link for everyone (26 Nov 2026). People choose whether they're joining as an
 * organisation, a company or an ambassador, and fill in every detail. We email them their own
 * join link; opening it from their inbox gets them in, which also proves the email is theirs.
 */

const WORDS = {
  en: {
    chip: "Global Kindness Season · 1 Nov – 31 Jan",
    headline: "Join Kindness Forward",
    body: "Organisations, companies and ambassadors get their own space in the Partners Hub: a kit made for them, their pledge, and a place to share their kindness.",
    title: "Join the Partners Hub",
    sub: "It takes about two minutes. Everything is needed, so we know who you are.",
    as: "I'm joining as",
    kinds: {
      organisation: ["An organisation", "A school, nonprofit, faith group, municipality or community group"],
      company: ["A company", "A business of any size, with its staff"],
      ambassador: ["An ambassador", "One person leading kindness where they live"],
    } as Record<Kind, [string, string]>,
    orgName: "Name of your organisation",
    companyName: "Name of your company",
    yourFullName: "Your full name",
    orgType: "What kind of organisation?",
    choose: "Choose…",
    yourName: "Your name",
    yourNameHint: "The person we'll write to",
    email: "Your email",
    emailHint: "We send your Partners Hub link here.",
    country: "Country",
    city: "City or town",
    link: "Website or social media page",
    linkHint: "Your website, or your Instagram, Facebook or LinkedIn page",
    about: (k: Kind) => (k === "ambassador" ? "About you, in a sentence" : k === "company" ? "What your company does, in a sentence" : "What your organisation does, in a sentence"),
    pledge: "Your pledge",
    pledgeHint: (k: Kind) =>
      k === "ambassador" ? "How many acts of kindness you'll do this season, with the people you bring in" : "How many acts of kindness your people will do this season, all together",
    agree: "I agree to the community guidelines, and that Kindness Forward can email me about the Partners Hub.",
    guidelines: "Read the guidelines",
    send: "Send me my link",
    sending: "Sending…",
    missing: "Please fill in everything above.",
    doneTitle: "Check your inbox",
    doneBody: (email: string) => `We've sent your Partners Hub link to ${email}. Open it on this phone or computer, type your name, and you're in.`,
    doneFrom: "It comes from Kindness Forward (noreply@ntf.pasalopalante.com). If you can't find it, look in spam or Promotions.",
    member: "Already a member?",
    signIn: "Sign in",
  },
  es: {
    chip: "Temporada Global de Bondad · 1 nov – 31 ene",
    headline: "Únete a Pásalo Pa'lante",
    body: "Organizaciones, empresas y embajadores tienen su propio espacio en el Partners Hub: un kit hecho para ellos, su compromiso y un lugar para compartir su bondad.",
    title: "Únete al Partners Hub",
    sub: "Toma unos dos minutos. Necesitamos todos los datos para saber quién eres.",
    as: "Me uno como",
    kinds: {
      organisation: ["Una organización", "Escuela, organización sin fines de lucro, grupo de fe, municipio o grupo comunitario"],
      company: ["Una empresa", "Un negocio de cualquier tamaño, con su equipo"],
      ambassador: ["Embajador o embajadora", "Una persona que lleva la bondad a donde vive"],
    } as Record<Kind, [string, string]>,
    orgName: "Nombre de tu organización",
    companyName: "Nombre de tu empresa",
    yourFullName: "Tu nombre completo",
    orgType: "¿Qué tipo de organización?",
    choose: "Elige…",
    yourName: "Tu nombre",
    yourNameHint: "La persona a quien escribiremos",
    email: "Tu correo",
    emailHint: "Aquí te enviamos el enlace a tu Partners Hub.",
    country: "País",
    city: "Ciudad o pueblo",
    link: "Sitio web o red social",
    linkHint: "Tu sitio web, o tu página de Instagram, Facebook o LinkedIn",
    about: (k: Kind) => (k === "ambassador" ? "Sobre ti, en una oración" : k === "company" ? "Qué hace tu empresa, en una oración" : "Qué hace tu organización, en una oración"),
    pledge: "Tu compromiso",
    pledgeHint: (k: Kind) =>
      k === "ambassador" ? "Cuántos actos de bondad harás esta temporada, con las personas que sumes" : "Cuántos actos de bondad hará tu gente esta temporada, en total",
    agree: "Acepto las normas de la comunidad, y que Pásalo Pa'lante me escriba sobre el Partners Hub.",
    guidelines: "Leer las normas",
    send: "Envíame mi enlace",
    sending: "Enviando…",
    missing: "Completa todos los datos de arriba.",
    doneTitle: "Revisa tu correo",
    doneBody: (email: string) => `Enviamos el enlace a tu Partners Hub a ${email}. Ábrelo en este teléfono o computadora, escribe tu nombre y ya estás dentro.`,
    doneFrom: "Llega de Kindness Forward (noreply@ntf.pasalopalante.com). Si no lo ves, revisa el correo no deseado o Promociones.",
    member: "¿Ya eres miembro?",
    signIn: "Entrar",
  },
};

const KIND_ICON: Record<Kind, typeof Building2> = { organisation: Building2, company: Briefcase, ambassador: Sparkles };
const GUIDELINES = "https://passkindnessforward.com/community-guidelines";

export default function OpenJoinPage() {
  const { lang } = useHubCopy();
  const { t } = useCopy();
  const w = WORDS[lang === "es" ? "es" : "en"];
  const [kind, setKind] = useState<Kind | null>(null);
  const [f, setF] = useState({ name: "", orgType: "", person: "", email: "", country: "", city: "", link: "", about: "", pledge: "", agree: false, website2: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tried, setTried] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const countries = useMemo(() => [...COUNTRY_NAMES].sort((a, b) => countryLabel(a, lang).localeCompare(countryLabel(b, lang), lang)), [lang]);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF((x) => ({ ...x, [k]: e.target.value }));

  const pledge = Number(f.pledge.replace(/[^\d]/g, ""));
  const gaps = {
    name: f.name.trim().length < 2,
    orgType: kind === "organisation" && !f.orgType,
    person: kind !== "ambassador" && f.person.trim().length < 2,
    email: !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.email.trim()),
    country: !f.country,
    city: f.city.trim().length < 2,
    link: !/\.[a-z]{2,}/i.test(f.link.trim()),
    about: f.about.trim().length < 10,
    pledge: !(pledge >= 1 && pledge <= 10_000_000),
    agree: !f.agree,
  };
  const complete = !!kind && !Object.values(gaps).some(Boolean);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setTried(true);
    setError(null);
    if (!kind || !complete) return setError(w.missing);
    setBusy(true);
    try {
      await callFunction("partner-auth", {
        action: "self_join",
        kind,
        org_type: f.orgType,
        name: f.name.trim(),
        person: kind === "ambassador" ? f.name.trim() : f.person.trim(),
        email: f.email.trim(),
        country: f.country,
        city: f.city.trim(),
        link: f.link.trim(),
        about: f.about.trim(),
        pledge,
        agree: f.agree,
        website2: f.website2,
        lang,
      });
      setSentTo(f.email.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  const bad = (k: keyof typeof gaps) => tried && gaps[k];

  return (
    <AuthLayout chip={w.chip} headline={w.headline} body={w.body}>
      {sentTo ? (
        <div className="flex flex-col gap-4 bg-tint-sky p-5">
          <MailCheck className="h-9 w-9 text-sky" aria-hidden="true" />
          <h1 className="m-0 text-2xl font-extrabold">{w.doneTitle}</h1>
          <p className="m-0 text-[15px] font-semibold leading-relaxed text-navy">{w.doneBody(sentTo)}</p>
          <p className="m-0 text-[13.5px] font-medium leading-relaxed text-ink2">{w.doneFrom}</p>
        </div>
      ) : (
        <form onSubmit={submit} noValidate className="flex flex-col gap-5">
          <div className="flex flex-col gap-1">
            <h1 className="m-0 text-[28px] font-extrabold leading-tight">{w.title}</h1>
            <p className="m-0 text-[15px] font-medium text-ink-muted">{w.sub}</p>
          </div>

          <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
            <legend className="label mb-2">{w.as}</legend>
            {(["organisation", "company", "ambassador"] as Kind[]).map((k) => {
              const Icon = KIND_ICON[k];
              const on = kind === k;
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => setKind(k)}
                  aria-pressed={on}
                  className={`flex min-h-[64px] items-center gap-3.5 border-[1.5px] px-3.5 py-3 text-start transition ${on ? "border-sky bg-tint-sky" : "border-hair bg-white hover:border-sky"}`}
                >
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center ${on ? "bg-sky text-white" : "bg-tint-sky text-sky"}`}>
                    {on ? <Check className="h-5 w-5" aria-hidden="true" /> : <Icon className="h-5 w-5" aria-hidden="true" />}
                  </span>
                  <span className="min-w-0">
                    <b className="block text-[15.5px] font-extrabold text-navy">{w.kinds[k][0]}</b>
                    <span className="block text-[13px] font-medium leading-snug text-ink-muted">{w.kinds[k][1]}</span>
                  </span>
                </button>
              );
            })}
            {tried && !kind && <span className="text-[13px] font-semibold text-rose-ink">{w.missing}</span>}
          </fieldset>

          {kind && (
            <>
              <Field label={kind === "ambassador" ? w.yourFullName : kind === "company" ? w.companyName : w.orgName} bad={bad("name")}>
                <input className="field" value={f.name} onChange={set("name")} autoComplete={kind === "ambassador" ? "name" : "organization"} maxLength={120} />
              </Field>
              {kind === "organisation" && (
                <Field label={w.orgType} bad={bad("orgType")}>
                  <select className="field" value={f.orgType} onChange={set("orgType")}>
                    <option value="">{w.choose}</option>
                    {orgTypesFor("organisation").map((o) => (
                      <option key={o} value={o}>
                        {orgTypeLabel(o, lang)}
                      </option>
                    ))}
                  </select>
                </Field>
              )}
              {kind !== "ambassador" && (
                <Field label={w.yourName} hint={w.yourNameHint} bad={bad("person")}>
                  <input className="field" value={f.person} onChange={set("person")} autoComplete="name" maxLength={120} />
                </Field>
              )}
              <Field label={w.email} hint={w.emailHint} bad={bad("email")}>
                <input className="field" type="email" inputMode="email" autoComplete="email" value={f.email} onChange={set("email")} maxLength={200} />
              </Field>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label={w.country} bad={bad("country")}>
                  <select className="field" value={f.country} onChange={set("country")} autoComplete="country-name">
                    <option value="">{w.choose}</option>
                    {countries.map((c) => (
                      <option key={c} value={c}>
                        {countryLabel(c, lang)}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label={w.city} bad={bad("city")}>
                  <input className="field" value={f.city} onChange={set("city")} autoComplete="address-level2" maxLength={80} />
                </Field>
              </div>
              <Field label={w.link} hint={w.linkHint} bad={bad("link")}>
                <input className="field" type="url" inputMode="url" placeholder="www…" value={f.link} onChange={set("link")} maxLength={300} />
              </Field>
              <Field label={w.about(kind)} bad={bad("about")}>
                <textarea className="field min-h-[88px] py-2.5" value={f.about} onChange={set("about")} maxLength={600} />
              </Field>
              <Field label={w.pledge} hint={w.pledgeHint(kind)} bad={bad("pledge")}>
                <input className="field" inputMode="numeric" value={f.pledge} onChange={set("pledge")} placeholder="100" maxLength={12} />
              </Field>
              {/* people never see this; only bots fill it in */}
              <input tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" value={f.website2} onChange={set("website2")} />
              <label className={`flex cursor-pointer items-start gap-3 p-3 ${bad("agree") ? "bg-rose-soft" : "bg-tint-sky/60"}`}>
                <input type="checkbox" checked={f.agree} onChange={(e) => setF((x) => ({ ...x, agree: e.target.checked }))} className="mt-0.5 h-5 w-5 shrink-0 accent-sky" />
                <span className="text-[13.5px] font-semibold leading-snug text-navy">
                  {w.agree}{" "}
                  <a href={GUIDELINES} target="_blank" rel="noopener noreferrer" className="font-bold text-sky-deep">
                    {w.guidelines}
                  </a>
                </span>
              </label>
            </>
          )}

          {error && (
            <p role="alert" className="m-0 bg-rose-soft px-3.5 py-2.5 text-sm font-semibold text-rose-ink">
              {error}
            </p>
          )}
          <button type="submit" disabled={busy} className="btn-orange h-12 w-full text-base">
            {busy ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : null}
            {busy ? w.sending : w.send}
          </button>
          <p className="m-0 text-center text-[14px] font-semibold text-ink-muted">
            {w.member}{" "}
            <a href="/login" className="font-bold text-sky-deep">
              {w.signIn}
            </a>
          </p>
          <span className="sr-only">{t.language}</span>
        </form>
      )}
    </AuthLayout>
  );
}

function Field({ label, hint, bad, children }: { label: string; hint?: string; bad: boolean; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="label">{label}</span>
      {hint && <span className="-mt-1 text-[12.5px] font-medium text-ink-muted">{hint}</span>}
      <span className={`block ${bad ? "[&>.field]:border-rose-ink" : ""}`}>{children}</span>
    </label>
  );
}
