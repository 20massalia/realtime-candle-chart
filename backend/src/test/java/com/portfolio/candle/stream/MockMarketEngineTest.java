package com.portfolio.candle.stream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.portfolio.candle.api.dto.CandleIngestRequest;
import com.portfolio.candle.api.dto.CandleStreamEvent;
import com.portfolio.candle.candle.CandleService;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class MockMarketEngineTest {

    @Mock
    private CandleService candleService;

    @Mock
    private CandleStreamHub hub;

    private MockMarketEngine engine;

    @BeforeEach
    void setUp() {
        when(candleService.latestClose("005930", "1m")).thenReturn(Optional.empty());
        MockMarketProperties properties =
                new MockMarketProperties(true, "005930", "1m", 300, 0, 0, 0, 75_000);
        engine = new MockMarketEngine(properties, candleService, hub);
    }

    @Test
    void updateBroadcastsWithoutIngest() {
        engine.tickAt(60_000, 0.3, 0);

        verify(candleService, never()).ingest(any());
        ArgumentCaptor<CandleStreamEvent> captor = ArgumentCaptor.forClass(CandleStreamEvent.class);
        verify(hub).broadcast(captor.capture());
        CandleStreamEvent event = captor.getValue();
        assertThat(event.type()).isEqualTo("update");
        assertThat(event.symbol()).isEqualTo("005930");
        assertThat(event.interval()).isEqualTo("1m");
        assertThat(event.completed()).isNull();
        assertThat(event.candle().open().toPlainString()).isEqualTo("75000.00000000");
        assertThat(event.candle().volume()).isNull();
        assertThat(engine.gbmState().price()).isEqualTo(75_000.0);
    }

    @Test
    void rollPersistsCompletedBarAndBroadcastsRoll() {
        engine.tickAt(60_000, 0.3, 0);
        engine.tickAt(120_000, 0.3, 0);

        ArgumentCaptor<CandleIngestRequest> ingest = ArgumentCaptor.forClass(CandleIngestRequest.class);
        verify(candleService, times(1)).ingest(ingest.capture());
        assertThat(ingest.getValue().symbol()).isEqualTo("005930");
        assertThat(ingest.getValue().interval()).isEqualTo("1m");
        assertThat(ingest.getValue().candles()).hasSize(1);
        assertThat(ingest.getValue().candles().getFirst().bucketStart()).isEqualTo(Instant.ofEpochSecond(60));
        assertThat(ingest.getValue().candles().getFirst().volume()).isNull();
        assertThat(ingest.getValue().candles().getFirst().close()).isEqualByComparingTo(new BigDecimal("75000.00000000"));

        ArgumentCaptor<CandleStreamEvent> events = ArgumentCaptor.forClass(CandleStreamEvent.class);
        verify(hub, times(2)).broadcast(events.capture());
        CandleStreamEvent roll = events.getAllValues().get(1);
        assertThat(roll.type()).isEqualTo("roll");
        assertThat(roll.completed()).isNotNull();
        assertThat(roll.completed().bucketStart()).isEqualTo(Instant.ofEpochSecond(60));
        assertThat(roll.candle().bucketStart()).isEqualTo(Instant.ofEpochSecond(120));
    }

    @Test
    void scheduledTickSwallowsBroadcastFailureAndKeepsTicking() {
        doThrow(new IllegalStateException("serialize")).when(hub).broadcast(any());

        assertThatCode(engine::scheduledTick).doesNotThrowAnyException();
        assertThatCode(engine::scheduledTick).doesNotThrowAnyException();
        verify(hub, times(2)).broadcast(any());
    }

    @Test
    void startPriceIgnoresCollapsedLastClose() {
        when(candleService.latestClose("005930", "1m")).thenReturn(Optional.of(new BigDecimal("150")));
        MockMarketEngine crashed =
                new MockMarketEngine(
                        new MockMarketProperties(true, "005930", "1m", 300, 0, 0, 0.02, 75_000),
                        candleService,
                        hub);

        assertThat(crashed.gbmState().price()).isEqualTo(75_000.0);
    }

    @Test
    void startPriceUsesLastCloseNearTheMean() {
        when(candleService.latestClose("005930", "1m")).thenReturn(Optional.of(new BigDecimal("76000")));
        MockMarketEngine nearMean =
                new MockMarketEngine(
                        new MockMarketProperties(true, "005930", "1m", 300, 0, 0, 0.02, 75_000),
                        candleService,
                        hub);

        assertThat(nearMean.gbmState().price()).isEqualTo(76_000.0);
    }
}
