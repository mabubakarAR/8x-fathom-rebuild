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
  {
    // The React Compiler flags `useEffect(() => setState(read()), [])`. Every
    // instance of it here is the same deliberate pattern: read `localStorage`
    // *after* mount so the server-rendered HTML and the first client render
    // match. Reading during render would hydrate-mismatch; `useSyncExternalStore`
    // is the right long-term answer and is a refactor rather than a fix.
    // Flagged here in the config rather than silenced line by line, so it stays
    // visible as a known trade rather than disappearing into the code.
    files: [
      "src/lib/overlay.tsx",
      "src/components/imported-view.tsx",
      "src/components/search-ui.tsx",
      "src/components/upcoming.tsx",
      "src/components/meeting/share.tsx",
      "src/components/meeting/view.tsx",
      "src/components/commitments.tsx",
    ],
    rules: { "react-hooks/set-state-in-effect": "warn" },
  },
]);

export default eslintConfig;
