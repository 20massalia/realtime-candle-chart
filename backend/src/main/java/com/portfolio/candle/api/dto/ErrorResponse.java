package com.portfolio.candle.api.dto;

public record ErrorResponse(String code, String message, String traceId) {}
