// Soft, light multi-color gradients built from the warm palette.
// All values stay light so dark text remains legible. Subtle variation
// keeps each card feeling distinct without being loud.
export const CARD_GRADIENTS: string[] = [
  // cream → blush → soft gold
  "linear-gradient(135deg, hsl(36 50% 96%) 0%, hsl(15 60% 92%) 55%, hsl(42 75% 88%) 100%)",
  // sand → sage tint → cream
  "linear-gradient(135deg, hsl(36 35% 94%) 0%, hsl(150 30% 90%) 55%, hsl(42 55% 93%) 100%)",
  // blush → peach → gold tint
  "linear-gradient(160deg, hsl(15 65% 94%) 0%, hsl(25 70% 90%) 50%, hsl(42 70% 90%) 100%)",
  // sage → mint → cream
  "linear-gradient(140deg, hsl(165 35% 92%) 0%, hsl(180 30% 93%) 55%, hsl(36 45% 95%) 100%)",
  // lavender → blush → cream
  "linear-gradient(135deg, hsl(280 35% 94%) 0%, hsl(330 45% 93%) 55%, hsl(36 50% 96%) 100%)",
  // sky → sand → blush
  "linear-gradient(150deg, hsl(200 50% 93%) 0%, hsl(36 40% 94%) 50%, hsl(15 55% 93%) 100%)",
  // gold → cream → sage tint
  "linear-gradient(135deg, hsl(42 75% 92%) 0%, hsl(36 50% 95%) 50%, hsl(150 30% 92%) 100%)",
  // blush → lavender → mint
  "linear-gradient(160deg, hsl(15 60% 93%) 0%, hsl(290 35% 94%) 55%, hsl(170 35% 92%) 100%)",
  // apricot → cream → soft gold
  "linear-gradient(145deg, hsl(25 75% 92%) 0%, hsl(45 60% 94%) 55%, hsl(36 50% 96%) 100%)",
  // soft teal → cream → blush
  "linear-gradient(135deg, hsl(190 40% 92%) 0%, hsl(36 45% 95%) 55%, hsl(15 55% 93%) 100%)",
];

function hashSeed(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function pickCardGradient(seed?: string | null): string {
  const key = seed && seed.length ? seed : "default";
  // mix in a secondary rotation so neighboring ids feel more random
  const h = hashSeed(key);
  const idx = (h ^ (h >>> 7)) % CARD_GRADIENTS.length;
  return CARD_GRADIENTS[idx];
}
