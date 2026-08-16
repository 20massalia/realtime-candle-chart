-- Rollback: DROP TABLE candle;
CREATE TABLE candle (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    symbol text NOT NULL,
    interval text NOT NULL,
    bucket_start timestamptz NOT NULL,
    open numeric(18, 8) NOT NULL,
    high numeric(18, 8) NOT NULL,
    low numeric(18, 8) NOT NULL,
    close numeric(18, 8) NOT NULL,
    volume bigint,
    CONSTRAINT ck_candle_interval CHECK (interval IN ('1m', '5m', '1h', '1d')),
    CONSTRAINT ck_candle_ohlc CHECK (
        high >= low
        AND high >= open
        AND high >= close
        AND low <= open
        AND low <= close
    ),
    CONSTRAINT uk_candle_symbol_interval_bucket UNIQUE (symbol, interval, bucket_start)
);
