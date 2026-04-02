import { expect, test } from "@playwright/test";

test.describe("chart controls", () => {
  test("renders chart page and speed preset buttons", async ({ page }) => {
    await page.goto("/");

    await expect(
      page.getByRole("heading", { name: "실시간 캔들 (Phase 1 Mock)" }),
    ).toBeVisible();

    for (const label of ["0.5x", "1x", "2x", "5x"]) {
      await expect(page.getByRole("button", { name: label })).toBeVisible();
    }
    await expect(
      page.getByRole("button", { name: "Realtime 이동" }),
    ).toBeVisible();
  });

  test("updates active speed preset UI state", async ({ page }) => {
    await page.goto("/");

    const oneX = page.getByRole("button", { name: "1x" });
    const twoX = page.getByRole("button", { name: "2x" });

    await expect(oneX).toHaveAttribute("aria-pressed", "true");
    await expect(twoX).toHaveAttribute("aria-pressed", "false");

    await twoX.click();

    await expect(twoX).toHaveAttribute("aria-pressed", "true");
    await expect(oneX).toHaveAttribute("aria-pressed", "false");
  });

  test("go to realtime button click succeeds without page errors", async ({
    page,
  }) => {
    const pageErrors: Error[] = [];
    page.on("pageerror", (err) => pageErrors.push(err));

    await page.goto("/");
    await page.getByRole("button", { name: "Realtime 이동" }).click();

    await expect(page.getByRole("button", { name: "Realtime 이동" })).toBeVisible();
    expect(pageErrors).toHaveLength(0);
  });
});
