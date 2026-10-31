import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // The shared tools have their own bundled React root and browser image adapter.
  { files: ['shared-app/**/*.{js,jsx,ts}'], rules: { '@next/next/no-html-link-for-pages': 'off', '@next/next/no-img-element': 'off' } },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "test-results/**",
    "playwright-report/**",
    "next-env.d.ts",
    "public/tool-app/**",
  ]),
]);

export default eslintConfig;
