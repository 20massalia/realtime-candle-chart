import { expect, test } from "@playwright/test";

test.describe("Chart GET hydrate", () => {
  test("chart mounts and shows hydrate status without page errors", async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(String(e)));

    await page.goto("/");
    await expect(page.getByTestId("chart-canvas-host")).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByTestId("chart-hydrate-status")).toBeVisible();
    await expect(page.getByTestId("chart-hydrate-status")).toHaveText(
      /hydrated \d+|hydrate skipped/,
    );
    expect(errors).toEqual([]);
  });
});
