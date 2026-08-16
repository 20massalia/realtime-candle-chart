package com.portfolio.candle.stream;

import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "candle.websocket")
public record CandleWebSocketProperties(List<String> allowedOrigins) {}
