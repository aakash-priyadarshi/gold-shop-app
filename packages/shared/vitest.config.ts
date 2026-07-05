import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["src/**/*.test.ts"],
  },
  resolve: {
    alias: {
      // Use the compiled dist (JS) instead of source TS so rollup's SSR
      // transform doesn't choke on TypeScript syntax.
      "../utils/weight-conversion": resolve(
        __dirname,
        "dist/utils/weight-conversion.js",
      ),
    },
  },
});
