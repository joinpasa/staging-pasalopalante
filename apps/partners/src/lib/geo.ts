import { COUNTRIES } from "@shared/data/countries";
import type { Lang } from "./i18n";

/** The site's country list (English names), the same one the pledge forms use. */
export const COUNTRY_NAMES: string[] = [...COUNTRIES];

/** Our country names -> the names in world-atlas countries-110m, where they differ. */
const ATLAS_NAME: Record<string, string> = {
  "United States": "United States of America",
  "Democratic Republic of the Congo": "Dem. Rep. Congo",
  "Dominican Republic": "Dominican Rep.",
  "Central African Republic": "Central African Rep.",
  "Equatorial Guinea": "Eq. Guinea",
  Eswatini: "eSwatini",
  "Solomon Islands": "Solomon Is.",
  "Bosnia and Herzegovina": "Bosnia and Herz.",
  "North Macedonia": "Macedonia",
  "South Sudan": "S. Sudan",
};

export function atlasName(country: string) {
  return ATLAS_NAME[country] ?? country;
}

/** Countries too small for the 110m map: a point to put their marker on ([lng, lat]). */
export const SMALL_COUNTRIES: Record<string, [number, number]> = {
  Singapore: [103.82, 1.35],
  Malta: [14.4, 35.9],
  Andorra: [1.52, 42.51],
  Barbados: [-59.55, 13.15],
  Mauritius: [57.55, -20.3],
  "Cayman Islands": [-81.25, 19.3],
  Liechtenstein: [9.55, 47.15],
  "Saint Kitts and Nevis": [-62.75, 17.3],
  Bahrain: [50.55, 26.05],
  Maldives: [73.5, 3.2],
  Monaco: [7.42, 43.74],
  "San Marino": [12.45, 43.94],
  "Vatican City": [12.45, 41.9],
  Seychelles: [55.45, -4.6],
  Comoros: [43.3, -11.7],
  "Cabo Verde": [-23.6, 15.1],
  "São Tomé and Príncipe": [6.6, 0.3],
  Grenada: [-61.7, 12.1],
  "Saint Lucia": [-60.98, 13.9],
  "Saint Vincent and the Grenadines": [-61.2, 13.25],
  Dominica: [-61.35, 15.4],
  "Antigua and Barbuda": [-61.8, 17.1],
  Tonga: [-175.2, -21.2],
  Samoa: [-172.1, -13.75],
  Kiribati: [173, 1.4],
  "Marshall Islands": [171.2, 7.1],
  Micronesia: [158.2, 6.9],
  Palau: [134.5, 7.5],
  Nauru: [166.9, -0.5],
  Tuvalu: [179.2, -8.5],
  Bahamas: [-77.4, 25.03],
};

/** A country's name in the reader's language, from its English name. */
const CODE_BY_NAME = (() => {
  const map = new Map<string, string>();
  try {
    const en = new Intl.DisplayNames(["en"], { type: "region" });
    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    for (const a of letters) for (const b of letters) {
      const code = a + b;
      let name: string | undefined;
      try {
        name = en.of(code);
      } catch {
        name = undefined;
      }
      if (name && name !== code) map.set(name.toLowerCase(), code);
    }
  } catch {
    /* no Intl.DisplayNames: English names everywhere */
  }
  const extra: Record<string, string> = {
    "democratic republic of the congo": "CD",
    congo: "CG",
    "côte d'ivoire": "CI",
    "bosnia and herzegovina": "BA",
    "trinidad and tobago": "TT",
    "antigua and barbuda": "AG",
    "saint kitts and nevis": "KN",
    "saint vincent and the grenadines": "VC",
    "são tomé and príncipe": "ST",
    myanmar: "MM",
    palestine: "PS",
    "vatican city": "VA",
    micronesia: "FM",
  };
  for (const [k, v] of Object.entries(extra)) map.set(k, v);
  return map;
})();

export function countryLabel(country: string, lang: Lang) {
  if (lang === "en") return country;
  const code = CODE_BY_NAME.get(country.toLowerCase());
  if (!code) return country;
  try {
    return new Intl.DisplayNames([lang], { type: "region" }).of(code) ?? country;
  } catch {
    return country;
  }
}

/** A small, stable offset so several members in one country don't sit on one point. */
export function jitter(seed: string, spread = 2.2): [number, number] {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  const a = ((h >>> 0) % 1000) / 1000;
  const b = (((h >>> 10) >>> 0) % 1000) / 1000;
  return [(a - 0.5) * spread, (b - 0.5) * spread * 0.7];
}
