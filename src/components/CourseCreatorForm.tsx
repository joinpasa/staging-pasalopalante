import { useState } from "react";
import { toast } from "sonner";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { COUNTRIES } from "@/data/countries";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import { submitPPLForm } from "@/lib/pplForm";

// Mirrors the GoHighLevel form:
// "Pásalo Pa'lante Ambassador & Core Team Commitment"
const CONTRIBUTION_OPTIONS = {
  en: [
    "Marketing / Branding",
    "Media",
    "Operations",
    "Global Ambassador (Country Leads)",
    "Funding / Sponsorships",
    "Education",
    "Partnerships",
    "Large Organization Outreach (Part of Partnerships)",
    "Music",
    "Faith & Spirituality",
    "Technology",
    "Leadership Development / Recruiting",
    "Champions (Celebrities / Musicians / Athletes)",
    "Influencers",
  ],
  es: [
    "Marketing / Branding",
    "Medios",
    "Operaciones",
    "Embajador Global (Líderes de país)",
    "Financiamiento / Patrocinios",
    "Educación",
    "Alianzas",
    "Alcance a grandes organizaciones (parte de Alianzas)",
    "Música",
    "Fe y espiritualidad",
    "Tecnología",
    "Desarrollo de liderazgo / Reclutamiento",
    "Campeones (Celebridades / Músicos / Atletas)",
    "Influencers",
  ],
} as const;

const CAPACITY_OPTIONS = {
  en: [
    "A few hours a week",
    "Leader / Co-leader of selected pillar of focus",
    "Ability to attend weekly meetings each Tuesday at 7pm ET / 4pm PT / 1am Germany time",
    "Ability to contribute key contacts (only) — no time for meetings",
  ],
  es: [
    "Unas pocas horas por semana",
    "Líder / Co-líder del pilar seleccionado",
    "Disponibilidad para reuniones semanales los martes 7pm ET / 4pm PT / 1am Alemania",
    "Puedo aportar contactos clave (solamente) — sin tiempo para reuniones",
  ],
} as const;

