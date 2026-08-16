-- Rollback: re-insert the V3 Samsung mock bars (see V3__seed_005930_1m_candles.sql).
-- Removes Flyway fixture rows only. Live GBM/ingest bars are left in place.
DELETE FROM candle
WHERE symbol = '005930'
  AND interval = '1m'
  AND bucket_start IN (
      TIMESTAMPTZ '2026-08-14T00:30:00Z',
      TIMESTAMPTZ '2026-08-14T00:31:00Z',
      TIMESTAMPTZ '2026-08-14T00:32:00Z'
  );
