"use client";

import {
  CandlestickSeries,
  ColorType,
  createChart,
  type IChartApi,
  type ISeriesApi,
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
const INITIAL_PRICE = 100;

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
      timeScale: { borderVisible: false },
    });

    const series = chart.addSeries(CandlestickSeries, {
      upColor: "#22c55e",
      downColor: "#ef4444",
      borderVisible: false,
      wickUpColor: "#22c55e",
      wickDownColor: "#ef4444",
    });

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
      document.removeEventListener("visibilitychange", onVisibility);
      ro.disconnect();
      chart.remove();
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
