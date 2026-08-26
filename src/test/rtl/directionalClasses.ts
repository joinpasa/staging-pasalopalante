import fs from "node:fs";
import path from "node:path";

/**
 * Tailwind classes that are physical (LTR-only) and break in RTL.
 * Prefer the logical equivalents: ms/me, ps/pe, start/end, text-start/text-end.
 */
export const DIRECTIONAL_PATTERN =
  /(?:^|[\s"'`:])(?:-?(?:ml|mr|pl|pr|left|right)-[a-z0-9.[\]/%-]+|text-(?:left|right))(?=$|[\s"'`])/g;

const ROOT = path.resolve(__dirname, "../../..");
const SRC = path.join(ROOT, "src");

/** shadcn primitives are vendored and handled by Radix's DirectionProvider. */
const IGNORED_DIRS = [path.join(SRC, "components", "ui"), path.join(SRC, "test")];

function walk(dir: string, out: string[] = []): string[] {
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
  for (const file of walk(SRC)) {
    const matches = fs.readFileSync(file, "utf8").match(DIRECTIONAL_PATTERN);
    if (!matches?.length) continue;
    result[path.relative(ROOT, file).split(path.sep).join("/")] = matches.length;
  }
  return result;
}
