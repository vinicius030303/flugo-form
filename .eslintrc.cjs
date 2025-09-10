/* eslint-env node */
module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module"
  },
  settings: {
    "import/resolver": {
      typescript: {
        project: ["./tsconfig.json"]
      }
    },
    react: { version: "detect" }
  },
  plugins: [
    "react",
    "react-hooks",
    "@typescript-eslint",
    "import"
  ],
  extends: [
    "eslint:recommended",
    "plugin:react/recommended",
    "plugin:react-hooks/recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:import/recommended",
    "plugin:import/typescript",
    "plugin:react-refresh/recommended",
    "prettier"
  ],
  rules: {
    // TS/JS
    "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    "@typescript-eslint/consistent-type-imports": ["warn", { prefer: "type-imports" }],

    // React
    "react/jsx-uses-react": "off",
    "react/react-in-jsx-scope": "off",

    // Hooks
    "react-hooks/rules-of-hooks": "error",
    "react-hooks/exhaustive-deps": "warn",

    // import
    "import/order": ["warn", {
      "groups": ["builtin", "external", "internal", "parent", "sibling", "index", "object", "type"],
      "pathGroups": [
        { pattern: "react", group: "external", position: "before" },
        { pattern: "@/**", group: "internal" }
      ],
      "pathGroupsExcludedImportTypes": ["react"],
      "alphabetize": { order: "asc", caseInsensitive: true },
      "newlines-between": "always"
    }]
  },
  overrides: [
    {
      files: ["**/*.tsx", "**/*.ts"],
      rules: {
        "import/no-unresolved": "off" // resolvido pelo resolver typescript
      }
    }
  ]
};
