import fs from "node:fs";
import path from "node:path";

/**
 * Tailwind classes that are physical (LTR-only) and break in RTL.
 * Prefer the logical equivalents: ms/me, ps/pe, start/end, text-start/text-end.
 */
export const DIRECTIONAL_PATTERN =
  /(?:^|[\s"'`:])(?:-?(?:ml|mr|pl|pr|left|right)-[a-z0-9.[\]/%-]+|text-(?:left|right))(?=$|[\s"'`])/g;

const ROOT = path.resolve(__dirname, "../..");

/** The three independent source trees the split produced. */
const SRC_ROOTS = ["apps/website/src", "apps/app/src", "packages/shared/src"].map((p) =>
  path.join(ROOT, p),
);

/** shadcn primitives are vendored and handled by Radix's DirectionProvider. */
const IGNORED_DIRS = [
  path.join(ROOT, "packages/shared/src/components/ui"),
  path.join(ROOT, "packages/shared/src/test"),
  path.join(ROOT, "apps/website/src/test"),
  path.join(ROOT, "apps/app/src/test"),
];

function walk(dir: string, out: string[] = []): string[] {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (IGNORED_DIRS.some((d) => full === d || full.startsWith(d + path.sep))) continue;
      walk(full, out);
    } else if (entry.name.endsWith(".tsx")) {
      out.push(full);
    }
  }
  return out;
}

/** file (posix, repo-relative) -> number of physical direction classes */
export function collectDirectionalUsage(): Record<string, number> {
  const result: Record<string, number> = {};
  for (const srcRoot of SRC_ROOTS) {
    for (const file of walk(srcRoot)) {
      const matches = fs.readFileSync(file, "utf8").match(DIRECTIONAL_PATTERN);
      if (!matches?.length) continue;
      result[path.relative(ROOT, file).split(path.sep).join("/")] = matches.length;
    }
  }
  return result;
}
