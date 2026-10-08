// A movement-wide stat can run from "0" to "1,000,000,000+" - a fixed font
// size either wastes space on small numbers or overflows its card once the
// movement crosses into the millions/billions. Shrinks a tier at a time as
// the digit count grows instead.
export function statFontSizeClass(value: number, variant: "large" | "compact" = "large"): string {
  const digits = String(Math.max(0, Math.round(value))).length;
  if (variant === "compact") {
    if (digits >= 10) return "text-[10px]";
    if (digits >= 8) return "text-xs";
    if (digits >= 6) return "text-sm";
    return "text-[19px]";
  }
  if (digits >= 10) return "text-xs";
  if (digits >= 8) return "text-base";
  if (digits >= 6) return "text-xl";
  return "text-2xl";
}
