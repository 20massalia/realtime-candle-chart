package com.portfolio.candle.api.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import java.math.BigDecimal;
import java.time.Instant;

public record CandleResponse(
        Instant bucketStart,
        @JsonFormat(shape = JsonFormat.Shape.STRING) BigDecimal open,
        @JsonFormat(shape = JsonFormat.Shape.STRING) BigDecimal high,
        @JsonFormat(shape = JsonFormat.Shape.STRING) BigDecimal low,
        @JsonFormat(shape = JsonFormat.Shape.STRING) BigDecimal close,
        Long volume) {}
