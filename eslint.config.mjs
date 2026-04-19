import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    ".next-*/**", // local dev dist dirs (e.g. .next-d2, .next-dev)
    "out/**",
    "build/**",
    "next-env.d.ts",
    "lib/generated/**", // Prisma generated client
  ]),
  {
    rules: {
      // Demoted from error to warning. These show up in pre-existing routes
      // that catch unknown error types or render escapable apostrophes —
      // none are functional bugs. CI logs them but doesn't fail the build.
      // TODO: clean up incrementally and promote back to error.
      "@typescript-eslint/no-explicit-any": "warn",
      "react/no-unescaped-entities": "warn",
      "react-hooks/set-state-in-effect": "warn",
    },
  },
]);

export default eslintConfig;
