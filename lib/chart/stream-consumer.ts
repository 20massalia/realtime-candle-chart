import type { CandleStreamEvent } from "@/lib/api/candles-stream";
import { drainStreamQueue } from "@/lib/api/candles-stream";

type StreamConsumerRefs = {
  queueRef: { current: CandleStreamEvent[] };
};

type StreamConsumerOptions = {
  onEvent(event: CandleStreamEvent): void;
  isPaused(): boolean;
  isHidden(): boolean;
};

export type StreamConsumerHandle = { start(): void; stop(): void };

export function createStreamConsumer(
  refs: StreamConsumerRefs,
  opts: StreamConsumerOptions,
): StreamConsumerHandle {
  let rafId = 0;
  let active = false;

  const loop = () => {
    if (!active) {
      return;
    }
    if (!opts.isHidden() && !opts.isPaused()) {
      drainStreamQueue(refs.queueRef.current, opts.onEvent);
    }
    rafId = requestAnimationFrame(loop);
  };

  return {
    start() {
      if (active) {
        return;
      }
      active = true;
      rafId = requestAnimationFrame(loop);
    },
    stop() {
      active = false;
      cancelAnimationFrame(rafId);
    },
  };
}
