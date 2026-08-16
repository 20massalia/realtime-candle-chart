import { expect, test, type Page } from "@playwright/test";
import { buildCandleTooltipInnerHtml } from "../lib/chart/candle-tooltip-html";

async function waitForChartHost(page: Page) {
  const host = page.getByTestId("chart-canvas-host");
  await expect(host).toBeVisible({ timeout: 30_000 });
  await expect(host.locator("canvas").first()).toBeVisible({ timeout: 30_000 });
}

/** 캔버스 위를 훑으며 pageerror 없음을 확인 (LWC 크로스헤어 경로). */
async function sweepChartCanvasesWithMouse(page: Page) {
  const host = page.getByTestId("chart-canvas-host");
  await page.mouse.move(0, 0);
  const n = await host.locator("canvas").count();
  for (let ci = 0; ci < n; ci++) {
    const box = await host.locator("canvas").nth(ci).boundingBox();
    if (!box || box.width < 48 || box.height < 48) continue;
    for (const xf of [0.12, 0.35, 0.55, 0.78]) {
      for (const yf of [0.42, 0.52]) {
        await page.mouse.move(
          box.x + box.width * xf,
          box.y + box.height * yf,
          { steps: 5 },
        );
        await page.waitForTimeout(30);
      }
    }
  }
}

