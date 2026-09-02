import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@shared/contexts/AuthContext";
import { useLanguage } from "@shared/contexts/LanguageContext";
import { supabase } from "@shared/integrations/supabase/client";
import { fetchLegalVersions, logConsent } from "@shared/lib/legal";
import { Button } from "@shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@shared/components/ui/dialog";
import { toast } from "sonner";

/**
 * If a logged-in user has accepted an older MAJOR version of Terms or Privacy
 * than what's currently in effect, prompt them to re-accept before continuing.
 */
export default function ReconsentGate() {
  const { user, loading } = useAuth();
  const { t, lang } = useLanguage();
  const location = useLocation();
  const onLegalPage = location.pathname === "/terms" || location.pathname === "/privacy";
  const [needs, setNeeds] = useState<{ terms: boolean; privacy: boolean } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (loading || !user) {
      setNeeds(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const versions = await fetchLegalVersions();
      const { data } = await supabase
        .from("profiles")
        .select("terms_major_accepted, privacy_major_accepted")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled) return;
      const t_acc = (data?.terms_major_accepted ?? 0) as number;
      const p_acc = (data?.privacy_major_accepted ?? 0) as number;
      const needsTerms = (versions.terms.major ?? 1) > t_acc;
      const needsPrivacy = (versions.privacy.major ?? 1) > p_acc;
      // Only prompt if a record was previously set OR the current major > 0.
      // For brand-new accounts created after this gate exists, signup writes
      // the latest majors immediately, so the user won't see the prompt.
      // For pre-existing accounts (no value yet), treat as needing re-consent.
      if (needsTerms || needsPrivacy) {
        setNeeds({ terms: needsTerms, privacy: needsPrivacy });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, loading]);

  async function handleAccept() {
    if (!user) return;
    setBusy(true);
    try {
      const versions = await fetchLegalVersions();
      await Promise.all([
        logConsent({ user_id: user.id, context: "reconsent" }),
        supabase
          .from("profiles")
          .update({
            terms_version_accepted: versions.terms.version,
            privacy_version_accepted: versions.privacy.version,
            terms_major_accepted: versions.terms.major,
            privacy_major_accepted: versions.privacy.major,
          })
          .eq("user_id", user.id),
      ]);
      setNeeds(null);
    } catch (e) {
      console.error(e);
      toast.error(lang === "es" ? "No se pudo guardar tu consentimiento." : "Could not save your consent.");
    } finally {
      setBusy(false);
    }
  }

  const open = !!needs && !onLegalPage;
  return (
    <Dialog open={open} onOpenChange={() => { /* blocking */ }}>
      {/* Mandatory and non-dismissible, so it must sit above the welcome
          onboarding carousel (z-[70]) too — a re-consent gate blocking
          nothing but an invisible click-catcher behind that carousel
          isn't blocking anything at all. */}
      <DialogContent
        className="max-w-md z-[90]"
        overlayClassName="z-[90]"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>{t.legal?.reconsentTitle ?? "We've updated our policies"}</DialogTitle>
          <DialogDescription className="leading-relaxed pt-2">
            {t.legal?.reconsentBody ??
              "Please review and accept the updated documents to continue using Pásalo Pa'lante."}
          </DialogDescription>
        </DialogHeader>
        <ul className="text-sm space-y-2 my-2">
          {needs?.terms && (
            <li>
              •{" "}
              <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-primary underline">
                {t.legal?.terms ?? "Terms of Service"}
              </a>
            </li>
          )}
          {needs?.privacy && (
            <li>
              •{" "}
              <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-primary underline">
                {t.legal?.privacy ?? "Privacy Policy"}
              </a>
            </li>
          )}
        </ul>
        <DialogFooter>
          <Button onClick={handleAccept} disabled={busy} className="w-full">
            {busy ? "…" : t.legal?.iAgree ?? "I agree"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
