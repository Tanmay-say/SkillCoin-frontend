import { defineConfig } from "tsup";

const EXTERNAL = [
  "filecoin-pin",
  "@google/generative-ai",
  "@filoz/synapse-sdk",
  "pino",
  "ethers",
];

export default defineConfig([
  {
    entry: { "bin/skillcoin": "src/bin/skillcoin.ts" },
    format: ["cjs"],
    clean: true,
    splitting: false,
    banner: { js: "#!/usr/bin/env node" },
    target: "node18",
    outDir: "dist",
    external: EXTERNAL,
  },
  {
    entry: { index: "src/index.ts" },
    format: ["cjs"],
    splitting: false,
    target: "node18",
    outDir: "dist",
    external: EXTERNAL,
  },
]);
