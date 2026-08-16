-- Rollback: DELETE FROM candle WHERE symbol = '005930' AND interval = '1m';
-- Replaces the V2 AAPL USD seed with Samsung Electronics (KRX 005930) KRW mock bars.
-- Prices are fixed fixtures (~₩75,000), not live quotes.
DELETE FROM candle WHERE symbol = 'AAPL';

INSERT INTO candle (symbol, interval, bucket_start, open, high, low, close, volume)
VALUES
    ('005930', '1m', '2026-08-14T00:30:00Z', 75000.00000000, 75100.00000000, 74950.00000000, 75050.00000000, 1000),
    ('005930', '1m', '2026-08-14T00:31:00Z', 75050.00000000, 75200.00000000, 75000.00000000, 75150.00000000, 1100),
    ('005930', '1m', '2026-08-14T00:32:00Z', 75150.00000000, 75300.00000000, 75100.00000000, 75250.00000000, 900);
