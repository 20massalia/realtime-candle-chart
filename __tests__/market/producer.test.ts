import { beforeEach, describe, expect, it, vi } from "vitest";
import { createProducer } from "@/lib/market/producer";

vi.mock("@/lib/market/gbm", () => {
  return {
    stepGbm: vi.fn((state: { price: number }, now: number) => ({
      state,
      tick: { ts: now, price: state.price },
    })),
  };
});

describe("createProducer", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    vi.clearAllMocks();

    Object.defineProperty(globalThis, "document", {
      configurable: true,
      value: { hidden: false },
    });
  });

  it("applies changed speed to the next scheduled timeout", () => {
    const queueRef = { current: [] as Array<{ ts: number; price: number }> };
    const gbmRef = { current: { price: 100 } };
    const lastTickMsRef = { current: null as number | null };

    let intervalMs = 300;
    const producer = createProducer(
      { queueRef, gbmRef, lastTickMsRef },
      {
        getIntervalMs: () => intervalMs,
        params: { mu: 0, sigma: 0 },
        isPaused: () => false,
      },
    );

    producer.start();

    vi.advanceTimersByTime(299);
    expect(queueRef.current).toHaveLength(0);

    // The first schedule already used 300ms.
    intervalMs = 60;
    vi.advanceTimersByTime(1);
    expect(queueRef.current).toHaveLength(1);

    // The next schedule should use the updated 60ms speed.
    vi.advanceTimersByTime(59);
    expect(queueRef.current).toHaveLength(1);
    vi.advanceTimersByTime(1);
    expect(queueRef.current).toHaveLength(2);

    producer.stop();
  });

  it("does not enqueue when paused, but keeps scheduling", () => {
    const queueRef = { current: [] as Array<{ ts: number; price: number }> };
    const gbmRef = { current: { price: 100 } };
    const lastTickMsRef = { current: null as number | null };

    let paused = true;
    const producer = createProducer(
      { queueRef, gbmRef, lastTickMsRef },
      {
        getIntervalMs: () => 100,
        params: { mu: 0, sigma: 0 },
        isPaused: () => paused,
      },
    );

    producer.start();
    vi.advanceTimersByTime(300);
    expect(queueRef.current).toHaveLength(0);

    paused = false;
    vi.advanceTimersByTime(100);
    expect(queueRef.current).toHaveLength(1);

    producer.stop();
  });

  it("stops scheduling after stop()", () => {
    const queueRef = { current: [] as Array<{ ts: number; price: number }> };
    const gbmRef = { current: { price: 100 } };
    const lastTickMsRef = { current: null as number | null };

    const producer = createProducer(
      { queueRef, gbmRef, lastTickMsRef },
      {
        getIntervalMs: () => 100,
        params: { mu: 0, sigma: 0 },
        isPaused: () => false,
      },
    );

    producer.start();
    vi.advanceTimersByTime(100);
    expect(queueRef.current).toHaveLength(1);

    producer.stop();
    vi.advanceTimersByTime(500);
    expect(queueRef.current).toHaveLength(1);
  });
});
