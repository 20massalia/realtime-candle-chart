"use client";

import {
  CandlestickSeries,
  ColorType,
  createChart,
  type IChartApi,
  type ISeriesApi,
  type MouseEventParams,
  type Time,
  type UTCTimestamp,
} from "lightweight-charts";
import { useEffect, useRef } from "react";
import { createAggregateState } from "@/lib/market/aggregate";
import { createGbmState } from "@/lib/market/gbm";
import { createConsumer } from "@/lib/market/consumer";
import { createProducer } from "@/lib/market/producer";
import { intervalMsForSpeed, SPEED_PRESETS } from "@/lib/market/speed";
import type { Candle, Tick } from "@/lib/market/types";
import { useUiStore } from "@/stores/ui-store";

type CandleSeriesApi = ISeriesApi<"Candlestick", Time>;

/** Mock (√s) vol; ~300ms steps → σ√dt ≈ 0.03·0.55 ≈ 1.6% typical |Δlog S|. */
const GBM = { mu: 0, sigma: 0.03 } as const;
const TICK_INTERVAL_MS = 300;
/** Realistic KRW mid-cap baseline (~₩75,000). GBM relative movements stay intact. */
const INITIAL_PRICE = 75_000;

// ── Formatting helpers ────────────────────────────────────────────────────────

const krwFormatter = new Intl.NumberFormat("ko-KR", {
  style: "currency",
  currency: "KRW",
  maximumFractionDigits: 0,
});

function formatKrw(price: number): string {
  return krwFormatter.format(Math.round(price));
}