test.describe("Phase 1 chart UX and formatting", () => {
  test.describe.configure({ timeout: 90_000 });

  test("chart mounts custom tooltip element (initially hidden)", async ({ page }) => {
    await page.goto("/");
    await waitForChartHost(page);
    const tip = page.locator('[data-testid="chart-tooltip"]');
    await expect(tip).toBeAttached();
    await expect(tip).toBeHidden();
  });

  test("scanning chart with mouse does not throw (OHLC tooltip strings covered in Vitest)", async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(String(e)));

    await page.goto("/");
    await waitForChartHost(page);
    await page.waitForTimeout(2000);
    await sweepChartCanvasesWithMouse(page);

    expect(errors).toEqual([]);
  });

  test("tooltip width stays stable when open with production HTML fixture (layout thrashing)", async ({
    page,
  }) => {
    await page.goto("/");
    await waitForChartHost(page);

    const ts = Math.floor(new Date(2026, 3, 3, 11, 37, 0).getTime() / 1000);
    const html = buildCandleTooltipInnerHtml(ts, {
      open: 75_000,
      high: 76_200,
      low: 74_800,
      close: 75_400,
    });

    await page.evaluate((h) => {
      const el = document.querySelector(
        '[data-testid="chart-tooltip"]',
      ) as HTMLElement | null;
      if (!el) throw new Error("tooltip node missing");
      el.innerHTML = h;
      el.style.display = "block";
      el.style.left = "40px";
      el.style.top = "80px";
    }, html);

    const tip = page.locator('[data-testid="chart-tooltip"]');
    await expect(tip).toBeVisible();

    /** 차트 위에서 움직이면 실제 crosshair 핸들러가 툴팁을 다시 숨긴다. 컨트롤 영역에서만 이동한다. */
    const moveBox = await page.getByRole("button", { name: "1x", exact: true }).boundingBox();
    expect(moveBox).toBeTruthy();
    if (!moveBox) return;

    const widths: number[] = [];
    for (let i = 0; i < 16; i++) {
      await page.mouse.move(
        moveBox.x + 4 + i * 2,
        moveBox.y + moveBox.height / 2,
        { steps: 2 },
      );
      widths.push(await tip.evaluate((el) => (el as HTMLElement).offsetWidth));
    }
    const positive = widths.filter((w) => w > 0);
    expect(new Set(positive).size).toBe(1);
  });

  test("chart host keeps stable height during mouse movement over chart", async ({
    page,
  }) => {
    await page.goto("/");
    await waitForChartHost(page);

    const host = page.getByTestId("chart-canvas-host");
    const h0 = await host.evaluate((el) => el.getBoundingClientRect().height);
    const box = await host.boundingBox();
    expect(box).toBeTruthy();
    if (!box) return;

    for (let i = 0; i < 14; i++) {
      await page.mouse.move(box.x + 40 + i * 18, box.y + box.height * 0.45, {
        steps: 2,
      });
    }

    const h1 = await host.evaluate((el) => el.getBoundingClientRect().height);
    expect(h1).toBeCloseTo(h0, 1);
  });

  test("initial chart layout: host honors min height and canvas fills width", async ({
    page,
  }) => {
    await page.goto("/");
    await waitForChartHost(page);
    const host = page.getByTestId("chart-canvas-host");
    await expect(host).toHaveCSS("min-height", "320px");
    const hostW = await host.evaluate((el) => el.clientWidth);
    const canvasCssW = await host
      .locator("canvas")
      .first()
      .evaluate((c: HTMLCanvasElement) => c.clientWidth);
    expect(canvasCssW).toBeGreaterThan(200);
    expect(canvasCssW).toBeLessThanOrEqual(hostW);
  });

  test("pan drag left then right does not throw (no stuck right edge)", async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(String(e)));

    await page.goto("/");
    await waitForChartHost(page);
    const host = page.getByTestId("chart-canvas-host");
    const box = await host.boundingBox();
    expect(box).toBeTruthy();
    if (!box) return;

    const y = box.y + box.height * 0.5;
    await page.mouse.move(box.x + box.width * 0.78, y);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.12, y);
    await page.mouse.up();

    await page.mouse.move(box.x + box.width * 0.12, y);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.82, y);
    await page.mouse.up();

    expect(errors).toEqual([]);
  });

  test("mouse wheel zoom in and out does not error", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(String(e)));

    await page.goto("/");
    await waitForChartHost(page);
    const host = page.getByTestId("chart-canvas-host");
    const box = await host.boundingBox();
    expect(box).toBeTruthy();
    if (!box) return;

    const x = box.x + box.width * 0.5;
    const y = box.y + box.height * 0.5;
    await page.mouse.move(x, y);
    for (let i = 0; i < 6; i++) await page.mouse.wheel(0, -120);
    for (let i = 0; i < 6; i++) await page.mouse.wheel(0, 120);

    expect(errors).toEqual([]);
  });

  test("Realtime 이동 after pan still shows chart without errors", async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(String(e)));

    await page.goto("/");
    await waitForChartHost(page);
    const host = page.getByTestId("chart-canvas-host");
    const box = await host.boundingBox();
    expect(box).toBeTruthy();
    if (!box) return;

    const y = box.y + box.height * 0.5;
    await page.mouse.move(box.x + box.width * 0.7, y);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.2, y);
    await page.mouse.up();

    await page.getByRole("button", { name: "Realtime 이동" }).click();
    await expect(host.locator("canvas").first()).toBeVisible();

    expect(errors).toEqual([]);
  });

  test("speed presets toggle aria-pressed (pairs with intervalMsForSpeed unit tests)", async ({
    page,
  }) => {
    await page.goto("/");
    await waitForChartHost(page);

    const half = page.getByRole("button", { name: "0.5x", exact: true });
    const five = page.getByRole("button", { name: "5x", exact: true });

    await five.click();
    await expect(five).toHaveAttribute("aria-pressed", "true");
    await expect(half).toHaveAttribute("aria-pressed", "false");

    await half.click();
    await expect(half).toHaveAttribute("aria-pressed", "true");
    await expect(five).toHaveAttribute("aria-pressed", "false");
  });

  test("pause and resume toggles button label without page errors", async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(String(e)));

    await page.goto("/");
    await waitForChartHost(page);

    const pauseBtn = page.getByRole("button", { name: "일시정지" });
    await pauseBtn.click();
    await expect(page.getByRole("button", { name: "재개" })).toBeVisible();

    await page.getByRole("button", { name: "재개" }).click();
    await expect(page.getByRole("button", { name: "일시정지" })).toBeVisible();

    expect(errors).toEqual([]);
  });

  test("switching away to another tab does not break chart after return", async ({
    browser,
  }) => {
    const context = await browser.newContext();
    const pageA = await context.newPage();
    const errors: string[] = [];
    pageA.on("pageerror", (e) => errors.push(String(e)));

    await pageA.goto("/");
    await waitForChartHost(pageA);

    const pageB = await context.newPage();
    await pageB.goto("about:blank");
    await pageB.bringToFront();
    await pageA.waitForTimeout(600);

    await pageA.bringToFront();
    await pageA.waitForTimeout(400);
    await expect(pageA.getByTestId("chart-canvas-host")).toBeVisible();
    await expect(
      pageA.locator('[data-testid="chart-tooltip"]'),
    ).toBeAttached();

    expect(errors).toEqual([]);

    await context.close();
  });
});
