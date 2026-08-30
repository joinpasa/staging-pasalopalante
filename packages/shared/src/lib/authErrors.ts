import type { AuthError } from "@supabase/supabase-js";

/**
 * Maps a Supabase auth error to copy safe to show an end user. Never passes
 * the raw provider message through — that can leak backend/provider details
 * (e.g. "over_email_send_rate_limit", SMTP failures) that read as broken or
 * unprofessional and aren't actionable for the person seeing them.
 */
export function getAuthErrorMessage(error: AuthError | Error | null | undefined): string {
  if (!error) return "Something went wrong. Please try again.";

  const code = "code" in error ? (error as AuthError).code : undefined;

  switch (code) {
    case "over_email_send_rate_limit":
    case "over_request_rate_limit":
      return "Too many attempts — please wait a few minutes and try again.";
    case "invalid_credentials":
      return "Incorrect email or password.";
    case "email_not_confirmed":
      return "Please confirm your email address first — check your inbox for the link we sent.";
    case "user_already_exists":
    case "email_exists":
    case "identity_already_exists":
      return "An account with that email already exists. Try signing in instead.";
    case "weak_password":
      return "Please choose a stronger password.";
    case "email_address_invalid":
      return "Please enter a valid email address.";
    case "otp_expired":
      return "That link has expired — request a new one.";
    case "signup_disabled":
    case "user_banned":
    case "email_provider_disabled":
      return "Sign-up isn't available right now. Please try again later.";
    default:
      return "Something went wrong. Please try again.";
  }
}
