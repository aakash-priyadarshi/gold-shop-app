import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    include: [
      "src/**/*.test.{ts,tsx}",
      "src/**/*.spec.{ts,tsx}",
    ],
    exclude: [
      "node_modules",
      "dist",
      ".next",
      // calculate-estimate.ts uses TS `type` modifiers in import specifiers
      // which rollup's SSR transform can't parse. Needs a build step to test.
      "src/lib/pricing/calculate-estimate.integration.test.ts",
    ],
    server: {
      deps: {
        // Inline all source files so esbuild (not rollup) handles TS transforms
        inline: [/.*/],
      },
    },
    // Use esbuild to transform TS files for SSR as well
    deps: {
      optimizer: {
        web: {
          include: ["src/**"],
        },
      },
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary"],
      include: [
        "src/lib/tax/**",
        "src/lib/pricing/**",
        "src/lib/currency/**",
        "src/hooks/useMarket.tsx",
        "src/components/tutorial/useTutorial.ts",
      ],
    },
  },
  esbuild: {
    target: "es2021",
    loader: "ts",
    tsconfigRaw: {
      compilerOptions: {
        target: "ES2021",
        useDefineForClassFields: false,
        jsx: "react-jsx",
      },
    },
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
      // Point to compiled dist so rollup's SSR transform doesn't choke on TS
      "@gold-shop/shared": resolve(__dirname, "../../packages/shared/dist"),
    },
  },
});
