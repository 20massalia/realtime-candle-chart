package com.portfolio.candle.api.dto;

public record CandleIngestResponse(String symbol, String interval, int upserted) {}
