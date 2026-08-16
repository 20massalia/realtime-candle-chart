package com.portfolio.candle.api.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record CandleStreamEvent(
        String type, String symbol, String interval, CandleResponse candle, CandleResponse completed) {}