const COPY = {
  en: {
    eyebrow: "Pásalo Pa'lante Collective",
    heading: "Ambassador & Core Team Commitment",
    subheading:
      "Join a global collective of creators, organizers, and skilled leaders shaping the next chapter of Pásalo Pa'lante. Tell us how you'd like to contribute.",
    fullName: "Full Name",
    phone: "Phone Number (Include Country Code)",
    email: "Email",
    country: "Country",
    countryPlaceholder: "Enter your country",
    countryEmpty: "No country found.",
    social: "Social Media Handles",
    socialPlaceholder: "@your-handle across the platforms you use most",
    contribution: "Areas of Kindness Organization Contribution",
    contributionHelp: "Select all that apply",
    focus:
      "Areas of interest / skillset that you would like to contribute to the Kindness Organization",
    focusPlaceholder:
      "Your zone of genius: what you love to do, what you're great at, what you'd bring to the collective",
    capacity:
      "Amount of time / bandwidth / capacity you have to contribute to the Kindness Organization",
    capacityDetails:
      "Amount of time / bandwidth / capacity you have to contribute (Details)",
    organization: "The Organization or Company You Work For / Own Is",
    logo: "Organization or Company Logo (link)",
    logoHelp:
      "We would love to highlight your participation. Share a link to your logo for website / future media. Only share an organization's logo if it has committed to be part of the global kindness experience — do not upload their logo without explicit approval.",
    questions: "Questions / Feedback",
    network:
      "Collective Network — Names & Contact Info of Individuals or Organizations for us to reach out to",
    networkPlaceholder:
      "People you think should be part of this — names, emails, or handles",
    consentValues:
      "By checking this box, I consent to the values and operating codes of conduct of Pásalo Pa'lante regarding The 1 Billion Acts of Kindness, Kindness Season global initiative.",
    consentComms:
      "By checking this box, I consent to receive communications from Pásalo Pa'lante about The 1 Billion Acts of Kindness, Kindness Season.",
    submit: "Send",
    submitting: "Sending…",
    success:
      "Thank you — your registration has been received. We'll be in touch soon.",
    error: "Something went wrong. Please try again.",
    required: "Please complete your name and email.",
    requiredContribution: "Please select at least one area of contribution.",
    requiredCapacity: "Please select your available capacity.",
    requiredConsent: "Please accept the values and code of conduct.",
  },
  es: {
    eyebrow: "Colectivo Pásalo Pa'lante",
    heading: "Compromiso de Embajadores y Equipo Central",
    subheading:
      "Únete a un colectivo global de creadores, organizadores y líderes que están dando forma al próximo capítulo de Pásalo Pa'lante. Cuéntanos cómo te gustaría contribuir.",
    fullName: "Nombre completo",
    phone: "Número de teléfono (incluye código de país)",
    email: "Correo electrónico",
    country: "País",
    countryPlaceholder: "Escribe tu país",
    countryEmpty: "No se encontró.",
    social: "Redes sociales",
    socialPlaceholder: "@tu-usuario en las plataformas que más usas",
    contribution: "Áreas de contribución a la Organización de Bondad",
    contributionHelp: "Selecciona todas las que apliquen",
    focus:
      "Áreas de interés / habilidades que te gustaría aportar a la Organización de Bondad",
    focusPlaceholder:
      "Tu zona de genialidad: lo que amas hacer, en lo que eres excelente, lo que aportarías",
    capacity:
      "Tiempo / capacidad que tienes para contribuir a la Organización de Bondad",
    capacityDetails:
      "Tiempo / capacidad que tienes para contribuir (Detalles)",
    organization: "La organización o empresa donde trabajas / que posees",
    logo: "Logo de la organización o empresa (enlace)",
    logoHelp:
      "Nos encantaría destacar tu participación. Comparte un enlace a tu logo para la web / medios futuros. Comparte el logo de una organización solo si se ha comprometido a ser parte de la experiencia global de bondad — no lo subas sin aprobación explícita.",
    questions: "Preguntas / Comentarios",
    network:
      "Red del colectivo — Nombres y contactos de personas u organizaciones que debamos contactar",
    networkPlaceholder:
      "Personas que crees deberían ser parte de esto — nombres, correos o redes",
    consentValues:
      "Al marcar esta casilla, acepto los valores y códigos de conducta de Pásalo Pa'lante respecto a la iniciativa global 1 Billón de Actos de Bondad, Temporada de Bondad.",
    consentComms:
      "Al marcar esta casilla, acepto recibir comunicaciones de Pásalo Pa'lante sobre 1 Billón de Actos de Bondad, Temporada de Bondad.",
    submit: "Enviar",
    submitting: "Enviando…",
    success:
      "Gracias — hemos recibido tu registro. Te contactaremos pronto.",
    error: "Ocurrió un error. Inténtalo de nuevo.",
    required: "Por favor completa tu nombre y correo.",
    requiredContribution: "Selecciona al menos un área de contribución.",
    requiredCapacity: "Selecciona tu disponibilidad.",
    requiredConsent: "Por favor acepta los valores y el código de conducta.",
  },
} as const;

