package com.portfolio.candle.market;

public final class Gbm {

    private Gbm() {}

    public static GbmState initial(double price) {
        return new GbmState(price);
    }

    public static GbmStep step(
            GbmState state, long nowMs, double dtSeconds, GbmParams params, double z) {
        double dt = Math.max(1e-9, dtSeconds);
        double drift = (params.mu() - 0.5 * params.sigma() * params.sigma()) * dt;
        double diffusion = params.sigma() * Math.sqrt(dt) * z;
        double nextPrice = state.price() * Math.exp(drift + diffusion);
        return new GbmStep(new GbmState(nextPrice), new Tick(nowMs, nextPrice));
    }
}
