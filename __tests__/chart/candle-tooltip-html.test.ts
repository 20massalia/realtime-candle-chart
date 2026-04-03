import { describe, expect, it } from "vitest";
import { buildCandleTooltipInnerHtml } from "@/lib/chart/candle-tooltip-html";

describe("buildCandleTooltipInnerHtml", () => {
  it("includes KRW-formatted OHLC and Korean labels", () => {
    const ts = Math.floor(new Date(2026, 3, 3, 11, 37, 0).getTime() / 1000);
    const html = buildCandleTooltipInnerHtml(ts, {
      open: 75_000,
      high: 76_100,
      low: 74_900,
      close: 75_500,
    });
    expect(html).toMatch(/시가/);
    expect(html).toMatch(/고가/);
    expect(html).toMatch(/저가/);
    expect(html).toMatch(/종가/);
    expect(html).toMatch(/₩75,000/);
    expect(html).toMatch(/₩76,100/);
    expect(html).toMatch(/₩74,900/);
    expect(html).toMatch(/₩75,500/);
    expect(html.length).toBeGreaterThan(50);
  });
});
