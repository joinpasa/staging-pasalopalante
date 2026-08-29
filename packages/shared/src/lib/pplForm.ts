import { supabase } from "@shared/integrations/supabase/client";

export type FormType = "get-involved" | "pledge" | "course-creator";

export interface GetInvolvedData {
  fullName: string;
  email: string;
  phone?: string;
  country?: string;
  city?: string;
  organization?: string;
  participantType?: string;
  message?: string;
}

export interface PledgeData {
  fullName: string;
  email: string;
  country?: string;
  pledgeCount?: number;
  message?: string;
}

export interface CourseCreatorData {
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
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error("PPL form network error:", err);
    return { success: false, error: "Network error — please try again" };
  }
}
