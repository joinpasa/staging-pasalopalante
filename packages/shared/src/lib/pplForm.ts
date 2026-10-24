import { supabase } from "@shared/integrations/supabase/client";
import { isRateLimitedError } from "@shared/lib/rateLimitCheer";

export type FormType = "get-involved" | "pledge" | "course-creator" | "app-join";

/** Optional A2P 10DLC SMS consent, captured on every form that collects a
 * phone number. `sms_consent_at` is when the form was submitted, i.e. when
 * the consent decision (yes or no) was recorded. */
export interface SmsConsentFields {
  sms_consent?: boolean;
  sms_consent_at?: string;
}

export interface GetInvolvedData extends SmsConsentFields {
  fullName: string;
  email: string;
  phone?: string;
  country?: string;
  city?: string;
  organization?: string;
  participantType?: string;
  message?: string;
}

export interface PledgeData extends SmsConsentFields {
  fullName: string;
  email: string;
  phone?: string;
  country?: string;
  pledgeCount?: number;
  message?: string;
  /** Individual vs. Organization tab on the /commit pledge form — drives GHL category tagging. */
  mode?: "individual" | "organization";
  /** Set when mode is "organization" — school/company/nonprofit/ngo/faith/other. */
  orgType?: string;
  /** Set when mode is "individual" — do_acts/champion/ambassador/civic/volunteer. */
  helpRole?: string;
  /** "onboarding" routes pledgeCount to GHL's separate Commitment field
   *  instead of Pledge, so the post-signup onboarding-carousel number never
   *  overwrites the one from the original /commit (or app join) pledge. */
  pledgeContext?: "commit" | "onboarding";
}

export interface CourseCreatorData extends SmsConsentFields {
  fullName: string;
  email: string;
  phone?: string;
  country?: string;
  organization?: string;
  social?: string;
  interests?: string[]; // areas of contribution
  capacity?: string[];
  capacityDetails?: string;
  logoUrl?: string;
  focus?: string;
  network?: string;
  questions?: string;
  consentValues?: boolean;
  consentComms?: boolean;
}

export async function submitPPLForm(
  formType: FormType,
  data: GetInvolvedData | PledgeData | CourseCreatorData
): Promise<{ success: boolean; error?: string }> {
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const enrichedData = {
      ...data,
      utm_source:   urlParams.get("utm_source")   || "",
      utm_medium:   urlParams.get("utm_medium")   || "",
      utm_campaign: urlParams.get("utm_campaign") || "",
    };

    const { data: result, error } = await supabase.functions.invoke("ppl-signup", {
      body: { formType, data: enrichedData },
    });

    if (error) {
      console.error("PPL form error:", error);
      // "rate_limited" is a sentinel callers check for to show one of several
      // cheer-phrase toasts instead of a generic error message.
      return { success: false, error: isRateLimitedError(error) ? "rate_limited" : error.message };
    }

    return { success: true };
  } catch (err) {
    console.error("PPL form network error:", err);
    return { success: false, error: "Network error — please try again" };
  }
}
