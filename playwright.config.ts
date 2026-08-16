import { defineConfig, devices } from "@playwright/test";

const baseURL =
  process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

/** Next.js 16 allows one `next dev` per repo. Reuse `pnpm dev` on 3000 when it is already up. */
const webServerMode = process.env.PLAYWRIGHT_WEBSERVER_MODE ?? "dev";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  reporter: "list",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  webServer:
    process.env.PLAYWRIGHT_SKIP_WEBSERVER === "1"
      ? undefined
      : webServerMode === "start"
        ? {
            command:
              "pnpm run build && pnpm exec next start -p 3000 -H localhost",
            url: baseURL,
            reuseExistingServer: true,
            timeout: 180_000,
          }
        : {
            command: "pnpm exec next dev --port 3000 -H localhost",
            url: baseURL,
            reuseExistingServer: true,
            timeout: 120_000,
          },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
