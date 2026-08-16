package com.portfolio.candle.api.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.util.List;

public record CandleIngestRequest(
        @NotBlank @Pattern(regexp = "^[A-Z0-9.]{1,10}$", message = "symbol must match ^[A-Z0-9.]{1,10}$") String symbol,
        @NotBlank @Pattern(regexp = "^(1m|5m|1h|1d)$", message = "interval must be one of 1m, 5m, 1h, 1d") String interval,
        @NotNull @Size(min = 1, max = 500, message = "candles must contain between 1 and 500 bars") @Valid
                List<CandleIngestItemRequest> candles) {}
