import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";

import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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

type Mode = "initial" | "full" | "custom";

interface Props {
  userId: string;
  profile: {
    first_name?: string | null;
    last_name?: string | null;
    country?: string | null;
    public_name_mode?: string | null;
    custom_display_name?: string | null;
    display_name?: string | null;
  } | null;
  onSaved?: () => void;
}

const NAME_RE = /^[\p{L}\p{N} .\-'_]{2,30}$/u;
const RESERVED = ["pasalo", "pásalo", "palante", "pa'lante", "admin", "moderator", "support", "official"];

function isReserved(v: string) {
  const low = v.toLowerCase();
  return RESERVED.some((r) => low.includes(r));
}

export default function ProfileSettingsCard({ userId, profile, onSaved }: Props) {
  const { t } = useLanguage();
  const [firstName, setFirstName] = useState(profile?.first_name ?? "");
  const [lastName, setLastName] = useState(profile?.last_name ?? "");
  const [country, setCountry] = useState(profile?.country ?? "");
  const [countryOpen, setCountryOpen] = useState(false);
  const [mode, setMode] = useState<Mode>((profile?.public_name_mode as Mode) || "initial");
  const [custom, setCustom] = useState(profile?.custom_display_name ?? "");
  const [checking, setChecking] = useState(false);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setFirstName(profile?.first_name ?? "");
    setLastName(profile?.last_name ?? "");
    setCountry(profile?.country ?? "");
    setMode(((profile?.public_name_mode as Mode) || "initial") as Mode);
    setCustom(profile?.custom_display_name ?? "");
  }, [profile]);

  const trimmedCustom = custom.trim();
  const customValid = NAME_RE.test(trimmedCustom) && !isReserved(trimmedCustom);

  // Debounced availability check
  useEffect(() => {
    if (mode !== "custom" || !trimmedCustom) {
      setAvailable(null);
      return;
    }
    if (!customValid) {
      setAvailable(null);
      return;
    }
    if (trimmedCustom.toLowerCase() === (profile?.custom_display_name ?? "").toLowerCase()) {
      setAvailable(true);
      return;
    }
    let cancelled = false;
    setChecking(true);
    const id = setTimeout(async () => {
      const { data } = await supabase.rpc("is_display_name_available", { candidate: trimmedCustom });
      if (!cancelled) {
        setAvailable(data === true);
        setChecking(false);
      }
    }, 450);
    return () => {
      cancelled = true;
      clearTimeout(id);
      setChecking(false);
    };
  }, [trimmedCustom, mode, customValid, profile?.custom_display_name]);

  const preview = useMemo(() => {
    const f = firstName.trim();
    const l = lastName.trim();
    if (mode === "custom" && trimmedCustom) return trimmedCustom;
    if (mode === "full" && f) return `${f} ${l}`.trim();
    if (f && l) return `${f} ${l.charAt(0).toUpperCase()}.`;
    return f || profile?.display_name || "";
  }, [mode, trimmedCustom, firstName, lastName, profile?.display_name]);

  async function save() {
    if (mode === "custom" && (!customValid || available === false)) {
      toast.error(customValid ? t.account.profileTaken : t.account.profileInvalid);
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        first_name: firstName.trim() || null,
        last_name: lastName.trim() || null,
        country: country || null,
        public_name_mode: mode,
        custom_display_name: mode === "custom" ? trimmedCustom : profile?.custom_display_name ?? null,
      })
      .eq("user_id", userId);
    setSaving(false);
    if (error) {
      toast.error(t.account.profileSaveError);
      return;
    }
    toast.success(t.account.profileSaved);
    onSaved?.();
  }

  return (
    <section className="bg-background border border-border rounded-2xl p-6 md:p-8 space-y-6">
      <div>
        <h2 className="font-serif text-xl mb-1">{t.account.profileTitle}</h2>
        <p className="text-sm text-foreground/60">{t.account.profileSubtitle}</p>
      </div>

      {!profile?.country && (
        <p className="text-sm rounded-xl bg-terracotta/10 text-terracotta px-4 py-3">
          {t.account.profileCountryPrompt}
        </p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="pf-first">{t.account.profileFirstName}</Label>
          <Input id="pf-first" maxLength={60} value={firstName} onChange={(e) => setFirstName(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="pf-last">{t.account.profileLastName}</Label>
          <Input id="pf-last" maxLength={60} value={lastName} onChange={(e) => setLastName(e.target.value)} />
        </div>
      </div>

      <div className="space-y-2">
        <Label>{t.account.profileCountry}</Label>
        <Popover open={countryOpen} onOpenChange={setCountryOpen}>
          <PopoverTrigger asChild>
            <Button type="button" variant="outline" role="combobox" aria-expanded={countryOpen} className="w-full justify-between font-normal">
              {country || t.account.profileCountryPlaceholder}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
            <Command>
              <CommandInput placeholder={t.account.profileCountryPlaceholder} />
              <CommandList>
                <CommandEmpty>{t.account.profileCountryEmpty}</CommandEmpty>
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
                      <Check className={cn("mr-2 h-4 w-4", country === c ? "opacity-100" : "opacity-0")} />
                      {c}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      <div className="space-y-3">
        <Label>{t.account.profilePublicName}</Label>
        <RadioGroup value={mode} onValueChange={(v) => setMode(v as Mode)} className="space-y-2">
          <div className="flex items-center gap-2">
            <RadioGroupItem value="initial" id="pn-initial" />
            <Label htmlFor="pn-initial" className="font-normal">{t.account.profileModeInitial}</Label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem value="full" id="pn-full" />
            <Label htmlFor="pn-full" className="font-normal">{t.account.profileModeFull}</Label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem value="custom" id="pn-custom" />
            <Label htmlFor="pn-custom" className="font-normal">{t.account.profileModeCustom}</Label>
          </div>
        </RadioGroup>

        {mode === "custom" && (
          <div className="space-y-1.5">
            <Input
              maxLength={30}
              placeholder={t.account.profileCustomPlaceholder}
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              aria-describedby="pn-custom-status"
            />
            <p id="pn-custom-status" className="text-xs flex items-center gap-1.5">
              {trimmedCustom && isReserved(trimmedCustom) ? (
                <span className="text-destructive">{t.account.profileReserved}</span>
              ) : trimmedCustom && !customValid ? (
                <span className="text-destructive">{t.account.profileInvalid}</span>
              ) : checking ? (
                <span className="text-foreground/60 inline-flex items-center gap-1.5">
                  <Loader2 size={12} className="animate-spin" />
                  {t.account.profileChecking}
                </span>
              ) : available === true ? (
                <span className="text-sage">{t.account.profileAvailable}</span>
              ) : available === false ? (
                <span className="text-destructive">{t.account.profileTaken}</span>
              ) : (
                <span className="text-foreground/50">{t.account.profileInvalid}</span>
              )}
            </p>
          </div>
        )}

        {preview && (
          <p className="text-sm text-foreground/70">
            {t.account.profilePreview}{" "}
            <span className="font-semibold text-foreground">{preview}</span>
          </p>
        )}
      </div>

      <Button onClick={save} disabled={saving}>
        {saving && <Loader2 size={16} className="mr-2 animate-spin" />}
        {t.account.profileSave}
      </Button>
    </section>
  );
}
