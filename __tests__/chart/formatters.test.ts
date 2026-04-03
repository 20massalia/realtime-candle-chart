import { describe, expect, it } from "vitest";
import {
  formatAxisTimeLabel,
  formatKoreanDateTime,
  formatKrw,
} from "@/lib/chart/formatters";

describe("formatKrw", () => {
  it("formats 75,000 KRW with thousands separator and no decimals", () => {
    expect(formatKrw(75_000)).toBe("₩75,000");
  });

  it("rounds fractional input", () => {
    expect(formatKrw(75_000.4)).toBe("₩75,000");
    expect(formatKrw(75_000.6)).toBe("₩75,001");
  });
});

describe("formatAxisTimeLabel", () => {
  it('uses "DD-HH:MM" shape (zero-padded day and clock)', () => {
    const label = formatAxisTimeLabel(1_700_000_000 as never);
    expect(label).toMatch(/^\d{2}-\d{2}:\d{2}$/);
  });

  it('formats local wall time as "03-11:37" for 2026-04-03 11:37 local', () => {
    const local = new Date(2026, 3, 3, 11, 37, 0);
    const sec = Math.floor(local.getTime() / 1000);
    expect(formatAxisTimeLabel(sec as never)).toBe("03-11:37");
  });
});

describe("formatKoreanDateTime", () => {
  it("uses Korean locale datetime (year + clock parts; dot-style date common in ko-KR)", () => {
    const ts = Math.floor(Date.UTC(2026, 3, 3, 11, 37, 0) / 1000);
    const s = formatKoreanDateTime(ts);
    expect(s).toMatch(/2026/);
    expect(s).toMatch(/\d{1,2}/);
    expect(s.length).toBeGreaterThan(10);
    expect(s).toMatch(/[.:]/);
  });
});
