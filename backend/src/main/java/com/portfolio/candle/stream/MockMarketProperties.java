package com.portfolio.candle.stream;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "candle.mock-market")
public record MockMarketProperties(
        boolean enabled,
        String symbol,
        String interval,
        long tickIntervalMs,
        double mu,
        double sigma,
        double kappa,
        double fallbackPrice) {}