/** Bottom axis tick label: "03-11:37" (일-시:분) */
function formatTickLabel(time: Time): string {
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

/** Tooltip datetime: "2026. 04. 03. 11:37" */
function formatKoreanDateTime(timeSeconds: number): string {
  return koreanDtFmt.format(new Date(timeSeconds * 1000));
}

// ─────────────────────────────────────────────────────────────────────────────

function lwcBar(c: Candle) {
  return {
    time: c.time as UTCTimestamp,
    open: c.open,
    high: c.high,
    low: c.low,
    close: c.close,
  };
}

export function CandleChart() {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<CandleSeriesApi | null>(null);
  const queueRef = useRef<Tick[]>([]);
  const gbmRef = useRef(createGbmState(INITIAL_PRICE));
  const aggRef = useRef(createAggregateState());
  const lastTickMsRef = useRef<number | null>(null);
  const setChartReady = useUiStore((s) => s.setChartReady);
  const isPaused = useUiStore((s) => s.isPaused);
  const setPaused = useUiStore((s) => s.setPaused);
  const speedMultiplier = useUiStore((s) => s.speedMultiplier);
  const setSpeedMultiplier = useUiStore((s) => s.setSpeedMultiplier);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    queueRef.current = [];
    gbmRef.current = createGbmState(INITIAL_PRICE);
    aggRef.current = createAggregateState();
    lastTickMsRef.current = null;

    const chart = createChart(el, {
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#a1a1aa",
      },
      grid: {
        vertLines: { color: "rgba(161, 161, 170, 0.2)" },
        horzLines: { color: "rgba(161, 161, 170, 0.2)" },
      },
      rightPriceScale: { borderVisible: false },
      timeScale: {
        borderVisible: false,
        tickMarkFormatter: formatTickLabel,
        // Pixel-based right margin stays visually stable across zoom levels
        // (bar-count rightOffset would shrink as bars get denser).
        rightOffsetPixels: 40,
        // Prevents the single first bar from stretching to fill the whole chart.
        maxBarSpacing: 20,
      },
      // Hide the built-in crosshair time-scale bubble: our custom tooltip
      // already shows the full date/time, so the bubble is redundant noise.
      crosshair: {
        vertLine: { labelVisible: false },
      },
      localization: {
        priceFormatter: formatKrw,
      },
    });

    const series = chart.addSeries(CandlestickSeries, {
      upColor: "#22c55e",
      downColor: "#ef4444",
      borderVisible: false,
      wickUpColor: "#22c55e",
      wickDownColor: "#ef4444",
      priceFormat: {
        type: "custom",
        formatter: formatKrw,
        minMove: 1,
      },
    });

    // ── Custom tooltip (crosshairMove) ──────────────────────────────────────
    // position:relative is required so the tooltip's absolute coords are
    // relative to el, matching the param.point coordinate system.
    el.style.position = "relative";

    const tooltip = document.createElement("div");
    tooltip.style.cssText = [
      "position:absolute",
      "top:0",
      "left:0",
      "display:none",
      "pointer-events:none",
      "z-index:10",
      "background:rgba(24,24,27,0.88)",
      "border:1px solid rgba(161,161,170,0.3)",
      "border-radius:6px",
      "padding:7px 10px",
      "font-size:12px",
      "line-height:1.7",
      "color:#e4e4e7",
      "white-space:nowrap",
    ].join(";");
    el.appendChild(tooltip);

    const handleCrosshair = (param: MouseEventParams) => {
      if (!param.time || !param.point) {
        tooltip.style.display = "none";
        return;
      }
      const raw = param.seriesData.get(series);
      if (!raw || !("open" in raw)) {
        tooltip.style.display = "none";
        return;
      }
      const { open, high, low, close } = raw as {
        open: number;
        high: number;
        low: number;
        close: number;
      };

      const timeStr = formatKoreanDateTime(param.time as number);
      tooltip.innerHTML =
        `<div style="margin-bottom:2px;color:#a1a1aa;font-size:11px;">${timeStr}</div>` +
        `<div>시가&nbsp;<b>${formatKrw(open)}</b>&ensp;고가&nbsp;<b style="color:#22c55e;">${formatKrw(high)}</b></div>` +
        `<div>저가&nbsp;<b style="color:#ef4444;">${formatKrw(low)}</b>&ensp;종가&nbsp;<b>${formatKrw(close)}</b></div>`;

      tooltip.style.display = "block";
      const elW = el.clientWidth;
      const elH = el.clientHeight;
      const ttW = tooltip.offsetWidth;
      const ttH = tooltip.offsetHeight;
      const x = param.point.x;
      const y = param.point.y;

      let left = x + 16;
      if (left + ttW > elW - 4) left = x - ttW - 16;
      left = Math.max(4, left);

      let top = y - ttH / 2;
      top = Math.max(4, Math.min(top, elH - ttH - 4));

      tooltip.style.left = `${left}px`;
      tooltip.style.top = `${top}px`;
    };

    chart.subscribeCrosshairMove(handleCrosshair);
    // ────────────────────────────────────────────────────────────────────────

    chartRef.current = chart;
    seriesRef.current = series;
    setChartReady(true);

    const resize = () => {
      chart.applyOptions({
        width: el.clientWidth,
        height: el.clientHeight,
      });
    };

    const ro = new ResizeObserver(resize);
    ro.observe(el);
    resize();

    const producer = createProducer(
      { queueRef, gbmRef, lastTickMsRef },
      {
        getIntervalMs: () =>
          intervalMsForSpeed(
            TICK_INTERVAL_MS,
            useUiStore.getState().speedMultiplier,
          ),
        params: GBM,
        isPaused: () => useUiStore.getState().isPaused,
      },
    );

    const consumer = createConsumer(
      { queueRef, aggRef },
      {
        onEffect(eff) {
          const ser = seriesRef.current;
          if (!ser) return;
          if (eff.type === "update") {
            ser.update(lwcBar(eff.candle));
          } else {
            ser.update(lwcBar(eff.completed));
            ser.update(lwcBar(eff.candle));
          }
        },
      },
    );

    const pauseAll = () => {
      producer.stop();
      consumer.stop();
    };

    const resumeAll = () => {
      lastTickMsRef.current = null;
      producer.start();
      consumer.start();
    };

    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        pauseAll();
      } else {
        resumeAll();
      }
    };

    document.addEventListener("visibilitychange", onVisibility);
    producer.start();
    consumer.start();

    return () => {
      pauseAll();
      chart.unsubscribeCrosshairMove(handleCrosshair);
      document.removeEventListener("visibilitychange", onVisibility);
      ro.disconnect();
      chart.remove();
      tooltip.remove();
      chartRef.current = null;
      seriesRef.current = null;
      setChartReady(false);
    };
  }, [setChartReady]);

  return (
    <div className="flex w-full flex-col gap-3">
      <div
        ref={containerRef}
        className="h-[min(70vh,560px)] w-full min-h-[320px]"
      />
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setPaused(!isPaused)}
          className="rounded-md border border-zinc-300 bg-zinc-100 px-3 py-1.5 text-sm text-zinc-900 transition-colors hover:bg-zinc-200 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
        >
          {isPaused ? "재개" : "일시정지"}
        </button>
        <div className="flex items-center gap-1">
          {SPEED_PRESETS.map((speed) => {
            const selected = speed === speedMultiplier;
            return (
              <button
                key={speed}
                type="button"
                onClick={() => setSpeedMultiplier(speed)}
                className={`rounded-md border px-2.5 py-1 text-xs transition-colors ${
                  selected
                    ? "border-blue-500 bg-blue-500 text-white"
                    : "border-zinc-300 bg-zinc-100 text-zinc-900 hover:bg-zinc-200 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
                }`}
                aria-pressed={selected}
              >
                {speed}x
              </button>
            );
          })}
        </div>
        <button
          type="button"
          onClick={() => chartRef.current?.timeScale().scrollToRealTime()}
          className="rounded-md border border-zinc-300 bg-zinc-100 px-3 py-1.5 text-sm text-zinc-900 transition-colors hover:bg-zinc-200 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
        >
          Realtime 이동
        </button>
        <span className="text-sm text-zinc-500 dark:text-zinc-400">
          Mock GBM · 1m 캔들 · RAF 소비
        </span>
      </div>
    </div>
  );
}
