package com.portfolio.candle.candle;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "candle")
public class CandleEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String symbol;

    @Column(nullable = false)
    private String interval;

    @Column(name = "bucket_start", nullable = false)
    private Instant bucketStart;

    @Column(nullable = false, precision = 18, scale = 8)
    private BigDecimal open;

    @Column(nullable = false, precision = 18, scale = 8)
    private BigDecimal high;

    @Column(nullable = false, precision = 18, scale = 8)
    private BigDecimal low;

    @Column(nullable = false, precision = 18, scale = 8)
    private BigDecimal close;

    private Long volume;

    protected CandleEntity() {
    }

    CandleEntity(
            String symbol,
            String interval,
            Instant bucketStart,
            BigDecimal open,
            BigDecimal high,
            BigDecimal low,
            BigDecimal close,
            Long volume) {
        this.symbol = symbol;
        this.interval = interval;
        this.bucketStart = bucketStart;
        this.open = open;
        this.high = high;
        this.low = low;
        this.close = close;
        this.volume = volume;
    }

    public Long getId() {
        return id;
    }

    public String getSymbol() {
        return symbol;
    }

    public String getInterval() {
        return interval;
    }

    public Instant getBucketStart() {
        return bucketStart;
    }

    public BigDecimal getOpen() {
        return open;
    }

    public BigDecimal getHigh() {
        return high;
    }

    public BigDecimal getLow() {
        return low;
    }

    public BigDecimal getClose() {
        return close;
    }

    public Long getVolume() {
        return volume;
    }
}
