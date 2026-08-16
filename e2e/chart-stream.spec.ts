import { expect, test } from "@playwright/test";

test.describe("Chart WebSocket stream", () => {
  test("chart mounts with hydrate and stream status", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(String(e)));

    await page.goto("/");
    await expect(page.getByTestId("chart-canvas-host")).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByTestId("chart-hydrate-status")).toHaveText(
      /hydrated \d+|hydrate skipped/,
    );
    await expect(page.getByTestId("chart-stream-status")).toHaveText(
      /connecting|live|offline/,
    );
    expect(errors).toEqual([]);
  });
});
