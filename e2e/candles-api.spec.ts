import { expect, test } from "@playwright/test";

test.describe("candles verification page", () => {
  test("renders heading and an explicit result or error", async ({ page }) => {
    await page.goto("/candles");

    await expect(
      page.getByRole("heading", { name: "Candles API 검증" }),
    ).toBeVisible();

    const error = page.getByTestId("candles-error");
    const table = page.getByRole("table");
    await expect(error.or(table)).toBeVisible();
    await expect(page.getByText(/005930/).first()).toBeVisible();
  });

  test("upserts a bar through the ingest form", async ({ page }) => {
    await page.goto("/candles");
    await expect(page.getByTestId("candle-ingest-form")).toBeVisible();

    await page.getByRole("textbox", { name: "bucketStart" }).fill("2026-08-16T06:45:00Z");
    const posted = page.waitForResponse(
      (res) =>
        new URL(res.url()).pathname === "/api/candles" && res.request().method() === "POST",
    );
    await page.getByRole("button", { name: "Upsert bar" }).click();
    const response = await posted;
    expect(response.ok(), `ingest POST ${response.status()}`).toBeTruthy();
    await expect(page.getByTestId("candle-ingest-status")).toContainText("upserted 1");
    await expect(page.getByRole("cell", { name: "2026-08-16T06:45:00Z" })).toBeVisible();
  });
});
