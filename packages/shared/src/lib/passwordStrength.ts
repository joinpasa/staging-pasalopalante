export const PASSWORD_HINT = "At least 8 characters, with 1 uppercase letter and 1 number.";

/** Returns a user-facing error message, or null if the password meets the bar. */
export function validatePassword(
  pw: string,
  messages = {
    tooShort: "Password must be at least 8 characters.",
    needsUppercase: "Password must include at least one uppercase letter.",
    needsNumber: "Password must include at least one number.",
  },
): string | null {
  if (pw.length < 8) return messages.tooShort;
  if (!/[A-Z]/.test(pw)) return messages.needsUppercase;
  if (!/[0-9]/.test(pw)) return messages.needsNumber;
  return null;
}
