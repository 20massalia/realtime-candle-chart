package com.portfolio.candle.candle;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.portfolio.candle.api.dto.CandleIngestItemRequest;
import com.portfolio.candle.api.dto.CandleIngestRequest;
import com.portfolio.candle.api.dto.CandleListResponse;
import com.portfolio.candle.api.dto.CandleQueryRequest;
import com.portfolio.candle.api.error.InvalidQueryException;
import com.portfolio.candle.api.error.UnknownSymbolException;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Pageable;

@ExtendWith(MockitoExtension.class)
class CandleServiceTest {

    @Mock
    private CandleRepository candleRepository;

    @Mock
    private CandleWriter candleWriter;

    @InjectMocks
    private CandleService candleService;

    @Test
    void throwsWhenSymbolIsUnknown() {
        when(candleRepository.existsBySymbol("ZZZZ")).thenReturn(false);

        assertThatThrownBy(() -> candleService.list(new CandleQueryRequest("ZZZZ", "1m", 200)))
                .isInstanceOf(UnknownSymbolException.class)
                .hasMessageContaining("ZZZZ");
    }

    @Test
    void reservedMockSymbolReturnsEmptyWithoutExistingRows() {
        when(candleRepository.findBySymbolAndIntervalOrderByBucketStartDesc(
                        eq("005930"), eq("1m"), any(Pageable.class)))
                .thenReturn(List.of());

        CandleListResponse response = candleService.list(new CandleQueryRequest("005930", "1m", 200));

        assertThat(response.candles()).isEmpty();
        verify(candleRepository, never()).existsBySymbol(any());
    }

    @Test
    void returnsEmptyListWhenIntervalHasNoRows() {
        when(candleRepository.findBySymbolAndIntervalOrderByBucketStartDesc(eq("005930"), eq("5m"), any(Pageable.class)))
                .thenReturn(List.of());

        CandleListResponse response = candleService.list(new CandleQueryRequest("005930", "5m", null));

        assertThat(response.symbol()).isEqualTo("005930");
        assertThat(response.interval()).isEqualTo("5m");
        assertThat(response.candles()).isEmpty();
    }

    @Test
    void returnsNewestLimitedRowsInAscendingBucketOrder() {
        Instant later = Instant.parse("2026-08-14T00:31:00Z");
        Instant earlier = Instant.parse("2026-08-14T00:30:00Z");
        when(candleRepository.findBySymbolAndIntervalOrderByBucketStartDesc(eq("005930"), eq("1m"), any(Pageable.class)))
                .thenReturn(List.of(bar(later, "75150.00"), bar(earlier, "75000.00")));

        CandleListResponse response = candleService.list(new CandleQueryRequest("005930", "1m", 2));

        assertThat(response.candles()).extracting(c -> c.bucketStart()).containsExactly(earlier, later);
        assertThat(response.candles()).extracting(c -> c.open()).containsExactly(new BigDecimal("75000.00"), new BigDecimal("75150.00"));
    }

    @Test
    void ingestRejectsDuplicateBucketStart() {
        CandleIngestItemRequest bar = ingestBar("2026-08-14T15:00:00Z", "10", "10", "10", "10");
        CandleIngestRequest request = new CandleIngestRequest("MSFT", "1m", List.of(bar, bar));

        assertThatThrownBy(() -> candleService.ingest(request))
                .isInstanceOf(InvalidQueryException.class)
                .hasMessageContaining("duplicate bucketStart");
        verify(candleWriter, never()).upsertBatch(any(), any(), any());
    }

    @Test
    void ingestRejectsInvalidOhlc() {
        CandleIngestItemRequest bar = ingestBar("2026-08-14T15:00:00Z", "10", "9", "8", "10");
        CandleIngestRequest request = new CandleIngestRequest("MSFT", "1m", List.of(bar));

        assertThatThrownBy(() -> candleService.ingest(request))
                .isInstanceOf(InvalidQueryException.class)
                .hasMessageContaining("OHLC");
        verify(candleWriter, never()).upsertBatch(any(), any(), any());
    }

    @Test
    void ingestDelegatesValidBatchOnce() {
        CandleIngestItemRequest bar = ingestBar("2026-08-14T15:00:00Z", "10", "11", "9", "10.5");
        CandleIngestRequest request = new CandleIngestRequest("MSFT", "1m", List.of(bar));

        var response = candleService.ingest(request);

        assertThat(response.symbol()).isEqualTo("MSFT");
        assertThat(response.interval()).isEqualTo("1m");
        assertThat(response.upserted()).isEqualTo(1);
        verify(candleWriter).upsertBatch(eq("MSFT"), eq("1m"), any());
    }

    private static CandleIngestItemRequest ingestBar(
            String bucketStart, String open, String high, String low, String close) {
        return new CandleIngestItemRequest(
                Instant.parse(bucketStart),
                new BigDecimal(open),
                new BigDecimal(high),
                new BigDecimal(low),
                new BigDecimal(close),
                1L);
    }

    private static CandleEntity bar(Instant bucketStart, String open) {
        BigDecimal price = new BigDecimal(open);
        return new CandleEntity("005930", "1m", bucketStart, price, price, price, price, 1L);
    }
}
