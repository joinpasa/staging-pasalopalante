import { defineConfig } from "vitest/config";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));

/**
 * Database logic tests: run SQL from supabase/migrations against an
 * in-process Postgres (PGlite) — no Supabase project, server or Docker
 * needed. Same `root` pinning as tests/repo-invariants.
 */
export default defineConfig({
  root: here,
  test: {
    environment: "node",
    globals: true,
    include: ["*.{test,spec}.ts"],
    testTimeout: 30000,
  },
});
