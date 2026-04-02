import { stepGbm, type GbmParams } from "./gbm";
import type { GbmState, Tick } from "./types";

type ProducerRefs = {
  queueRef: { current: Tick[] };
  gbmRef: { current: GbmState };
  /** Reset to null on resume so the first dt is clamped to one interval. */
  lastTickMsRef: { current: number | null };
};

type ProducerOptions = {
  intervalMs: number;
  params: GbmParams;
  /** Called each tick to check whether production is paused. */
  isPaused(): boolean;
};

export type ProducerHandle = { start(): void; stop(): void };

/**
 * Manages the setInterval-based GBM tick producer.
 * Pushes Tick objects onto queueRef without touching React state.
 */
export function createProducer(
  refs: ProducerRefs,
  opts: ProducerOptions,
): ProducerHandle {
  let intervalId: ReturnType<typeof setInterval> | undefined;

  return {
    start() {
      if (intervalId !== undefined) return;
      intervalId = setInterval(() => {
        if (document.hidden) return;
        if (opts.isPaused()) return;
        const now = Date.now();
        const prev = refs.lastTickMsRef.current ?? now - opts.intervalMs;
        refs.lastTickMsRef.current = now;
        const dt = (now - prev) / 1000;
        const { state, tick } = stepGbm(refs.gbmRef.current, now, dt, opts.params);
        refs.gbmRef.current = state;
        refs.queueRef.current.push(tick);
      }, opts.intervalMs);
    },
    stop() {
      if (intervalId !== undefined) {
        clearInterval(intervalId);
        intervalId = undefined;
      }
    },
  };
}
