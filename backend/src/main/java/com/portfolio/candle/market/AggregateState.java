package com.portfolio.candle.market;

public record AggregateState(Long minuteStartSec, MarketCandle candle) {

    public static AggregateState empty() {
        return new AggregateState(null, null);
    }
}
