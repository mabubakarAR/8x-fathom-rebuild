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
    // match. Reading during render would hydrate-mismatch. `useSyncExternalStore`
    // is the right answer where the value is a subscription — see
    // src/lib/reduced-motion.ts, which is that refactor done — but it needs a
    // referentially stable snapshot, which a function returning a fresh array
    // out of localStorage is not. These stay on the effect.
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
      "src/components/record-studio.tsx",
      "src/components/import-flow.tsx",
    ],
    rules: { "react-hooks/set-state-in-effect": "warn" },
  },
]);

export default eslintConfig;
