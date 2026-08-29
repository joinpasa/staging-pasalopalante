import { useState } from "react";
import { toast } from "sonner";
import { Check, ChevronsUpDown } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@shared/components/ui/dialog";
import { Button } from "@shared/components/ui/button";
import { Input } from "@shared/components/ui/input";
import { Label } from "@shared/components/ui/label";
import { Textarea } from "@shared/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@shared/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@shared/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@shared/components/ui/command";
import { COUNTRIES } from "@shared/data/countries";
import { cn } from "@shared/lib/utils";
import { useLanguage } from "@shared/contexts/LanguageContext";
import { submitPPLForm } from "@shared/lib/pplForm";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const COPY = {
  en: {
    title: "Join as an Ambassador",
    description: "Tell us a bit about you and we'll be in touch.",
    fullName: "Full name",
    email: "Email",
    phone: "Phone (optional)",
    country: "Country",
    countryPlaceholder: "Select a country",
    countryEmpty: "No country found.",
    city: "City / Town (optional)",
    organization: "Organization (optional)",
    participantType: "I'm joining as",
    participantPlaceholder: "Select one",
    types: {
      Individual: "Individual",
      Ambassador: "Ambassador",
      Organization: "Organization",
      Volunteer: "Volunteer",
    },
    message: "Message (optional)",
    submit: "Send",
    submitting: "Sending…",
    success: "Thank you — we'll be in touch soon.",
    error: "Something went wrong. Please try again.",
    required: "Please fill in your name and email.",
  },
  es: {
    title: "Únete como Embajador",
    description: "Cuéntanos un poco sobre ti y te contactaremos.",
    fullName: "Nombre completo",
    email: "Correo",
    phone: "Teléfono (opcional)",
    country: "País",
    countryPlaceholder: "Selecciona un país",
    countryEmpty: "No se encontró.",
    city: "Ciudad / Pueblo (opcional)",
    organization: "Organización (opcional)",
    participantType: "Me uno como",
    participantPlaceholder: "Selecciona una opción",
    types: {
      Individual: "Individuo",
      Ambassador: "Embajador",
      Organization: "Organización",
      Volunteer: "Voluntario",
    },
    message: "Mensaje (opcional)",
    submit: "Enviar",
    submitting: "Enviando…",
    success: "Gracias — te contactaremos pronto.",
    error: "Ocurrió un error. Inténtalo de nuevo.",
    required: "Por favor completa tu nombre y correo.",
  },
} as const;

const PARTICIPANT_TYPES = ["Individual", "Ambassador", "Organization", "Volunteer"] as const;

const AmbassadorForm = ({ open, onOpenChange }: Props) => {
  const { lang } = useLanguage();
  const c = COPY[lang as keyof typeof COPY] ?? COPY.en;

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("");
  const [countryOpen, setCountryOpen] = useState(false);
  const [city, setCity] = useState("");
  const [organization, setOrganization] = useState("");
  const [participantType, setParticipantType] =
    useState<(typeof PARTICIPANT_TYPES)[number] | "">("Ambassador");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function reset() {
    setFullName("");
    setEmail("");
    setPhone("");
    setCountry("");
    setCity("");
    setOrganization("");
    setParticipantType("Ambassador");
    setMessage("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!fullName.trim() || !email.trim()) {
      toast.error(c.required);
      return;
    }
    setSubmitting(true);
    const res = await submitPPLForm("get-involved", {
      fullName: fullName.trim(),
      email: email.trim(),
      phone: phone.trim() || undefined,
      country: country || undefined,
      city: city.trim() || undefined,
      organization: organization.trim() || undefined,
      participantType: participantType || undefined,
      message: message.trim() || undefined,
    });
    setSubmitting(false);
    if (res.success) {
      toast.success(c.success);
      reset();
      onOpenChange(false);
    } else {
      toast.error(res.error || c.error);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="headline-md text-foreground">{c.title}</DialogTitle>
          <DialogDescription>{c.description}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amb-name">{c.fullName}</Label>
              <Input
                id="amb-name"
                required
                maxLength={120}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="amb-email">{c.email}</Label>
              <Input
                id="amb-email"
                type="email"
                required
                maxLength={200}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="amb-phone">{c.phone}</Label>
              <Input
                id="amb-phone"
                type="tel"
                maxLength={40}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="amb-type">{c.participantType}</Label>
              <Select
                value={participantType}
                onValueChange={(v) => setParticipantType(v as typeof PARTICIPANT_TYPES[number])}
              >
                <SelectTrigger id="amb-type">
                  <SelectValue placeholder={c.participantPlaceholder} />
                </SelectTrigger>
                <SelectContent>
                  {PARTICIPANT_TYPES.map((p) => (
                    <SelectItem key={p} value={p}>
                      {c.types[p]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2">
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
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
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
                                "mr-2 h-4 w-4",
                                country === co ? "opacity-100" : "opacity-0"
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
            <div className="space-y-2">
              <Label htmlFor="amb-city">{c.city}</Label>
              <Input
                id="amb-city"
                maxLength={120}
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="amb-org">{c.organization}</Label>
              <Input
                id="amb-org"
                maxLength={200}
                value={organization}
                onChange={(e) => setOrganization(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amb-msg">{c.message}</Label>
            <Textarea
              id="amb-msg"
              maxLength={1000}
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>

          <Button type="submit" disabled={submitting} className="w-full !py-6">
            {submitting ? c.submitting : c.submit}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AmbassadorForm;
