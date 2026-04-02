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
import { applyTick, createAggregateState } from "@/lib/market/aggregate";
import { createGbmState, stepGbm } from "@/lib/market/gbm";
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

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    queueRef.current = [];
    gbmRef.current = createGbmState(INITIAL_PRICE);
    aggRef.current = createAggregateState();
    lastTickMsRef.current = null;

    let rafId = 0;
    let intervalId: ReturnType<typeof setInterval> | undefined;
    let active = true;

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

    const drainAndUpdate = () => {
      const ser = seriesRef.current;
      if (!ser) return;
      const q = queueRef.current;
      let agg = aggRef.current;
      while (q.length > 0) {
        const tick = q.shift()!;
        const { state, effects } = applyTick(agg, tick);
        agg = state;
        for (const eff of effects) {
          if (eff.type === "update") {
            ser.update(lwcBar(eff.candle));
          } else {
            ser.update(lwcBar(eff.completed));
            ser.update(lwcBar(eff.candle));
          }
        }
      }
      aggRef.current = agg;
    };

    const loop = () => {
      if (!active) return;
      if (!document.hidden) {
        drainAndUpdate();
      }
      rafId = requestAnimationFrame(loop);
    };

    const stopProducer = () => {
      if (intervalId !== undefined) {
        clearInterval(intervalId);
        intervalId = undefined;
      }
    };

    const startProducer = () => {
      if (intervalId !== undefined) return;
      intervalId = setInterval(() => {
        if (document.hidden) return;
        if (useUiStore.getState().isPaused) return;
        const now = Date.now();
        const prev = lastTickMsRef.current ?? now - TICK_INTERVAL_MS;
        lastTickMsRef.current = now;
        const dt = (now - prev) / 1000;
        const { state, tick } = stepGbm(gbmRef.current, now, dt, GBM);
        gbmRef.current = state;
        queueRef.current.push(tick);
      }, TICK_INTERVAL_MS);
    };

    const pauseAll = () => {
      active = false;
      stopProducer();
      cancelAnimationFrame(rafId);
    };

    const resumeAll = () => {
      active = true;
      lastTickMsRef.current = null;
      startProducer();
      rafId = requestAnimationFrame(loop);
    };

    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        pauseAll();
      } else {
        resumeAll();
      }
    };

    document.addEventListener("visibilitychange", onVisibility);
    startProducer();
    rafId = requestAnimationFrame(loop);

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
        <span className="text-sm text-zinc-500 dark:text-zinc-400">
          Mock GBM · 1m 캔들 · RAF 소비
        </span>
      </div>
    </div>
  );
}
