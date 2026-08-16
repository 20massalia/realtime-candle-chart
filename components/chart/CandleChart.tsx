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
import { useEffect, useRef, useState } from "react";
import { buildCandleTooltipInnerHtml } from "@/lib/chart/candle-tooltip-html";
import { formatAxisTimeLabel, formatKrw } from "@/lib/chart/formatters";
import {
  computeTooltipPosition,
  readTooltipSizeOnce,
  type TooltipSizeCache,
} from "@/lib/chart/tooltip-layout";
import {
  canAppendAfterHistory,
  CHART_INTERVAL,
  CHART_SYMBOL,
  toChartCandles,
} from "@/lib/chart/db-sync";
import type { Candle as ApiCandle } from "@/lib/api/candles";
import {
  buildCandleWebSocketUrl,
  nextReconnectDelayMs,
  parseCandleStreamEvent,
  boundStreamQueue,
  type CandleStreamEvent,
} from "@/lib/api/candles-stream";
import { createStreamConsumer } from "@/lib/chart/stream-consumer";
import { barsForEffect, streamEventToEffects } from "@/lib/chart/stream-map";
import { SPEED_PRESETS } from "@/lib/market/speed";
import type { Candle } from "@/lib/market/types";
import { useUiStore } from "@/stores/ui-store";

type CandleSeriesApi = ISeriesApi<"Candlestick", Time>;

export type CandleChartProps = {
  initialCandles?: ApiCandle[];
  hydrateError?: string | null;
};

function lwcBar(c: Candle) {
  return {
    time: c.time as UTCTimestamp,
    open: c.open,
    high: c.high,
    low: c.low,
    close: c.close,
  };
}

const EMPTY_CANDLES: ApiCandle[] = [];

export function CandleChart({
  initialCandles = EMPTY_CANDLES,
  hydrateError = null,
}: CandleChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<CandleSeriesApi | null>(null);
  const queueRef = useRef<CandleStreamEvent[]>([]);
  const [streamStatus, setStreamStatus] = useState<"connecting" | "live" | "offline">(
    "connecting",
  );
  const setChartReady = useUiStore((s) => s.setChartReady);
  const isPaused = useUiStore((s) => s.isPaused);
  const setPaused = useUiStore((s) => s.setPaused);
  const speedMultiplier = useUiStore((s) => s.speedMultiplier);
  const setSpeedMultiplier = useUiStore((s) => s.setSpeedMultiplier);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    queueRef.current = [];
    const history = toChartCandles(initialCandles);
    const lastHistoryTime = history[history.length - 1]?.time ?? null;

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
        tickMarkFormatter: formatAxisTimeLabel,
        // Pixel-based right margin (40px) stays visually stable across zoom levels
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
    series.setData(history.map(lwcBar));

    // ── Custom tooltip (crosshairMove) ──────────────────────────────────────
    // position:relative is required so the tooltip's absolute coords are
    // relative to el, matching the param.point coordinate system.
    el.style.position = "relative";

    const tooltip = document.createElement("div");
    tooltip.dataset.testid = "chart-tooltip";
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

    const tooltipSizeCache: TooltipSizeCache = { width: 0, height: 0 };

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

      tooltip.innerHTML = buildCandleTooltipInnerHtml(param.time as number, {
        open,
        high,
        low,
        close,
      });

      tooltip.style.display = "block";
      const { width: ttW, height: ttH } = readTooltipSizeOnce(
        tooltipSizeCache,
        () => ({ width: tooltip.offsetWidth, height: tooltip.offsetHeight }),
      );
      const { left, top } = computeTooltipPosition({
        containerWidth: el.clientWidth,
        containerHeight: el.clientHeight,
        pointerX: param.point.x,
        pointerY: param.point.y,
        tooltipWidth: ttW,
        tooltipHeight: ttH,
      });
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

    const applyEvent = (event: CandleStreamEvent) => {
      const ser = seriesRef.current;
      if (!ser) return;
      for (const effect of streamEventToEffects(event)) {
        for (const bar of barsForEffect(effect)) {
          if (!canAppendAfterHistory(lastHistoryTime, bar.time)) {
            continue;
          }
          ser.update(lwcBar(bar));
        }
      }
    };

    const consumer = createStreamConsumer(
      { queueRef },
      {
        onEvent: applyEvent,
        isPaused: () => useUiStore.getState().isPaused,
        isHidden: () => document.hidden,
      },
    );

    let socket: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
    let attempts = 0;
    let disposed = false;
    let onClose: (() => void) | undefined;

    const connect = () => {
      if (disposed) return;
      setStreamStatus("connecting");
      const url = buildCandleWebSocketUrl({
        baseUrl: process.env.NEXT_PUBLIC_CANDLE_WS_URL || undefined,
        symbol: CHART_SYMBOL,
        interval: CHART_INTERVAL,
      });
      socket = new WebSocket(url);
      socket.addEventListener("open", () => {
        attempts = 0;
        setStreamStatus("live");
      });
      socket.addEventListener("message", (message) => {
        try {
          const payload: unknown = JSON.parse(String(message.data));
          const parsed = parseCandleStreamEvent(payload);
          queueRef.current.push(parsed);
          queueRef.current = boundStreamQueue(queueRef.current, {
            hidden: document.hidden,
            paused: useUiStore.getState().isPaused,
          });
        } catch {
          // Ignore malformed frames; keep the session.
        }
      });
      onClose = () => {
        if (disposed) return;
        setStreamStatus("offline");
        const delay = nextReconnectDelayMs(attempts);
        attempts += 1;
        reconnectTimer = setTimeout(connect, delay);
      };
      socket.addEventListener("close", onClose);
    };

    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        consumer.stop();
        queueRef.current = boundStreamQueue(queueRef.current, {
          hidden: true,
          paused: useUiStore.getState().isPaused,
        });
      } else {
        consumer.start();
      }
    };

    document.addEventListener("visibilitychange", onVisibility);
    consumer.start();
    connect();

    return () => {
      disposed = true;
      consumer.stop();
      if (reconnectTimer !== undefined) {
        clearTimeout(reconnectTimer);
      }
      if (socket) {
        if (onClose) {
          socket.removeEventListener("close", onClose);
        }
        socket.close();
      }
      chart.unsubscribeCrosshairMove(handleCrosshair);
      document.removeEventListener("visibilitychange", onVisibility);
      ro.disconnect();
      chart.remove();
      tooltip.remove();
      el.style.position = "";
      chartRef.current = null;
      seriesRef.current = null;
      setChartReady(false);
    };
  }, [setChartReady, initialCandles]);

  return (
    <div className="flex w-full flex-col gap-3">
      <div
        ref={containerRef}
        data-testid="chart-canvas-host"
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
        <span
          data-testid="chart-hydrate-status"
          className="text-sm text-zinc-500 dark:text-zinc-400"
        >
          {hydrateError
            ? `hydrate skipped · ${hydrateError}`
            : `hydrated ${initialCandles.length} · stream ${CHART_SYMBOL} 1m`}
        </span>
        <span
          data-testid="chart-stream-status"
          className="text-sm text-zinc-500 dark:text-zinc-400"
        >
          {streamStatus}
        </span>
      </div>
    </div>
  );
}
