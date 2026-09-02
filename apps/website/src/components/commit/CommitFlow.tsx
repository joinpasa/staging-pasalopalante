import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Heart, Info, Check, ChevronsUpDown } from "lucide-react";

import { useLanguage } from "@shared/contexts/LanguageContext";
import { useAuth } from "@shared/contexts/AuthContext";
import { supabase } from "@shared/integrations/supabase/client";
import { Button } from "@shared/components/ui/button";
import { Input } from "@shared/components/ui/input";
import { Label } from "@shared/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@shared/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@shared/components/ui/tooltip";
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

interface Props {
  onSuccess?: () => void;
  compact?: boolean;
  prefilledEmail?: string;
  onClearPrefilledEmail?: () => void;
  initialMode?: Mode;
}

type Mode = "individual" | "organization";
type HelpRole = "do_acts" | "champion" | "ambassador" | "civic" | "volunteer";
type OrgType = "school" | "company" | "nonprofit" | "ngo" | "municipality" | "faith" | "other";

const GROUP_PRESETS = [100, 1000, 10000];

export default function CommitFlow({ onSuccess, compact = false, prefilledEmail, onClearPrefilledEmail, initialMode = "individual" }: Props) {
  const { t } = useLanguage();
  const { user, signInWithMagicLink } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState(prefilledEmail ?? "");
  const [orgName, setOrgName] = useState("");
  const [chapter, setChapter] = useState("");
  const [orgWebsite, setOrgWebsite] = useState("");
  const [pledgeCount, setPledgeCount] = useState<number>(initialMode === "organization" ? 100 : 10);
  const [pledgeText, setPledgeText] = useState<string>(initialMode === "organization" ? "100" : "10");
  const setPledge = (n: number) => {
    setPledgeCount(n);
    setPledgeText(String(n));
  };
  const [helpRole, setHelpRole] = useState<HelpRole | "">("");
  const [country, setCountry] = useState<string>("");
  const [countryOpen, setCountryOpen] = useState(false);
  const [orgType, setOrgType] = useState<OrgType | "">("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [termsAgreed, setTermsAgreed] = useState(false);

  // Sync email when prefilledEmail arrives or changes after mount
  // (e.g. ShareThanks loads it from sessionStorage in an effect).
  useEffect(() => {
    if (prefilledEmail) setEmail(prefilledEmail);
  }, [prefilledEmail]);

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
      const payload =
        mode === "individual"
          ? {
              type: mode,
              first_name: firstName,
              last_name: lastName,
              email,
              pledge_count: pledgeCount,
              help_role: helpRole || null,
              country,
            }
          : {
              type: mode,
              org_name: orgName,
              chapter,
              org_website: orgWebsite ? (/^https?:\/\//i.test(orgWebsite) ? orgWebsite : `https://${orgWebsite}`) : "",
              email,
              first_name: firstName,
              last_name: lastName,
              country,
              pledge_count: pledgeCount,
              org_type: orgType || null,
            };

      const { data, error } = await supabase.functions.invoke("submit-commitment", {
        body: payload,
      });
      if (error || (data as any)?.error) {
        const msg = (data as any)?.error || error?.message || t.commit.submitError;
        toast.error(msg);
        return;
      }
      // PPL Integration — sync to Airtable + GHL
      try {
        await submitPPLForm("pledge", {
          fullName: mode === "organization"
            ? `${firstName} ${lastName} (${orgName})`.trim()
            : `${firstName} ${lastName}`.trim(),
          email,
          country: country || undefined,
          pledgeCount,
          message: mode === "organization"
            ? `Org: ${orgName} | Type: ${orgType} | Chapter: ${chapter} | Website: ${orgWebsite}`
            : `Role: ${helpRole}`,
          mode,
          orgType: mode === "organization" ? orgType || undefined : undefined,
          helpRole: mode === "individual" ? helpRole || undefined : undefined,
        });
      } catch {
        // Non-fatal — commit already succeeded
      }
      if (!user && email) {
        // Not awaited — must not delay the redirect below. The "sent" page
        // still shows unconditionally, but if this actually failed (e.g. a
        // rate limit), surface it rather than silently pretending it worked.
        signInWithMagicLink(email, firstName || undefined).then(({ error }) => {
          if (error) toast.error(getAuthErrorMessage(error));
        });
      }
      onSuccess?.();
      navigate(user ? "/account?committed=1" : "/commit?sent=" + encodeURIComponent(email));
    } catch (err) {
      toast.error(t.commit.submitError);
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="text-center py-8">
        <Heart className="mx-auto mb-4 text-primary fill-current" size={32} />
        <h3 className="font-display text-2xl text-foreground mb-2">{t.commit.thanks}</h3>
        <p className="text-muted-foreground">{t.commit.thanksBody}</p>
      </div>
    );
  }

  const helpRoleOptions: { value: HelpRole; label: string }[] = [
    { value: "do_acts", label: t.commit.helpRoleDoActs },
    { value: "champion", label: t.commit.helpRoleChampion },
    { value: "ambassador", label: t.commit.helpRoleAmbassador },
    { value: "civic", label: t.commit.helpRoleCivic },
    { value: "volunteer", label: t.commit.helpRoleVolunteer },
  ];

  const orgTypeOptions: { value: OrgType; label: string }[] = [
    { value: "school", label: t.commit.orgTypeSchool },
    { value: "company", label: t.commit.orgTypeCompany },
    { value: "nonprofit", label: t.commit.orgTypeNonprofit },
    { value: "ngo", label: t.commit.orgTypeNgo },
    { value: "municipality", label: t.commit.orgTypeMunicipality },
    { value: "faith", label: t.commit.orgTypeFaith },
    { value: "other", label: t.commit.orgTypeOther },
  ];

  const lastNameLabel = (idPrefix: string) => (
    <Label htmlFor={`${idPrefix}-last`} className="flex items-center gap-1.5 h-5">
      {t.commit.lastNameLabel}
      <Tooltip>
        <TooltipTrigger asChild>
          <button type="button" aria-label={t.commit.publicNameHint} className="text-muted-foreground hover:text-foreground">
            <Info size={14} />
          </button>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">{t.commit.publicNameHint}</TooltipContent>
      </Tooltip>
    </Label>
  );

  const countryField = (idPrefix: string) => (
    <div className="space-y-2">
      <Label htmlFor={`${idPrefix}-country`} className="flex items-center gap-1.5 h-5">{t.commit.countryLabel}</Label>
      <Popover open={countryOpen} onOpenChange={setCountryOpen}>
        <PopoverTrigger asChild>
          <Button
            id={`${idPrefix}-country`}
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
  );

  const emailField = (idPrefix: string) => (
    <div className="space-y-2">
      <Label htmlFor={`${idPrefix}-email`} className="flex items-center gap-1.5 h-5">
        {t.commit.emailLabel}
        <Tooltip>
          <TooltipTrigger asChild>
            <button type="button" aria-label={t.commit.emailHint} className="text-muted-foreground hover:text-foreground">
              <Info size={14} />
            </button>
          </TooltipTrigger>
          <TooltipContent>{t.commit.emailHint}</TooltipContent>
        </Tooltip>
      </Label>
      <Input
        id={`${idPrefix}-email`}
        type="email"
        required
        maxLength={200}
        placeholder={t.commit.emailPlaceholder}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        readOnly={!!prefilledEmail}
        className={prefilledEmail ? "bg-muted/40" : undefined}
      />
      {prefilledEmail && onClearPrefilledEmail && (
        <button
          type="button"
          onClick={() => { onClearPrefilledEmail(); setEmail(""); }}
          className="text-xs text-terracotta hover:underline"
        >
          {t.share.notYou}
        </button>
      )}
    </div>
  );


  return (
    <TooltipProvider delayDuration={150}>
    <Tabs
      value={mode}
      onValueChange={(v) => {
        const nextMode = v as Mode;
        setMode(nextMode);
        if (nextMode === "organization" && pledgeCount < 100) setPledge(100);
      }}
      className="w-full"
    >
      <TabsList className="grid grid-cols-2 w-full mb-6">
        <TabsTrigger value="individual">{t.commit.tabIndividual}</TabsTrigger>
        <TabsTrigger value="organization">{t.commit.tabOrganization}</TabsTrigger>
      </TabsList>

      <form onSubmit={handleSubmit} className="space-y-5">
        <TabsContent value="individual" className="space-y-5 mt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ind-name" className="flex items-center gap-1.5 h-5">{t.commit.firstNameLabel}</Label>
              <Input
                id="ind-name"
                required
                maxLength={60}
                placeholder={t.commit.firstNamePlaceholder}
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              {lastNameLabel("ind")}
              <Input
                id="ind-last"
                required
                maxLength={60}
                placeholder={t.commit.lastNamePlaceholder}
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>
            {emailField("ind")}
            {countryField("ind")}
          </div>
          <p className="text-xs text-muted-foreground -mt-2">{t.commit.publicNameHint}</p>

          <div className="space-y-2">
            <Label htmlFor="ind-role" className="flex items-center gap-1.5 h-5">{t.commit.helpRoleLabel}</Label>
            <Select value={helpRole} onValueChange={(v) => setHelpRole(v as HelpRole)}>
              <SelectTrigger id="ind-role">
                <SelectValue placeholder={t.commit.helpRolePlaceholder} />
              </SelectTrigger>
              <SelectContent>
                {helpRoleOptions.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </TabsContent>


        <TabsContent value="organization" className="space-y-5 mt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
            <div className="space-y-2">
              <Label htmlFor="org-name" className="flex items-center gap-1.5 h-5">{t.commit.orgNameLabel}</Label>
              <Input
                id="org-name"
                required
                maxLength={120}
                placeholder={t.commit.orgNamePlaceholder}
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="org-type" className="flex items-center gap-1.5 h-5">{t.commit.orgTypeLabel}</Label>
              <Select value={orgType} onValueChange={(v) => setOrgType(v as OrgType)}>
                <SelectTrigger id="org-type">
                  <SelectValue placeholder={t.commit.orgTypePlaceholder} />
                </SelectTrigger>
                <SelectContent>
                  {orgTypeOptions.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="org-chapter" className="flex items-center gap-1.5 h-5">{t.commit.chapterLabel}</Label>
              <Input
                id="org-chapter"
                maxLength={120}
                placeholder={t.commit.chapterPlaceholder}
                value={chapter}
                onChange={(e) => setChapter(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="org-web" className="flex items-center gap-1.5 h-5">{t.commit.orgWebsiteLabel}</Label>
              <Input
                id="org-web"
                type="text"
                inputMode="url"
                required
                maxLength={300}
                placeholder={t.commit.orgWebsitePlaceholder}
                value={orgWebsite}
                onChange={(e) => setOrgWebsite(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="org-name-contact" className="flex items-center gap-1.5 h-5">{t.commit.firstNameLabel}</Label>
              <Input
                id="org-name-contact"
                maxLength={60}
                placeholder={t.commit.firstNamePlaceholder}
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              {lastNameLabel("org")}
              <Input
                id="org-last"
                required
                maxLength={60}
                placeholder={t.commit.lastNamePlaceholder}
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>
            {emailField("org")}
            {countryField("org")}
          </div>
          <p className="text-xs text-muted-foreground -mt-2">{t.commit.publicNameHint}</p>



        </TabsContent>

        {mode === "organization" && (
          <div className="space-y-3">
            <Label htmlFor="pledge" className="whitespace-pre-line">
              {t.commit.orgPledgeLabel}
            </Label>
            <div className="flex flex-wrap gap-2">
              {GROUP_PRESETS.map((n) => (
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
                id="pledge"
                type="number"
                inputMode="numeric"
                min={100}
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
                  const next = Number.isFinite(parsed)
                    ? Math.min(1000000000, Math.max(100, parsed))
                    : 100;
                  setPledge(next);
                }}
                className="w-28"
              />
            </div>
            <p className="text-xs text-muted-foreground">{t.commit.pledgeHint}</p>
          </div>
        )}


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
          {submitting ? t.commit.submitting : mode === "organization" ? t.commit.submitOrg : t.commit.submit}
        </Button>
        {mode === "organization" && (
          <p className="text-xs text-muted-foreground leading-relaxed">{t.commit.orgCertify}</p>
        )}
      </form>
    </Tabs>
    </TooltipProvider>
  );
}
