export const PASSWORD_HINT = "At least 8 characters, with 1 uppercase letter and 1 number.";

/** Returns a user-facing error message, or null if the password meets the bar. */
export function validatePassword(pw: string): string | null {
  if (pw.length < 8) return "Password must be at least 8 characters.";
  if (!/[A-Z]/.test(pw)) return "Password must include at least one uppercase letter.";
  if (!/[0-9]/.test(pw)) return "Password must include at least one number.";
  return null;
}
