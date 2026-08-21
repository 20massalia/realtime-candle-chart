package com.portfolio.candle.market;

public record GbmParams(double mu, double sigma, double kappa, double theta) {

    public GbmParams(double mu, double sigma) {
        this(mu, sigma, 0, 1);
    }
}
