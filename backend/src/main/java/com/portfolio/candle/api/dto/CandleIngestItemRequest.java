package com.portfolio.candle.api.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.Instant;

public record CandleIngestItemRequest(
        @NotNull Instant bucketStart,
        @NotNull @DecimalMin(value = "0", inclusive = false, message = "open must be > 0")
                @JsonFormat(shape = JsonFormat.Shape.STRING)
                BigDecimal open,
        @NotNull @DecimalMin(value = "0", inclusive = false, message = "high must be > 0")
                @JsonFormat(shape = JsonFormat.Shape.STRING)
                BigDecimal high,
        @NotNull @DecimalMin(value = "0", inclusive = false, message = "low must be > 0")
                @JsonFormat(shape = JsonFormat.Shape.STRING)
                BigDecimal low,
        @NotNull @DecimalMin(value = "0", inclusive = false, message = "close must be > 0")
                @JsonFormat(shape = JsonFormat.Shape.STRING)
                BigDecimal close,
        @Min(0) Long volume) {}
