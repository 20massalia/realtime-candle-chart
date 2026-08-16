package com.portfolio.candle.api.error;

public class UnknownSymbolException extends RuntimeException {

    public UnknownSymbolException(String symbol) {
        super("Unknown symbol: " + symbol);
    }
}
