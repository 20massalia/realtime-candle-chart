package com.portfolio.candle.api.dto;

import java.util.List;

public record CandleListResponse(String symbol, String interval, List<CandleResponse> candles) {}
