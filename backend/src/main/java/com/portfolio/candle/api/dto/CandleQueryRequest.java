package com.portfolio.candle.api.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record CandleQueryRequest(
        @NotBlank @Pattern(regexp = "^[A-Z0-9.]{1,10}$", message = "symbol must match ^[A-Z0-9.]{1,10}$") String symbol,
        @NotBlank @Pattern(regexp = "^(1m|5m|1h|1d)$", message = "interval must be one of 1m, 5m, 1h, 1d") String interval,
        @Min(1) @Max(1000) Integer limit) {

    public int limitOrDefault() {
        return limit == null ? 200 : limit;
    }
}
