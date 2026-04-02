import { applyTick, type AggregateEffect } from "./aggregate";
import type { AggregateState, Tick } from "./types";

type ConsumerRefs = {
  queueRef: { current: Tick[] };
  aggRef: { current: AggregateState };
};

type ConsumerOptions = {
  /** Called for every effect emitted by applyTick; caller owns the chart update. */
  onEffect(eff: AggregateEffect): void;
};

export type ConsumerHandle = { start(): void; stop(): void };

/**
 * RAF-driven queue consumer. Drains queueRef each frame and forwards
 * AggregateEffects to the caller via onEffect. Never touches React state.
 */
export function createConsumer(
  refs: ConsumerRefs,
  opts: ConsumerOptions,
): ConsumerHandle {
  let rafId = 0;
  let active = false;

  const drain = () => {
    const q = refs.queueRef.current;
    let agg = refs.aggRef.current;
    while (q.length > 0) {
      const tick = q.shift()!;
      const { state, effects } = applyTick(agg, tick);
      agg = state;
      for (const eff of effects) opts.onEffect(eff);
    }
    refs.aggRef.current = agg;
  };

  const loop = () => {
    if (!active) return;
    if (!document.hidden) drain();
    rafId = requestAnimationFrame(loop);
  };

  return {
    start() {
      if (active) return;
      active = true;
      rafId = requestAnimationFrame(loop);
    },
    stop() {
      active = false;
      cancelAnimationFrame(rafId);
    },
  };
}
