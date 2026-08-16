package com.portfolio.candle.candle;

import com.portfolio.candle.api.dto.CandleIngestItemRequest;
import com.portfolio.candle.api.dto.CandleIngestRequest;
import com.portfolio.candle.api.dto.CandleIngestResponse;
import com.portfolio.candle.api.dto.CandleListResponse;
import com.portfolio.candle.api.dto.CandleQueryRequest;
import com.portfolio.candle.api.dto.CandleResponse;
import com.portfolio.candle.api.error.InvalidQueryException;
import com.portfolio.candle.api.error.UnknownSymbolException;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CandleService {

    public static final String RESERVED_MOCK_SYMBOL = "005930";

    private final CandleRepository candleRepository;
    private final CandleWriter candleWriter;

    public CandleService(CandleRepository candleRepository, CandleWriter candleWriter) {
        this.candleRepository = candleRepository;
        this.candleWriter = candleWriter;
    }

    @Transactional(readOnly = true)
    public CandleListResponse list(CandleQueryRequest request) {
        if (!isKnownSymbol(request.symbol())) {
            throw new UnknownSymbolException(request.symbol());
        }
        List<CandleEntity> newestFirst = candleRepository.findBySymbolAndIntervalOrderByBucketStartDesc(
                request.symbol(), request.interval(), PageRequest.of(0, request.limitOrDefault()));
        List<CandleEntity> oldestFirst = new ArrayList<>(newestFirst);
        Collections.reverse(oldestFirst);
        List<CandleResponse> candles = oldestFirst.stream().map(this::toResponse).toList();
        return new CandleListResponse(request.symbol(), request.interval(), candles);
    }

    @Transactional
    public CandleIngestResponse ingest(CandleIngestRequest request) {
        Set<Instant> seen = new HashSet<>();
        for (CandleIngestItemRequest bar : request.candles()) {
            if (!seen.add(bar.bucketStart())) {
                throw new InvalidQueryException("duplicate bucketStart in request");
            }
            if (!isValidOhlc(bar)) {
                throw new InvalidQueryException("OHLC constraint violated");
            }
        }
        candleWriter.upsertBatch(request.symbol(), request.interval(), request.candles());
        return new CandleIngestResponse(request.symbol(), request.interval(), request.candles().size());
    }

    @Transactional(readOnly = true)
    public Optional<BigDecimal> latestClose(String symbol, String interval) {
        List<CandleEntity> newest = candleRepository.findBySymbolAndIntervalOrderByBucketStartDesc(
                symbol, interval, PageRequest.of(0, 1));
        if (newest.isEmpty()) {
            return Optional.empty();
        }
        return Optional.of(newest.getFirst().getClose());
    }

    private boolean isKnownSymbol(String symbol) {
        return RESERVED_MOCK_SYMBOL.equals(symbol) || candleRepository.existsBySymbol(symbol);
    }

    private static boolean isValidOhlc(CandleIngestItemRequest bar) {
        return bar.high().compareTo(bar.low()) >= 0
                && bar.high().compareTo(bar.open()) >= 0
                && bar.high().compareTo(bar.close()) >= 0
                && bar.low().compareTo(bar.open()) <= 0
                && bar.low().compareTo(bar.close()) <= 0;
    }

    private CandleResponse toResponse(CandleEntity entity) {
        return new CandleResponse(
                entity.getBucketStart(),
                entity.getOpen(),
                entity.getHigh(),
                entity.getLow(),
                entity.getClose(),
                entity.getVolume());
    }
}
