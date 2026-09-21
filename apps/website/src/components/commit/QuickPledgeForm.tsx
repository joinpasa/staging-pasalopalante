import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Check, ChevronsUpDown } from "lucide-react";

import { useLanguage } from "@shared/contexts/LanguageContext";
import { useAuth } from "@shared/contexts/AuthContext";
import { supabase } from "@shared/integrations/supabase/client";
import { Button } from "@shared/components/ui/button";
import { Input } from "@shared/components/ui/input";
import { Label } from "@shared/components/ui/label";
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
import { submitPPLForm } from "@shared/lib/pplForm";
import { getAuthErrorMessage } from "@shared/lib/authErrors";

type HelpRole = "do_acts" | "champion" | "ambassador" | "civic" | "volunteer";

const PLEDGE_PRESETS = [5, 10, 25, 50];

// Quick, single-step pledge form — the homepage's primary CTA target. Unlike
// CommitFlow (the full /commit page: Individual/Group tabs, org fields), this
// is individual-only and deliberately short: the fields the primary CTA
// needs to collect a pledge, nothing more.
export default function QuickPledgeForm() {
  const { t } = useLanguage();
  const { user, signInWithMagicLink } = useAuth();
  const navigate = useNavigate();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("");
  const [countryOpen, setCountryOpen] = useState(false);
  const [helpRole, setHelpRole] = useState<HelpRole | "">("");
  const [pledgeCount, setPledgeCount] = useState(10);
  const [pledgeText, setPledgeText] = useState("10");
  const setPledge = (n: number) => {
    setPledgeCount(n);
    setPledgeText(String(n));
  };
  const [termsAgreed, setTermsAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const helpRoleOptions: { value: HelpRole; label: string }[] = [
    { value: "do_acts", label: t.commit.helpRoleDoActs },
    { value: "champion", label: t.commit.helpRoleChampion },
    { value: "ambassador", label: t.commit.helpRoleAmbassador },
    { value: "civic", label: t.commit.helpRoleCivic },
    { value: "volunteer", label: t.commit.helpRoleVolunteer },
  ];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user && !termsAgreed) {
      toast.error(t.share.termsRequired);
      return;
    }
    if (!lastName.trim()) {
      toast.error(t.commit.lastNameRequired);
      return;
    }
    if (!country) {
      toast.error(t.commit.countryRequired);
      return;
    }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("submit-commitment", {
        body: {
          type: "individual",
          first_name: firstName,
          last_name: lastName,
          email,
          phone,
          pledge_count: pledgeCount,
          help_role: helpRole || null,
          country,
        },
      });
      if (error || (data as any)?.error) {
        const msg = (data as any)?.error || error?.message || t.commit.submitError;
        toast.error(msg);
        return;
      }
      try {
        await submitPPLForm("pledge", {
          fullName: `${firstName} ${lastName}`.trim(),
          email,
          phone: phone || undefined,
          country: country || undefined,
          pledgeCount,
          message: `Role: ${helpRole}`,
          mode: "individual",
          helpRole: helpRole || undefined,
        });
      } catch {
        // Non-fatal — commit already succeeded
      }
      if (!user && email) {
        // Not awaited — must not delay the redirect below.
        signInWithMagicLink(email, firstName || undefined).then(({ error }) => {
          if (error) toast.error(getAuthErrorMessage(error));
        });
      }
      navigate(user ? "/account?committed=1" : "/commit?sent=" + encodeURIComponent(email));
    } catch {
      toast.error(t.commit.submitError);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="qp-first">{t.commit.firstNameLabel}</Label>
          <Input
            id="qp-first"
            required
            maxLength={60}
            placeholder={t.commit.firstNamePlaceholder}
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="qp-last">{t.commit.lastNameLabel}</Label>
          <Input
            id="qp-last"
            required
            maxLength={60}
            placeholder={t.commit.lastNamePlaceholder}
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
          />
        </div>
      </div>
      <p className="text-xs text-muted-foreground -mt-2">{t.commit.publicNameHint}</p>

      <div className="space-y-2">
        <Label htmlFor="qp-email">{t.commit.emailLabel}</Label>
        <Input
          id="qp-email"
          type="email"
          required
          maxLength={200}
          placeholder={t.commit.emailPlaceholder}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="qp-country">{t.commit.countryLabel}</Label>
        <Popover open={countryOpen} onOpenChange={setCountryOpen}>
          <PopoverTrigger asChild>
            <Button
              id="qp-country"
              type="button"
              variant="outline"
              role="combobox"
              aria-expanded={countryOpen}
              className="w-full justify-between font-normal"
            >
              <span className="truncate">{country || t.commit.countryPlaceholder}</span>
              <ChevronsUpDown className="ms-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="w-auto min-w-[--radix-popover-trigger-width] max-w-[min(28rem,calc(100vw-2rem))] p-0"
            align="start"
          >
            <Command>
              <CommandInput placeholder={t.commit.countryPlaceholder} />
              <CommandList>
                <CommandEmpty>{t.commit.countryEmpty}</CommandEmpty>
                <CommandGroup>
                  {COUNTRIES.map((c) => (
                    <CommandItem
                      key={c}
                      value={c}
                      onSelect={() => {
                        setCountry(c);
                        setCountryOpen(false);
                      }}
                    >
                      <Check className={cn("me-2 h-4 w-4", country === c ? "opacity-100" : "opacity-0")} />
                      {c}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      <div className="space-y-2">
        <Label htmlFor="qp-phone">{t.commit.phoneLabel}</Label>
        <Input
          id="qp-phone"
          type="tel"
          maxLength={40}
          placeholder={t.commit.phonePlaceholder}
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="qp-role">{t.commit.helpRoleLabel}</Label>
        <Select value={helpRole} onValueChange={(v) => setHelpRole(v as HelpRole)}>
          <SelectTrigger id="qp-role">
            <SelectValue placeholder={t.commit.helpRolePlaceholder} />
          </SelectTrigger>
          <SelectContent>
            {helpRoleOptions.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        <Label htmlFor="qp-pledge" className="whitespace-pre-line">
          {t.commit.pledgeLabel}
        </Label>
        <div className="flex flex-wrap gap-2">
          {PLEDGE_PRESETS.map((n) => (
            <button
              type="button"
              key={n}
              onClick={() => setPledge(n)}
              className={`px-4 py-2 rounded-full border text-sm font-medium transition-colors ${
                pledgeCount === n
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-foreground border-border hover:border-primary"
              }`}
            >
              {n}
            </button>
          ))}
          <Input
            id="qp-pledge"
            type="number"
            inputMode="numeric"
            min={1}
            max={1000000000}
            value={pledgeText}
            onChange={(e) => {
              const raw = e.target.value;
              setPledgeText(raw);
              const parsed = parseInt(raw, 10);
              if (Number.isFinite(parsed)) setPledgeCount(Math.min(1000000000, Math.max(1, parsed)));
            }}
            onBlur={() => {
              const parsed = parseInt(pledgeText, 10);
              const next = Number.isFinite(parsed) ? Math.min(1000000000, Math.max(1, parsed)) : 1;
              setPledge(next);
            }}
            className="w-28"
          />
        </div>
        <p className="text-xs text-muted-foreground">{t.commit.pledgeHint}</p>
      </div>

      {!user && (
        <label className="flex items-start gap-2 text-xs text-foreground/80 cursor-pointer">
          <input
            type="checkbox"
            checked={termsAgreed}
            onChange={(e) => setTermsAgreed(e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-primary cursor-pointer"
          />
          <span>
            {t.share.termsAgreePrefix}{" "}
            <a href="/terms" target="_blank" rel="noopener noreferrer" className="underline text-primary">
              {t.share.termsLink}
            </a>
            .
          </span>
        </label>
      )}

      <Button type="submit" disabled={submitting} className="w-full !py-6">
        {submitting ? t.commit.submitting : t.commit.submit}
      </Button>
    </form>
  );
}