export default function CourseCreatorForm() {
  const { lang } = useLanguage();
  const key = lang === "es" ? "es" : "en";
  const c = COPY[key];
  const contributionOptions = CONTRIBUTION_OPTIONS[key];
  const capacityOptions = CAPACITY_OPTIONS[key];

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [country, setCountry] = useState("");
  const [countryOpen, setCountryOpen] = useState(false);
  const [social, setSocial] = useState("");
  const [contributions, setContributions] = useState<string[]>([]);
  const [focus, setFocus] = useState("");
  const [capacity, setCapacity] = useState<string[]>([]);
  const [capacityDetails, setCapacityDetails] = useState("");
  const [organization, setOrganization] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [questions, setQuestions] = useState("");
  const [network, setNetwork] = useState("");
  const [consentValues, setConsentValues] = useState(false);
  const [consentComms, setConsentComms] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  function toggle(list: string[], set: (v: string[]) => void, value: string) {
    set(list.includes(value) ? list.filter((x) => x !== value) : [...list, value]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!fullName.trim() || !email.trim()) {
      toast.error(c.required);
      return;
    }
    if (contributions.length === 0) {
      toast.error(c.requiredContribution);
      return;
    }
    if (capacity.length === 0) {
      toast.error(c.requiredCapacity);
      return;
    }
    if (!consentValues) {
      toast.error(c.requiredConsent);
      return;
    }
    setSubmitting(true);

    try {
      const result = await submitPPLForm("course-creator", {
        fullName: fullName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        country: country || "",
        organization: organization.trim(),
        social: social.trim(),
        interests: contributions,
        capacity,
        capacityDetails: capacityDetails.trim(),
        logoUrl: logoUrl.trim(),
        focus: focus.trim(),
        network: network.trim(),
        questions: questions.trim(),
        consentValues,
        consentComms,
      });
      if (!result.success) {
        console.error("Course-creator submit failed:", result.error);
        toast.error(c.error);
        setSubmitting(false);
        return;
      }
      toast.success(c.success);
      setDone(true);
    } catch (err) {
      console.error("Course-creator submit error:", err);
      toast.error(c.error);
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <section
        id="course-creator"
        className="bg-white/70 border border-warm-earth/10 rounded-2xl p-8 md:p-10 text-center"
      >
        <p className="eyebrow">{c.eyebrow}</p>
        <h2 className="font-display text-3xl md:text-4xl text-warm-earth mt-3 mb-4">
          {c.heading}
        </h2>
        <p className="text-foreground/80 leading-relaxed max-w-xl mx-auto">
          {c.success}
        </p>
      </section>
    );
  }

  return (
    <section
      id="course-creator"
      className="bg-white/70 border border-warm-earth/10 rounded-2xl p-6 md:p-10"
    >
      <div className="mb-8 text-center max-w-2xl mx-auto">
        <p className="eyebrow">{c.eyebrow}</p>
        <h2 className="font-display text-3xl md:text-4xl text-warm-earth mt-3 mb-3">
          {c.heading}
        </h2>
        <p className="text-foreground/75 leading-relaxed">{c.subheading}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 max-w-2xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="cc-name">{c.fullName} *</Label>
            <Input
              id="cc-name"
              required
              maxLength={120}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cc-phone">{c.phone}</Label>
            <Input
              id="cc-phone"
              type="tel"
              maxLength={40}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cc-email">{c.email} *</Label>
            <Input
              id="cc-email"
              type="email"
              required
              maxLength={200}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>{c.country}</Label>
            <Popover open={countryOpen} onOpenChange={setCountryOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  role="combobox"
                  aria-expanded={countryOpen}
                  className="w-full justify-between font-normal"
                >
                  {country || c.countryPlaceholder}
                  <ChevronsUpDown className="ms-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-[--radix-popover-trigger-width] p-0"
                align="start"
              >
                <Command>
                  <CommandInput placeholder={c.countryPlaceholder} />
                  <CommandList>
                    <CommandEmpty>{c.countryEmpty}</CommandEmpty>
                    <CommandGroup>
                      {COUNTRIES.map((co) => (
                        <CommandItem
                          key={co}
                          value={co}
                          onSelect={() => {
                            setCountry(co);
                            setCountryOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "me-2 h-4 w-4",
                              country === co ? "opacity-100" : "opacity-0",
                            )}
                          />
                          {co}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="cc-social">{c.social}</Label>
          <Input
            id="cc-social"
            maxLength={300}
            placeholder={c.socialPlaceholder}
            value={social}
            onChange={(e) => setSocial(e.target.value)}
          />
        </div>

        <div className="space-y-3">
          <div>
            <Label>{c.contribution} *</Label>
            <p className="text-xs text-muted-foreground mt-1">
              {c.contributionHelp}
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {contributionOptions.map((opt) => {
              const checked = contributions.includes(opt);
              return (
                <label
                  key={opt}
                  className={cn(
                    "flex items-center gap-2 rounded-lg border px-3 py-2.5 cursor-pointer transition",
                    checked
                      ? "border-warm-earth bg-warm-earth/5"
                      : "border-warm-earth/15 hover:border-warm-earth/30 bg-white/60",
                  )}
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={() =>
                      toggle(contributions, setContributions, opt)
                    }
                  />
                  <span className="text-sm">{opt}</span>
                </label>
              );
            })}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="cc-focus">{c.focus}</Label>
          <Textarea
            id="cc-focus"
            rows={4}
            maxLength={2000}
            placeholder={c.focusPlaceholder}
            value={focus}
            onChange={(e) => setFocus(e.target.value)}
          />
        </div>

        <div className="space-y-3">
          <Label>{c.capacity} *</Label>
          <div className="grid grid-cols-1 gap-3">
            {capacityOptions.map((opt) => {
              const checked = capacity.includes(opt);
              return (
                <label
                  key={opt}
                  className={cn(
                    "flex items-start gap-2 rounded-lg border px-3 py-2.5 cursor-pointer transition",
                    checked
                      ? "border-warm-earth bg-warm-earth/5"
                      : "border-warm-earth/15 hover:border-warm-earth/30 bg-white/60",
                  )}
                >
                  <Checkbox
                    className="mt-0.5"
                    checked={checked}
                    onCheckedChange={() => toggle(capacity, setCapacity, opt)}
                  />
                  <span className="text-sm">{opt}</span>
                </label>
              );
            })}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="cc-capacity-details">{c.capacityDetails}</Label>
          <Textarea
            id="cc-capacity-details"
            rows={3}
            maxLength={2000}
            value={capacityDetails}
            onChange={(e) => setCapacityDetails(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="cc-org">{c.organization}</Label>
          <Input
            id="cc-org"
            maxLength={200}
            value={organization}
            onChange={(e) => setOrganization(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="cc-logo">{c.logo}</Label>
          <Input
            id="cc-logo"
            type="url"
            maxLength={500}
            placeholder="https://"
            value={logoUrl}
            onChange={(e) => setLogoUrl(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">{c.logoHelp}</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="cc-questions">{c.questions}</Label>
          <Textarea
            id="cc-questions"
            rows={3}
            maxLength={2000}
            value={questions}
            onChange={(e) => setQuestions(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="cc-network">{c.network}</Label>
          <Textarea
            id="cc-network"
            rows={3}
            maxLength={2000}
            placeholder={c.networkPlaceholder}
            value={network}
            onChange={(e) => setNetwork(e.target.value)}
          />
        </div>

        <div className="space-y-3 pt-2">
          <label className="flex items-start gap-3 cursor-pointer">
            <Checkbox
              className="mt-1"
              checked={consentValues}
              onCheckedChange={(v) => setConsentValues(Boolean(v))}
            />
            <span className="text-sm text-foreground/80 leading-relaxed">
              {c.consentValues} *
            </span>
          </label>
          <label className="flex items-start gap-3 cursor-pointer">
            <Checkbox
              className="mt-1"
              checked={consentComms}
              onCheckedChange={(v) => setConsentComms(Boolean(v))}
            />
            <span className="text-sm text-foreground/80 leading-relaxed">
              {c.consentComms}
            </span>
          </label>
        </div>

        <Button
          type="submit"
          disabled={submitting}
          className="w-full !py-6 bg-warm-earth hover:opacity-90 text-warm-cream"
        >
          {submitting ? c.submitting : c.submit}
        </Button>
      </form>
    </section>
  );
}
