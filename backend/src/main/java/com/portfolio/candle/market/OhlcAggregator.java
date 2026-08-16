package com.portfolio.candle.market;

import java.util.List;

public final class OhlcAggregator {

    private OhlcAggregator() {}

    public static long minuteStartSecFromTickMs(long tsMs) {
        return Math.floorDiv(tsMs, 60_000L) * 60L;
    }

    public static AggregateResult applyTick(AggregateState state, Tick tick) {
        long minute = minuteStartSecFromTickMs(tick.ts());
        if (state.minuteStartSec() == null || state.candle() == null) {
            MarketCandle candle = flat(minute, tick.price());
            return new AggregateResult(new AggregateState(minute, candle), List.of(new AggregateEffect.Update(candle)));
        }
        if (minute == state.minuteStartSec()) {
            MarketCandle prev = state.candle();
            MarketCandle candle = new MarketCandle(
                    minute,
                    prev.open(),
                    Math.max(prev.high(), tick.price()),
                    Math.min(prev.low(), tick.price()),
                    tick.price());
            return new AggregateResult(new AggregateState(minute, candle), List.of(new AggregateEffect.Update(candle)));
        }
        MarketCandle completed = state.candle();
        MarketCandle candle = flat(minute, tick.price());
        return new AggregateResult(
                new AggregateState(minute, candle), List.of(new AggregateEffect.Roll(completed, candle)));
    }

    private static MarketCandle flat(long time, double price) {
        return new MarketCandle(time, price, price, price, price);
    }

    public record AggregateResult(AggregateState state, List<AggregateEffect> effects) {}
}
