import { afterEach, describe, expect, it, vi } from "vitest";
import { getBackendUrl } from "@/lib/env/server";

describe("getBackendUrl", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("prefers BACKEND_URL when set", () => {
    vi.stubEnv("BACKEND_URL", "http://localhost:8080/");
    vi.stubEnv("NEXT_PUBLIC_CANDLE_WS_URL", "wss://api.example.com/ws/v1/candles");
    expect(getBackendUrl()).toBe("http://localhost:8080");
  });

  it("derives REST base URL from NEXT_PUBLIC_CANDLE_WS_URL", () => {
    vi.stubEnv("BACKEND_URL", "");
    vi.stubEnv("NEXT_PUBLIC_CANDLE_WS_URL", "wss://api.example.com/ws/v1/candles");
    expect(getBackendUrl()).toBe("https://api.example.com");
  });

  it("falls back to Render URL on Vercel when unset", () => {
    vi.stubEnv("BACKEND_URL", "");
    vi.stubEnv("NEXT_PUBLIC_CANDLE_WS_URL", "");
    vi.stubEnv("VERCEL", "1");
    expect(getBackendUrl()).toBe("https://realtime-candle-api.onrender.com");
  });

  it("returns undefined locally when unset", () => {
    vi.stubEnv("BACKEND_URL", "");
    vi.stubEnv("NEXT_PUBLIC_CANDLE_WS_URL", "");
    vi.stubEnv("VERCEL", "");
    expect(getBackendUrl()).toBeUndefined();
  });
});
