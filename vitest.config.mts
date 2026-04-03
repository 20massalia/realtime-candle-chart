import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
  test: {
    // Pure market logic: no DOM needed.
    // Add `environment: 'jsdom'` per-file when component tests are added.
    environment: "node",
    include: ["__tests__/**/*.test.ts"],
  },
});
