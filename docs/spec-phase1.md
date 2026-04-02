# Stock Candle Visualization - Phase 1: Mocking

## Tech Stack

- Next.js App Router
- Lightweight Charts
- Zustand (UI state only)
- GBM mock data
- RAF + queue buffering

## Functional Requirements

- GBM tick generation (0.1-0.5s intervals)
- Tick → 1m OHLC aggregation
- Live candle real-time update
- New minute → new candle

## Performance Goals

- 60fps smooth rendering
- No jank from React re-renders
- Background tab resource preservation

## Types

```ts
type Tick = { ts: number; price: number };
type Candle = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
};
```

## Implementation Phases

1. Types + GBM generator
2. OHLC aggregator
3. Client chart component
4. RAF queue consumer
5. Visibility handling
