package com.portfolio.candle.candle;

import com.portfolio.candle.api.dto.CandleIngestItemRequest;
import java.time.ZoneOffset;
import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class JdbcCandleWriter implements CandleWriter {

    private static final String UPSERT_SQL =
            """
            INSERT INTO candle (symbol, "interval", bucket_start, open, high, low, close, volume)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT (symbol, "interval", bucket_start) DO UPDATE SET
              open = EXCLUDED.open,
              high = EXCLUDED.high,
              low = EXCLUDED.low,
              close = EXCLUDED.close,
              volume = EXCLUDED.volume
            """;

    private final JdbcTemplate jdbcTemplate;

    public JdbcCandleWriter(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public void upsertBatch(String symbol, String interval, List<CandleIngestItemRequest> bars) {
        jdbcTemplate.batchUpdate(UPSERT_SQL, bars, bars.size(), (ps, bar) -> {
            ps.setString(1, symbol);
            ps.setString(2, interval);
            ps.setObject(3, bar.bucketStart().atOffset(ZoneOffset.UTC));
            ps.setBigDecimal(4, bar.open());
            ps.setBigDecimal(5, bar.high());
            ps.setBigDecimal(6, bar.low());
            ps.setBigDecimal(7, bar.close());
            if (bar.volume() == null) {
                ps.setObject(8, null);
            } else {
                ps.setLong(8, bar.volume());
            }
        });
    }
}
