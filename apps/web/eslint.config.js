import react from "eslint-plugin-react";
import globals from "globals";

// Deliberately minimal (see ROADMAP.md M8 #18): no-undef is the whole point —
// it's what would have caught SeasonsCard's dangling TREND_START reference
// (masked for months by scope-hoisting until a bundler change exposed it).
// react/jsx-uses-vars stops that same rule from false-positiving on
// components that are only referenced via JSX. Not a general style lint pass.
export default [
  {
    files: ["src/**/*.{js,jsx}"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: { ...globals.browser },
    },
    plugins: { react },
    rules: {
      "no-undef": "error",
      "no-unused-vars": ["error", { varsIgnorePattern: "^_", argsIgnorePattern: "^_" }],
      "react/jsx-uses-vars": "error",
    },
  },
];
