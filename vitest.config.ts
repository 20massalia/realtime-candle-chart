import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
  test: {
    // Pure market logic: no DOM needed.
    // Add `environment: "jsdom"` per-file when component tests are added.
    environment: "node",
    include: ["__tests__/**/*.test.ts"],
  },
});
