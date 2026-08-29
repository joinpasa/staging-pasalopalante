import { defineConfig } from "vitest/config";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));

/**
 * Cross-cutting static-analysis checks (RTL class discipline, i18n fallback
 * discipline) that scan all three source trees (website, app, shared) at
 * once — they don't belong to any single package. `root` is pinned here so
 * this config behaves the same whether it's invoked from the repo root
 * (`vitest run --config tests/repo-invariants/vitest.config.ts`) or from
 * inside this directory.
 */
export default defineConfig({
  root: here,
  test: {
    environment: "node",
    globals: true,
    include: ["*.{test,spec}.ts"],
  },
});
