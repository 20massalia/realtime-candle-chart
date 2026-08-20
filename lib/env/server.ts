/** Server-only env helpers for BFF → Spring REST proxying. */

const PRODUCTION_BACKEND_URL = "https://realtime-candle-api.onrender.com";

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

function deriveBackendUrlFromWebSocket(wsUrl: string): string | undefined {
  try {
    const parsed = new URL(wsUrl);
    const protocol = parsed.protocol === "wss:" ? "https:" : "http:";
    return trimTrailingSlash(`${protocol}//${parsed.host}`);
  } catch {
    return undefined;
  }
}

/**
 * Resolves the Spring Boot base URL for server-side fetches.
 * Priority: BACKEND_URL → NEXT_PUBLIC_CANDLE_WS_URL (derived) → production default on Vercel.
 */
export function getBackendUrl(): string | undefined {
  const direct = process.env.BACKEND_URL?.trim();
  if (direct) {
    return trimTrailingSlash(direct);
  }

  const wsUrl = process.env.NEXT_PUBLIC_CANDLE_WS_URL?.trim();
  if (wsUrl) {
    const derived = deriveBackendUrlFromWebSocket(wsUrl);
    if (derived) {
      return derived;
    }
  }

  if (process.env.VERCEL === "1") {
    return PRODUCTION_BACKEND_URL;
  }

  return undefined;
}
