import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    b2b: "src/b2b.ts",
    cli: "src/cli.ts",
    index: "src/index.ts",
    "ai-sdk": "src/ai-sdk.ts",
    langchain: "src/langchain.ts",
  },
  outDir: "dist",
  format: ["esm"],
  // tsup's declaration bundler currently crashes under TypeScript 7. Emit
  // standards-compliant declarations with tsc after the JavaScript build.
  dts: false,
  // Disabled for publishable artifacts; .js.map files embed original source via
  // sourcesContent. Type declarations (dts) still ship; maps do not.
  sourcemap: false,
  clean: true,
  platform: "node",
  external: ["@langchain/core"],
});
