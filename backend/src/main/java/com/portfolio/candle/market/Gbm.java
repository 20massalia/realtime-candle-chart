package com.portfolio.candle.market;

public final class Gbm {

    private Gbm() {}

    public static GbmState initial(double price) {
        return new GbmState(price);
    }

    public static GbmStep step(
            GbmState state, long nowMs, double dtSeconds, GbmParams params, double z) {
        double dt = Math.max(1e-9, dtSeconds);
        double sigma = params.sigma();
        double logPrice = Math.log(Math.max(state.price(), 1e-12));
        double reversion = 0;
        if (params.kappa() != 0 && params.theta() > 0) {
            reversion = params.kappa() * (Math.log(params.theta()) - logPrice);
        }
        double drift = (params.mu() - 0.5 * sigma * sigma + reversion) * dt;
        double diffusion = sigma * Math.sqrt(dt) * z;
        double nextPrice = state.price() * Math.exp(drift + diffusion);
        return new GbmStep(new GbmState(nextPrice), new Tick(nowMs, nextPrice));
    }
}
