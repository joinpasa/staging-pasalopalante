import fs from "node:fs";
import path from "node:path";
import type { Plugin } from "vite";

/**
 * The preview's private data (this week's plan, real comments) lives in src/private, which git
 * ignores. This plugin hands it to the app as `virtual:hub-private` while developing and testing,
 * and hands over nothing in a real build, so it can never reach a deployed bundle, even when the
 * build runs on a computer that has the files.
 */
export function hubPrivate(): Plugin {
  let include = true;
  const read = (file: string) => {
    const p = path.resolve(__dirname, "src/private", file);
    return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, "utf8")) : null;
  };
  return {
    name: "hub-private",
    configResolved(config) {
      include = config.command === "serve" || config.mode === "test" || process.env.HUB_PREVIEW_DATA === "1";
    },
    resolveId(id) {
      return id === "virtual:hub-private" ? "\0hub-private" : undefined;
    },
    load(id) {
      if (id !== "\0hub-private") return undefined;
      const data = include ? { plan: read("plan.json"), inbox: read("inbox.json") } : { plan: null, inbox: null };
      return `export default ${JSON.stringify(data)};`;
    },
  };
}
