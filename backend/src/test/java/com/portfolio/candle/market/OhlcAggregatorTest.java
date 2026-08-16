package com.portfolio.candle.market;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class OhlcAggregatorTest {

    private static final long MIN1_MS = 60_000;
    private static final long MIN2_MS = 120_000;

    @Test
    void floorsTickMsToMinuteStartSeconds() {
        assertThat(OhlcAggregator.minuteStartSecFromTickMs(0)).isEqualTo(0);
        assertThat(OhlcAggregator.minuteStartSecFromTickMs(59_999)).isEqualTo(0);
        assertThat(OhlcAggregator.minuteStartSecFromTickMs(60_000)).isEqualTo(60);
        assertThat(OhlcAggregator.minuteStartSecFromTickMs(119_999)).isEqualTo(60);
        assertThat(OhlcAggregator.minuteStartSecFromTickMs(120_000)).isEqualTo(120);
    }

    @Test
    void firstTickEmitsUpdateWithFlatOhlc() {
        OhlcAggregator.AggregateResult result =
                OhlcAggregator.applyTick(AggregateState.empty(), new Tick(MIN1_MS, 100));
        assertThat(result.effects()).hasSize(1);
        assertThat(result.effects().getFirst()).isInstanceOf(AggregateEffect.Update.class);
        MarketCandle candle = ((AggregateEffect.Update) result.effects().getFirst()).candle();
        assertThat(candle).isEqualTo(new MarketCandle(60, 100, 100, 100, 100));
        assertThat(result.state().minuteStartSec()).isEqualTo(60L);
    }

    @Test
    void sameMinuteTracksHighLowCloseAndPreservesOpen() {
        AggregateState state = AggregateState.empty();
        state = OhlcAggregator.applyTick(state, new Tick(MIN1_MS, 100)).state();
        state = OhlcAggregator.applyTick(state, new Tick(MIN1_MS + 1_000, 150)).state();
        state = OhlcAggregator.applyTick(state, new Tick(MIN1_MS + 2_000, 80)).state();
        OhlcAggregator.AggregateResult result =
                OhlcAggregator.applyTick(state, new Tick(MIN1_MS + 3_000, 120));
        assertThat(result.effects().getFirst()).isInstanceOf(AggregateEffect.Update.class);
        assertThat(((AggregateEffect.Update) result.effects().getFirst()).candle())
                .isEqualTo(new MarketCandle(60, 100, 150, 80, 120));
    }

    @Test
    void minuteBoundaryEmitsRollWithCompletedAndNewBar() {
        AggregateState state = AggregateState.empty();
        state = OhlcAggregator.applyTick(state, new Tick(MIN1_MS, 100)).state();
        state = OhlcAggregator.applyTick(state, new Tick(MIN1_MS + 10_000, 150)).state();
        OhlcAggregator.AggregateResult result =
                OhlcAggregator.applyTick(state, new Tick(MIN2_MS, 200));
        assertThat(result.effects().getFirst()).isInstanceOf(AggregateEffect.Roll.class);
        AggregateEffect.Roll roll = (AggregateEffect.Roll) result.effects().getFirst();
        assertThat(roll.completed()).isEqualTo(new MarketCandle(60, 100, 150, 100, 150));
        assertThat(roll.candle()).isEqualTo(new MarketCandle(120, 200, 200, 200, 200));
        assertThat(result.state().minuteStartSec()).isEqualTo(120L);
    }
}
