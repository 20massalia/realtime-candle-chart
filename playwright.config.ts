import { defineConfig, devices } from "@playwright/test";

const baseURL =
  process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:4173";

/** `dev`: 빠름(단, 동일 프로젝트에서 다른 `next dev`가 떠 있으면 실패할 수 있음). `start`: build 후 프로덕션 서버로 안정적. */
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
              "pnpm run build && pnpm exec next start -p 4173 -H 127.0.0.1",
            url: baseURL,
            reuseExistingServer: true,
            timeout: 180_000,
          }
        : {
            command: "pnpm exec next dev --port 4173 -H 127.0.0.1",
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
