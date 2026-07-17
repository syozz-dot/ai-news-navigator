import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: [
      "packages/**/*.test.ts",
      "jobs/**/*.test.ts",
      "apps/web/**/*.test.ts",
    ],
    coverage: {
      reporter: ["text", "json", "html"],
    },
  },
});
