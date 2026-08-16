"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  parseCandleIngestResponse,
  parseErrorResponse,
  type CandleInterval,
} from "@/lib/api/candles";

type Props = {
  symbol: string;
  interval: CandleInterval;
};

export function CandleIngestForm({ symbol, interval }: Props) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const volumeRaw = String(form.get("volume") ?? "").trim();
    setPending(true);
    setMessage(null);
    try {
      const res = await fetch("/api/candles", {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({
          symbol,
          interval,
          candles: [
            {
              bucketStart: String(form.get("bucketStart") ?? ""),
              open: String(form.get("open") ?? ""),
              high: String(form.get("high") ?? ""),
              low: String(form.get("low") ?? ""),
              close: String(form.get("close") ?? ""),
              volume: volumeRaw === "" ? null : Number(volumeRaw),
            },
          ],
        }),
      });
      const payload: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        const error = parseErrorResponse(payload);
        setMessage(`${error?.code ?? "ERROR"}: ${error?.message ?? `ingest failed (${res.status})`}`);
        return;
      }
      const body = parseCandleIngestResponse(payload);
      setMessage(`upserted ${body.upserted}`);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "ingest failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-3 rounded-md border border-zinc-200 p-4 dark:border-zinc-800"
      data-testid="candle-ingest-form"
    >
      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
        POST ingest — {symbol} {interval}
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="text-xs text-zinc-600 dark:text-zinc-400">
          bucketStart
          <input
            name="bucketStart"
            required
            defaultValue="2026-08-14T00:33:00Z"
            className="mt-1 w-full rounded border border-zinc-300 bg-white px-2 py-1 font-mono text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
        </label>
        <label className="text-xs text-zinc-600 dark:text-zinc-400">
          volume
          <input
            name="volume"
            type="number"
            defaultValue="1000"
            className="mt-1 w-full rounded border border-zinc-300 bg-white px-2 py-1 font-mono text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
        </label>
        {(["open", "high", "low", "close"] as const).map((field) => (
          <label key={field} className="text-xs text-zinc-600 dark:text-zinc-400">
            {field}
            <input
              name={field}
              required
              defaultValue="75400.00000000"
              className="mt-1 w-full rounded border border-zinc-300 bg-white px-2 py-1 font-mono text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
          </label>
        ))}
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded bg-zinc-900 px-3 py-1.5 text-sm text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
      >
        Upsert bar
      </button>
      {message ? (
        <p data-testid="candle-ingest-status" className="text-sm text-zinc-600 dark:text-zinc-400">
          {message}
        </p>
      ) : null}
    </form>
  );
}
