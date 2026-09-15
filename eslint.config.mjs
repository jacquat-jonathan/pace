import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  // The db layer, the Strava sync entry point and the test doubles
  // deliberately type their Supabase/fetch arguments as `any`: they are
  // written against a lightweight fake client (tests/helpers/fakeSupabase)
  // rather than the real `@supabase/supabase-js` client type, which is what
  // keeps the db layer testable without a live database.
  {
    files: [
      "lib/db/**/*.ts",
      "lib/strava/sync.ts",
      "tests/helpers/**/*.ts",
      "**/*.test.ts",
    ],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
]);

export default eslintConfig;
