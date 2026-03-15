import { defineConfig } from "tsup";

export default defineConfig([
  // CLI binary entry — needs shebang
  {
    entry: { "bin/skillcoin": "src/bin/skillcoin.ts" },
    format: ["cjs"],
    clean: true,
    splitting: false,
    banner: { js: "#!/usr/bin/env node" },
    target: "node18",
    outDir: "dist",
  },
  // Library entry — no shebang
  {
    entry: { index: "src/index.ts" },
    format: ["cjs"],
    splitting: false,
    target: "node18",
    outDir: "dist",
  },
]);
