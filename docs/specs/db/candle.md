# candle table

- **Status**: Agreed
- **Date**: 2026-08-15
- **Migrations**: `V1__create_candle.sql`, `V2__seed_aapl_1m_candles.sql`, `V3__seed_005930_1m_candles.sql`, `V4__delete_005930_1m_seed.sql`

## Purpose

Store completed OHLC bars for `GET /api/v1/candles` and `POST /api/v1/candles` upsert (`003-candle-ingest.md`).

## Columns

| Column | Type | Null | Notes |
| --- | --- | --- | --- |
| `id` | `bigint GENERATED ALWAYS AS IDENTITY` | no | Surrogate key |
| `symbol` | `text` | no | e.g. `005930` (KRX 종목코드, mock) |
| `interval` | `text` | no | `1m` / `5m` / `1h` / `1d` (`CHECK`) |
| `bucket_start` | `timestamptz` | no | Bar open in UTC |
| `open` | `numeric(18, 8)` | no | |
| `high` | `numeric(18, 8)` | no | |
| `low` | `numeric(18, 8)` | no | |
| `close` | `numeric(18, 8)` | no | |
| `volume` | `bigint` | yes | |

Natural key: `UNIQUE (symbol, interval, bucket_start)`. Ingest uses `INSERT ... ON CONFLICT (symbol, interval, bucket_start) DO UPDATE` (replace OHLC + volume). No extra columns in 003.

## Indexes

The unique constraint covers equality filters on `(symbol, interval)` plus `ORDER BY bucket_start`. No extra index in V1 (table is empty / seed-sized).

## Partitioning

Not yet. Document a range-partition plan before production volume.

## Seed

V2 inserted three `AAPL` `1m` bars (USD). V3 deletes `AAPL` and inserts three `005930` `1m` bars. V4 deletes those three V3 fixture rows. Empty DBs after V4 have no Flyway candle seed. ## Amendment (2026-08-17) — server mock persist

Completed `005930` `1m` bars may also be written by the Spring mock GBM engine on minute roll (`006-server-gbm-websocket.md`). No schema change.

## Rollback

- V4: re-insert the three V3 `005930` `1m` bars
- V3: `DELETE FROM candle WHERE symbol = '005930' AND interval = '1m';`
- V2: `DELETE FROM candle WHERE symbol = 'AAPL' AND interval = '1m';`
- V1: `DROP TABLE candle;`

## Amendment (2026-08-17)

Default fixture symbol is `005930`. Do not edit V2; V3 is the forward fix. See `004-samsung-mock-fixture.md`.

## Amendment (2026-08-17) — remove seed

V4 deletes the V3 `005930` 1m fixture timestamps only. Chart hydrate then uses GBM-persisted bars (or empty history). See `005-chart-hydrate-roll-persist.md`.
