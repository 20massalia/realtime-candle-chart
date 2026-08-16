package com.portfolio.candle.market;

public sealed interface AggregateEffect {

    record Update(MarketCandle candle) implements AggregateEffect {}

    record Roll(MarketCandle completed, MarketCandle candle) implements AggregateEffect {}
}
