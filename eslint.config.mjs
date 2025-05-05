import js from "@eslint/js";
import globals from "globals";
import { defineConfig } from "eslint/config";


export default defineConfig([
  { files: ["**/*.{js,mjs,cjs}"], plugins: { js }, extends: ["js/recommended"] },
  {
    files: ["**/*.{js,mjs,cjs}"], languageOptions: { globals: { ...globals.browser, ...globals.node } }, rules: {
      // Treat unused vars as errors *unless* they start with "_"
      'no-unused-vars': [
        'error',
        {
          varsIgnorePattern: '^_',      // `const _foo = …`
          argsIgnorePattern: '^_',      // `function fn(_evt) { … }`
          caughtErrorsIgnorePattern: '^_',
        },
      ],
    },
  },

]);