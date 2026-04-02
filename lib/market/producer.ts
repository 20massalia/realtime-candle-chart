import { stepGbm, type GbmParams } from "./gbm";
import type { GbmState, Tick } from "./types";

type ProducerRefs = {
  queueRef: { current: Tick[] };
  gbmRef: { current: GbmState };
  /** Reset to null on resume so the first dt is clamped to one interval. */
  lastTickMsRef: { current: number | null };
};

type ProducerOptions = {
  getIntervalMs(): number;
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
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  let active = false;

  const schedule = () => {
    if (!active) return;
    const intervalMs = opts.getIntervalMs();
    timeoutId = setTimeout(tickOnce, intervalMs);
  };

  const tickOnce = () => {
    if (!active) return;
    if (!document.hidden && !opts.isPaused()) {
      const now = Date.now();
      const intervalMs = opts.getIntervalMs();
      const prev = refs.lastTickMsRef.current ?? now - intervalMs;
      refs.lastTickMsRef.current = now;
      const dt = (now - prev) / 1000;
      const { state, tick } = stepGbm(refs.gbmRef.current, now, dt, opts.params);
      refs.gbmRef.current = state;
      refs.queueRef.current.push(tick);
    }
    schedule();
  };

  return {
    start() {
      if (active) return;
      active = true;
      schedule();
    },
    stop() {
      active = false;
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId);
        timeoutId = undefined;
      }
    },
  };
}
