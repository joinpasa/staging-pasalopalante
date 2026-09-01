/**
 * DeepL-backed translation sync for packages/shared/src/i18n.
 *
 * English (`translations.en` in translations.ts) is the source of truth.
 * For every other locale in LANGUAGES, this fills in missing keys (and, with
 * --refresh, re-translates existing ones) using the DeepL API, then writes
 * the result back into whichever file that locale actually lives in:
 *   - es / fr / de live inline in translations.ts (edited via ts-morph, so
 *     the rest of the 2800-line file is untouched byte-for-byte)
 *   - zh / hi / ar / bn / pt / ru / sl live in locales/<code>.json (edited
 *     as plain JSON)
 * Adding a future locale to LANGUAGES (either inline or as a new JSON file)
 * needs no changes here — the storage format is auto-detected per code.
 *
 * Every key this script writes is recorded in i18n/needs-review.json so a
 * native speaker knows what's machine output vs. human-reviewed copy.
 *
 * Usage (all flags optional):
 *   npm run translate -- --dry-run                  # just report what would change
 *   npm run translate                                # fill missing keys only
 *   npm run translate -- --refresh=es,fr,de          # re-translate ALL keys for these locales
 *   npm run translate -- --locales=es,fr             # restrict to specific target locales
 *   npm run translate -- --mock                      # no network call, verify the pipeline
 *
 * Requires DEEPL_API_KEY in the environment (never pass it as a CLI arg or
 * paste it anywhere this output gets logged).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Project, SyntaxKind, type ObjectLiteralExpression, type ArrayLiteralExpression } from "ts-morph";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const I18N_DIR = path.join(REPO_ROOT, "packages/shared/src/i18n");
const TRANSLATIONS_FILE = path.join(I18N_DIR, "translations.ts");
const LOCALES_DIR = path.join(I18N_DIR, "locales");
const SNAPSHOT_FILE = path.join(__dirname, "i18n/en-snapshot.json");
const NEEDS_REVIEW_FILE = path.join(__dirname, "i18n/needs-review.json");

// DeepL target-language codes that differ from our locale codes, and which
// of those support the `formality` param (DeepL rejects it for unsupported
// targets, so we only send it where it's valid).
const DEEPL_TARGET: Record<string, string> = {
  es: "ES", fr: "FR", de: "DE",
  zh: "ZH", hi: "HI", ar: "AR", bn: "BN", pt: "PT-BR", ru: "RU", sl: "SL",
};
const FORMALITY_SUPPORTED = new Set(["ES", "FR", "DE", "PT-BR", "PT-PT", "RU", "NL", "IT", "PL", "JA"]);

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------
const args = process.argv.slice(2);
const flag = (name: string) => args.includes(`--${name}`);
const listFlag = (name: string): string[] | null => {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3).split(",").map((s) => s.trim()).filter(Boolean) : null;
};
const DRY_RUN = flag("dry-run");
const MOCK = flag("mock");
const REFRESH_LOCALES = listFlag("refresh");
const ONLY_LOCALES = listFlag("locales");

// ---------------------------------------------------------------------------
// Tree helpers. Leaves are either plain strings or arrays of plain strings
// (a handful of keys, e.g. bullet lists, are stored as string[]).
// ---------------------------------------------------------------------------
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Tree = Record<string, any>;

// translations.ts mixes quoted ("navbar") and bare (navbar) property names
// across sections that were added at different times. ObjectLiteralExpression
// .getProperty(name) matches literal syntax, not the normalized name, so
// every lookup here goes through this instead.
function getPropByName(obj: ObjectLiteralExpression, name: string) {
  return obj.getProperty((p) => p.getName().replace(/^["']|["']$/g, "") === name);
}

function flatten(tree: Tree, prefix = "", out: Record<string, string> = {}): Record<string, string> {
  for (const [key, value] of Object.entries(tree)) {
    const path_ = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "string") {
      out[path_] = value;
    } else if (Array.isArray(value)) {
      value.forEach((v, i) => {
        const indexPath = `${path_}.${i}`;
        if (typeof v === "string") out[indexPath] = v;
        else if (v && typeof v === "object") flatten(v, indexPath, out);
      });
    } else if (value && typeof value === "object") {
      flatten(value, path_, out);
    }
  }
  return out;
}

function objectLiteralToPlain(obj: ObjectLiteralExpression): Tree {
  const out: Tree = {};
  for (const prop of obj.getProperties()) {
    if (!prop.isKind(SyntaxKind.PropertyAssignment)) continue;
    const name = prop.getName().replace(/^["']|["']$/g, "");
    const init = prop.getInitializer();
    if (!init) continue;
    if (init.isKind(SyntaxKind.ObjectLiteralExpression)) {
      out[name] = objectLiteralToPlain(init);
    } else if (init.isKind(SyntaxKind.StringLiteral) || init.isKind(SyntaxKind.NoSubstitutionTemplateLiteral)) {
      out[name] = init.getLiteralText();
    } else if (init.isKind(SyntaxKind.ArrayLiteralExpression)) {
      out[name] = init.getElements().map((el) => {
        if (el.isKind(SyntaxKind.StringLiteral) || el.isKind(SyntaxKind.NoSubstitutionTemplateLiteral)) return el.getLiteralText();
        if (el.isKind(SyntaxKind.ObjectLiteralExpression)) return objectLiteralToPlain(el);
        return undefined;
      }).filter((v) => v !== undefined);
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Placeholder protection.
// translations use `{token}` interpolation (e.g. "{count} acts") and a
// handful of inline HTML tags (`<br/>`, `<em>...</em>`). DeepL isn't told
// what either means, so both get swapped for plain numbered markers before
// translation and restored after. If DeepL drops or duplicates a marker, the
// key is rejected rather than written with a corrupted placeholder.
// ---------------------------------------------------------------------------
const PLACEHOLDER_RE = /\{[^{}]+\}|<[^<>]+>/g;

function protect(text: string): { masked: string; tokens: string[] } {
  const tokens: string[] = [];
  const masked = text.replace(PLACEHOLDER_RE, (m) => {
    tokens.push(m);
    return `§${tokens.length - 1}§`;
  });
  return { masked, tokens };
}

function restore(translated: string, tokens: string[]): string | null {
  const positions = new Set<number>();
  const markerRe = /§(\d+)§/g;
  let match: RegExpExecArray | null;
  while ((match = markerRe.exec(translated))) positions.add(Number(match[1]));
  if (positions.size !== tokens.length) return null; // DeepL dropped/duplicated a marker
  let result = translated;
  for (let i = 0; i < tokens.length; i++) result = result.replace(`§${i}§`, tokens[i]);
  return result;
}

// ---------------------------------------------------------------------------
// DeepL call (batched, free-tier endpoint). Mocked in --mock mode so the
// rest of the pipeline can be verified without network access or a key.
// ---------------------------------------------------------------------------
async function deeplTranslateBatch(texts: string[], targetLocale: string): Promise<string[]> {
  if (MOCK) return texts.map((t) => `[${targetLocale.toUpperCase()}] ${t}`);

  const apiKey = process.env.DEEPL_API_KEY;
  if (!apiKey) {
    throw new Error("DEEPL_API_KEY is not set. Export it in your shell before running (never paste it in chat).");
  }
  const target = DEEPL_TARGET[targetLocale];
  if (!target) throw new Error(`No DeepL target-language mapping for locale "${targetLocale}"`);

  const host = apiKey.endsWith(":fx") ? "api-free.deepl.com" : "api.deepl.com";
  const body: Record<string, unknown> = {
    text: texts,
    source_lang: "EN",
    target_lang: target,
    preserve_formatting: true,
  };
  if (FORMALITY_SUPPORTED.has(target)) body.formality = "less";

  const res = await fetch(`https://${host}/v2/translate`, {
    method: "POST",
    headers: {
      Authorization: `DeepL-Auth-Key ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`DeepL API error ${res.status}: ${await res.text()}`);
  }
  const json = (await res.json()) as { translations: { text: string }[] };
  return json.translations.map((t) => t.text);
}

const BATCH_SIZE = 50;
async function translateMany(texts: string[], targetLocale: string): Promise<string[]> {
  const out: string[] = [];
  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    out.push(...(await deeplTranslateBatch(batch, targetLocale)));
  }
  return out;
}

// ---------------------------------------------------------------------------
// Load current state
// ---------------------------------------------------------------------------
const project = new Project({
  tsConfigFilePath: path.join(REPO_ROOT, "packages/shared/tsconfig.json"),
  skipAddingFilesFromTsConfig: true,
});
const sourceFile = project.addSourceFileAtPath(TRANSLATIONS_FILE);

const translationsDecl = sourceFile.getVariableDeclarationOrThrow("translations");
let translationsInit = translationsDecl.getInitializerOrThrow();
if (translationsInit.isKind(SyntaxKind.AsExpression)) {
  translationsInit = translationsInit.getExpression();
}
if (!translationsInit.isKind(SyntaxKind.ObjectLiteralExpression)) {
  throw new Error("Expected `translations` initializer to be an object literal (optionally wrapped in `as const`)");
}
const translationsObj = translationsInit as ObjectLiteralExpression;

function getInlineLocaleObject(code: string): ObjectLiteralExpression | null {
  const prop = getPropByName(translationsObj, code);
  if (!prop || !prop.isKind(SyntaxKind.PropertyAssignment)) return null;
  const init = prop.getInitializer();
  return init && init.isKind(SyntaxKind.ObjectLiteralExpression) ? init : null;
}

const enObj = getInlineLocaleObject("en");
if (!enObj) throw new Error("Could not locate translations.en object literal");
const enTree = objectLiteralToPlain(enObj);
const enFlat = flatten(enTree);

// Snapshot of English as of the last successful run — absent on first run,
// which is exactly what makes every current EN key look "new."
const snapshot: Record<string, string> = fs.existsSync(SNAPSHOT_FILE)
  ? JSON.parse(fs.readFileSync(SNAPSHOT_FILE, "utf8"))
  : {};

const needsReview: Record<string, string[]> = fs.existsSync(NEEDS_REVIEW_FILE)
  ? JSON.parse(fs.readFileSync(NEEDS_REVIEW_FILE, "utf8"))
  : {};

// ---------------------------------------------------------------------------
// Resolve target locales generically from LANGUAGES (minus "en"), detecting
// storage format per code rather than hardcoding the locale list.
// ---------------------------------------------------------------------------
const languagesMatch = sourceFile.getFullText().match(/export const LANGUAGES:[^[]*\[([\s\S]*?)\];/);
const codeRe = /code:\s*"([a-z]{2})"/g;
const allCodes: string[] = [];
let m: RegExpExecArray | null;
if (languagesMatch) {
  while ((m = codeRe.exec(languagesMatch[1]))) allCodes.push(m[1]);
}
let targetLocales = allCodes.filter((c) => c !== "en");
if (ONLY_LOCALES) targetLocales = targetLocales.filter((c) => ONLY_LOCALES!.includes(c));

function isJsonLocale(code: string): boolean {
  return fs.existsSync(path.join(LOCALES_DIR, `${code}.json`));
}

// ---------------------------------------------------------------------------
// Per-locale sync
// ---------------------------------------------------------------------------
type PlanEntry = { locale: string; path: string; en: string };

function planForLocale(code: string): PlanEntry[] {
  const forceRefresh = REFRESH_LOCALES?.includes(code) ?? false;
  let currentFlat: Record<string, string>;

  if (isJsonLocale(code)) {
    const file = path.join(LOCALES_DIR, `${code}.json`);
    const parsed = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : {};
    currentFlat = flatten(parsed);
  } else {
    const obj = getInlineLocaleObject(code);
    currentFlat = obj ? flatten(objectLiteralToPlain(obj)) : {};
  }

  const plan: PlanEntry[] = [];
  for (const [key, enValue] of Object.entries(enFlat)) {
    const existing = currentFlat[key];
    const enChanged = snapshot[key] !== undefined && snapshot[key] !== enValue;
    const missing = existing === undefined;
    if (forceRefresh || missing || enChanged) {
      plan.push({ locale: code, path: key, en: enValue });
    }
  }
  return plan;
}

// Both setters walk the dot-path one segment at a time, consulting the EN
// tree at each step to decide whether the *next* container is an object or
// an array (a handful of keys are arrays of strings, or arrays of {title,
// why}-style objects — e.g. inspiration.ideas.words.2.title).

function setInlineValue(
  node: ObjectLiteralExpression | ArrayLiteralExpression,
  parts: string[],
  value: string,
  enNode: unknown,
) {
  const [head, ...rest] = parts;
  const headEnNode = Array.isArray(enNode) ? enNode[Number(head)] : (enNode as Tree | undefined)?.[head];

  if (rest.length === 0) {
    const text = JSON.stringify(value);
    if (node.isKind(SyntaxKind.ArrayLiteralExpression)) {
      const index = Number(head);
      while (node.getElements().length <= index) node.addElement(JSON.stringify(""));
      node.getElements()[index].replaceWithText(text);
    } else {
      const existing = getPropByName(node, head);
      if (existing && existing.isKind(SyntaxKind.PropertyAssignment)) existing.setInitializer(text);
      else node.addPropertyAssignment({ name: head, initializer: text });
    }
    return;
  }

  const nextIsArray = Array.isArray(headEnNode);
  let child: ObjectLiteralExpression | ArrayLiteralExpression;

  if (node.isKind(SyntaxKind.ArrayLiteralExpression)) {
    const index = Number(head);
    while (node.getElements().length <= index) node.addElement(nextIsArray ? "[]" : "{}");
    let el = node.getElements()[index];
    const wantKind = nextIsArray ? SyntaxKind.ArrayLiteralExpression : SyntaxKind.ObjectLiteralExpression;
    if (!el.isKind(wantKind)) {
      el.replaceWithText(nextIsArray ? "[]" : "{}");
      el = node.getElements()[index];
    }
    child = el as ObjectLiteralExpression | ArrayLiteralExpression;
  } else {
    let prop = getPropByName(node, head);
    if (nextIsArray) {
      if (!prop || !prop.isKind(SyntaxKind.PropertyAssignment) || !prop.getInitializerIfKind(SyntaxKind.ArrayLiteralExpression)) {
        node.addPropertyAssignment({ name: head, initializer: "[]" });
        prop = getPropByName(node, head);
      }
      child = (prop as ReturnType<typeof node.getPropertyOrThrow>).getInitializerIfKindOrThrow(
        SyntaxKind.ArrayLiteralExpression,
      ) as ArrayLiteralExpression;
    } else {
      if (!prop || !prop.isKind(SyntaxKind.PropertyAssignment) || !prop.getInitializerIfKind(SyntaxKind.ObjectLiteralExpression)) {
        node.addPropertyAssignment({ name: head, initializer: "{}" });
        prop = getPropByName(node, head);
      }
      child = (prop as ReturnType<typeof node.getPropertyOrThrow>).getInitializerIfKindOrThrow(
        SyntaxKind.ObjectLiteralExpression,
      ) as ObjectLiteralExpression;
    }
  }

  setInlineValue(child, rest, value, headEnNode);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function setJsonValue(node: any, parts: string[], value: string, enNode: unknown) {
  const [head, ...rest] = parts;
  const headEnNode = Array.isArray(enNode) ? enNode[Number(head)] : (enNode as Tree | undefined)?.[head];

  if (rest.length === 0) {
    if (Array.isArray(node)) node[Number(head)] = value;
    else node[head] = value;
    return;
  }

  const nextIsArray = Array.isArray(headEnNode);
  let child: unknown;

  if (Array.isArray(node)) {
    const index = Number(head);
    while (node.length <= index) node.push(nextIsArray ? [] : {});
    if (nextIsArray && !Array.isArray(node[index])) node[index] = [];
    if (!nextIsArray && (typeof node[index] !== "object" || node[index] === null || Array.isArray(node[index]))) node[index] = {};
    child = node[index];
  } else {
    if (nextIsArray) {
      if (!Array.isArray(node[head])) node[head] = [];
    } else if (typeof node[head] !== "object" || node[head] === null || Array.isArray(node[head])) {
      node[head] = {};
    }
    child = node[head];
  }

  setJsonValue(child, rest, value, headEnNode);
}

async function main() {
  console.log(`Target locales: ${targetLocales.join(", ")}`);
  console.log(`Source strings (en): ${Object.keys(enFlat).length} keys, ${Object.values(enFlat).reduce((n, s) => n + s.length, 0)} chars`);
  if (REFRESH_LOCALES?.length) console.log(`Force-refreshing: ${REFRESH_LOCALES.join(", ")}`);

  let totalChars = 0;
  const perLocalePlans: Record<string, PlanEntry[]> = {};
  for (const code of targetLocales) {
    const plan = planForLocale(code);
    perLocalePlans[code] = plan;
    const chars = plan.reduce((n, e) => n + e.en.length, 0);
    totalChars += chars;
    console.log(`  ${code}: ${plan.length} keys to translate (${chars} source chars)`);
  }
  console.log(`Total source characters this run would send to DeepL: ${totalChars}`);

  if (DRY_RUN) {
    console.log("--dry-run: no API calls made, no files written.");
    return;
  }
  if (totalChars === 0) {
    console.log("Nothing to translate.");
  }

  for (const code of targetLocales) {
    const plan = perLocalePlans[code];
    if (plan.length === 0) continue;

    const translated = await translateMany(
      plan.map((e) => protect(e.en).masked),
      code,
    );

    const rejected: string[] = [];
    const accepted: { path: string; value: string }[] = [];
    plan.forEach((entry, i) => {
      const { tokens } = protect(entry.en);
      const restored = restore(translated[i], tokens);
      if (restored === null) {
        rejected.push(entry.path);
      } else {
        accepted.push({ path: entry.path, value: restored });
      }
    });

    if (isJsonLocale(code)) {
      const file = path.join(LOCALES_DIR, `${code}.json`);
      const root: Tree = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : {};
      for (const { path: p, value } of accepted) setJsonValue(root, p.split("."), value, enTree);
      fs.writeFileSync(file, `${JSON.stringify(root, null, 1)}\n`);
    } else {
      const obj = getInlineLocaleObject(code);
      if (!obj) throw new Error(`Expected an inline object literal for locale "${code}"`);
      for (const { path: p, value } of accepted) setInlineValue(obj, p.split("."), value, enTree);
    }

    const reviewSet = new Set(needsReview[code] ?? []);
    for (const { path: p } of accepted) reviewSet.add(p);
    needsReview[code] = [...reviewSet].sort();

    console.log(`${code}: wrote ${accepted.length} keys${rejected.length ? `, skipped ${rejected.length} (placeholder mismatch, needs manual translation): ${rejected.join(", ")}` : ""}`);
  }

  sourceFile.saveSync();
  fs.mkdirSync(path.dirname(SNAPSHOT_FILE), { recursive: true });
  fs.writeFileSync(SNAPSHOT_FILE, `${JSON.stringify(enFlat, null, 2)}\n`);
  fs.writeFileSync(NEEDS_REVIEW_FILE, `${JSON.stringify(needsReview, null, 2)}\n`);
  console.log("Done. Snapshot and needs-review list updated.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
