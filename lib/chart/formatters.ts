import type { Time } from "lightweight-charts";

const krwFormatter = new Intl.NumberFormat("ko-KR", {
  style: "currency",
  currency: "KRW",
  maximumFractionDigits: 0,
});

export function formatKrw(price: number): string {
  return krwFormatter.format(Math.round(price));
}

/** Bottom axis tick label: "03-11:37" (일-시:분) */
export function formatAxisTimeLabel(time: Time): string {
  const d = new Date((time as number) * 1000);
  const day = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${day}-${hh}:${mm}`;
}

const koreanDtFmt = new Intl.DateTimeFormat("ko-KR", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

/** Tooltip datetime: Korean order, e.g. "2026. 04. 03. 11:37" */
export function formatKoreanDateTime(timeSeconds: number): string {
  return koreanDtFmt.format(new Date(timeSeconds * 1000));
}
