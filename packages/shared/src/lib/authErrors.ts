import type { AuthError } from "@supabase/supabase-js";
import { getTranslations, type Translations } from "@shared/i18n/translations";

type AuthErrorMessages = Translations["appJoin"]["authErrors"];

/**
 * Maps a Supabase auth error to copy safe to show an end user. Never passes
 * the raw provider message through — that can leak backend/provider details
 * (e.g. "over_email_send_rate_limit", SMTP failures) that read as broken or
 * unprofessional and aren't actionable for the person seeing them.
 */
export function getAuthErrorMessage(
  error: AuthError | Error | null | undefined,
  messages: AuthErrorMessages = getTranslations("en").appJoin.authErrors,
): string {
  if (!error) return messages.generic;

  const code = "code" in error ? (error as AuthError).code : undefined;

  switch (code) {
    case "over_email_send_rate_limit":
    case "over_request_rate_limit":
      return messages.rateLimited;
    case "invalid_credentials":
      return messages.invalidCredentials;
    case "user_not_found":
      return messages.userNotFound;
    case "email_not_confirmed":
      return messages.emailNotConfirmed;
    case "user_already_exists":
    case "email_exists":
    case "identity_already_exists":
      return messages.accountExists;
    case "weak_password":
      return messages.weakPassword;
    case "email_address_invalid":
      return messages.invalidEmail;
    case "otp_expired":
      return messages.linkExpired;
    case "signup_disabled":
    case "user_banned":
    case "email_provider_disabled":
      return messages.signupUnavailable;
    default:
      return messages.generic;
  }
}
