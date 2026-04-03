import { describe, expect, it, vi } from "vitest";
import {
  computeTooltipPosition,
  readTooltipSizeOnce,
  type TooltipSizeCache,
} from "@/lib/chart/tooltip-layout";

describe("readTooltipSizeOnce", () => {
  it("calls measure only until width is first cached", () => {
    const cache: TooltipSizeCache = { width: 0, height: 0 };
    const measure = vi
      .fn()
      .mockReturnValueOnce({ width: 120, height: 48 })
      .mockReturnValueOnce({ width: 999, height: 999 });

    expect(readTooltipSizeOnce(cache, measure)).toEqual({
      width: 120,
      height: 48,
    });
    expect(readTooltipSizeOnce(cache, measure)).toEqual({
      width: 120,
      height: 48,
    });
    expect(measure).toHaveBeenCalledTimes(1);
  });

  it("re-measures after cache width is cleared back to 0", () => {
    const cache: TooltipSizeCache = { width: 0, height: 0 };
    const measure = vi
      .fn()
      .mockReturnValueOnce({ width: 120, height: 48 })
      .mockReturnValueOnce({ width: 200, height: 50 });

    expect(readTooltipSizeOnce(cache, measure)).toEqual({ width: 120, height: 48 });
    cache.width = 0;
    cache.height = 0;
    expect(readTooltipSizeOnce(cache, measure)).toEqual({ width: 200, height: 50 });
    expect(measure).toHaveBeenCalledTimes(2);
  });
});

describe("computeTooltipPosition", () => {
  it("flips to the left when the default placement would overflow right", () => {
    const p = computeTooltipPosition({
      containerWidth: 400,
      containerHeight: 300,
      pointerX: 350,
      pointerY: 100,
      tooltipWidth: 200,
      tooltipHeight: 40,
    });
    expect(p.left).toBeLessThan(350);
    expect(p.left + 200).toBeLessThanOrEqual(400 - 4);
  });

  it("clamps vertical position inside the container", () => {
    const topHeavy = computeTooltipPosition({
      containerWidth: 500,
      containerHeight: 100,
      pointerX: 100,
      pointerY: 2,
      tooltipWidth: 80,
      tooltipHeight: 80,
    });
    expect(topHeavy.top).toBeGreaterThanOrEqual(4);

    const bottomHeavy = computeTooltipPosition({
      containerWidth: 500,
      containerHeight: 100,
      pointerX: 100,
      pointerY: 98,
      tooltipWidth: 80,
      tooltipHeight: 80,
    });
    expect(bottomHeavy.top + 80).toBeLessThanOrEqual(100 - 4);
  });
});
