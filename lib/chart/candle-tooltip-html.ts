import { formatKoreanDateTime, formatKrw } from "@/lib/chart/formatters";

export type CandleOhlc = {
  open: number;
  high: number;
  low: number;
  close: number;
};

/** Custom crosshair tooltip markup (same strings as CandleChart). */
export function buildCandleTooltipInnerHtml(
  timeSeconds: number,
  { open, high, low, close }: CandleOhlc,
): string {
  const timeStr = formatKoreanDateTime(timeSeconds);
  return (
    `<div style="margin-bottom:2px;color:#a1a1aa;font-size:11px;">${timeStr}</div>` +
    `<div>시가&nbsp;<b>${formatKrw(open)}</b>&ensp;고가&nbsp;<b style="color:#22c55e;">${formatKrw(high)}</b></div>` +
    `<div>저가&nbsp;<b style="color:#ef4444;">${formatKrw(low)}</b>&ensp;종가&nbsp;<b>${formatKrw(close)}</b></div>`
  );
}
