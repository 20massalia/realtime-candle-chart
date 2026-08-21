package com.portfolio.candle.stream;

import com.portfolio.candle.api.dto.CandleIngestItemRequest;
import com.portfolio.candle.api.dto.CandleIngestRequest;
import com.portfolio.candle.api.dto.CandleResponse;
import com.portfolio.candle.api.dto.CandleStreamEvent;
import com.portfolio.candle.candle.CandleService;
import com.portfolio.candle.market.AggregateEffect;
import com.portfolio.candle.market.AggregateState;
import com.portfolio.candle.market.Gbm;
import com.portfolio.candle.market.GbmParams;
import com.portfolio.candle.market.GbmState;
import com.portfolio.candle.market.GbmStep;
import com.portfolio.candle.market.MarketCandle;
import com.portfolio.candle.market.OhlcAggregator;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.List;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ThreadLocalRandom;
import java.util.concurrent.TimeUnit;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(prefix = "candle.mock-market", name = "enabled", havingValue = "true")
public class MockMarketEngine {

    private static final Logger log = LoggerFactory.getLogger(MockMarketEngine.class);
    /** Last close outside [band, 1/band] × fallback is treated as a crashed path. */
    private static final double START_PRICE_BAND = 0.5;

    private final MockMarketProperties properties;
    private final CandleService candleService;
    private final CandleStreamHub hub;

    private ScheduledExecutorService scheduler;

    private GbmState gbmState;
    private AggregateState aggregateState = AggregateState.empty();
    private Long lastTickMs;

    public MockMarketEngine(
            MockMarketProperties properties, CandleService candleService, CandleStreamHub hub) {
        this.properties = properties;
        this.candleService = candleService;
        this.hub = hub;
        this.gbmState = Gbm.initial(startPrice());
    }

    @EventListener(ApplicationReadyEvent.class)
    public void start() {
        if (scheduler != null) {
            return;
        }
        long intervalMs = Math.max(1L, properties.tickIntervalMs());
        scheduler = Executors.newSingleThreadScheduledExecutor(r -> {
            Thread thread = new Thread(r, "mock-market-gbm");
            thread.setDaemon(true);
            return thread;
        });
        scheduler.scheduleAtFixedRate(this::scheduledTick, intervalMs, intervalMs, TimeUnit.MILLISECONDS);
    }

    public void tickAt(long nowMs, double dtSeconds, double z) {
        GbmParams params =
                new GbmParams(properties.mu(), properties.sigma(), properties.kappa(), properties.fallbackPrice());
        GbmStep step = Gbm.step(gbmState, nowMs, dtSeconds, params, z);
        gbmState = step.state();
        lastTickMs = nowMs;
        OhlcAggregator.AggregateResult result = OhlcAggregator.applyTick(aggregateState, step.tick());
        aggregateState = result.state();
        for (AggregateEffect effect : result.effects()) {
            handle(effect);
        }
    }

    void scheduledTick() {
        try {
            long now = System.currentTimeMillis();
            long intervalMs = Math.max(1L, properties.tickIntervalMs());
            long prev = lastTickMs == null ? now - intervalMs : lastTickMs;
            double dt = (now - prev) / 1000.0;
            tickAt(now, dt, ThreadLocalRandom.current().nextGaussian());
        } catch (RuntimeException ex) {
            log.warn("Mock market tick failed; continuing: {}", ex.getMessage());
        }
    }

    private void handle(AggregateEffect effect) {
        if (effect instanceof AggregateEffect.Update update) {
            hub.broadcast(event("update", update.candle(), null));
            return;
        }
        if (effect instanceof AggregateEffect.Roll roll) {
            persist(roll.completed());
            hub.broadcast(event("roll", roll.candle(), roll.completed()));
        }
    }

    private void persist(MarketCandle completed) {
        CandleIngestItemRequest bar = new CandleIngestItemRequest(
                Instant.ofEpochSecond(completed.time()),
                decimal(completed.open()),
                decimal(completed.high()),
                decimal(completed.low()),
                decimal(completed.close()),
                null);
        candleService.ingest(new CandleIngestRequest(properties.symbol(), properties.interval(), List.of(bar)));
    }

    private CandleStreamEvent event(String type, MarketCandle candle, MarketCandle completed) {
        return new CandleStreamEvent(
                type,
                properties.symbol(),
                properties.interval(),
                toWire(candle),
                completed == null ? null : toWire(completed));
    }

    private CandleResponse toWire(MarketCandle candle) {
        return new CandleResponse(
                Instant.ofEpochSecond(candle.time()),
                decimal(candle.open()),
                decimal(candle.high()),
                decimal(candle.low()),
                decimal(candle.close()),
                null);
    }

    private double startPrice() {
        double fallback = properties.fallbackPrice();
        return candleService
                .latestClose(properties.symbol(), properties.interval())
                .map(BigDecimal::doubleValue)
                .filter(price -> price >= fallback * START_PRICE_BAND && price <= fallback / START_PRICE_BAND)
                .orElse(fallback);
    }

    static BigDecimal decimal(double value) {
        return new BigDecimal(Double.toString(value)).setScale(8, RoundingMode.HALF_UP);
    }

    @jakarta.annotation.PreDestroy
    public void stop() {
        if (scheduler != null) {
            scheduler.shutdownNow();
        }
    }

    GbmState gbmState() {
        return gbmState;
    }
}
