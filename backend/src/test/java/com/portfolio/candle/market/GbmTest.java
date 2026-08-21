package com.portfolio.candle.market;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;

import org.junit.jupiter.api.Test;

class GbmTest {

    private static final GbmParams ZERO_DRIFT = new GbmParams(0, 0);
    private static final GbmParams TYPICAL = new GbmParams(0, 0.1);
    private static final GbmParams MEAN_REVERTING = new GbmParams(0, 0, 0.02, 75_000);

    @Test
    void zeroMuAndSigmaKeepsPriceConstant() {
        GbmStep step = Gbm.step(Gbm.initial(100), 0, 1, ZERO_DRIFT, 1.5);
        assertThat(step.tick().price()).isEqualTo(100.0);
        assertThat(step.tick().ts()).isEqualTo(0);
        assertThat(step.state().price()).isEqualTo(step.tick().price());
    }

    @Test
    void positiveMuWithZeroSigmaGrowsByExp() {
        double mu = 1;
        double dt = 2;
        GbmStep step = Gbm.step(Gbm.initial(100), 0, dt, new GbmParams(mu, 0), 99);
        assertThat(step.tick().price()).isEqualTo(100 * Math.exp(mu * dt));
    }

    @Test
    void clampsNonPositiveDtAndStaysPositive() {
        assertThatCode(() -> Gbm.step(Gbm.initial(100), 0, 0, TYPICAL, 0.2)).doesNotThrowAnyException();
        assertThatCode(() -> Gbm.step(Gbm.initial(100), 0, -5, TYPICAL, 0.2)).doesNotThrowAnyException();
        assertThat(Gbm.step(Gbm.initial(100), 0, 0, TYPICAL, 0.2).tick().price()).isPositive();
    }

    @Test
    void zeroSigmaRevertsTowardTheta() {
        double dt = 1;
        double kappa = 0.02;
        double theta = 75_000;
        double start = 200;
        GbmStep step = Gbm.step(Gbm.initial(start), 0, dt, new GbmParams(0, 0, kappa, theta), 99);
        double expected = start * Math.exp(kappa * Math.log(theta / start) * dt);
        assertThat(step.tick().price()).isEqualTo(expected);
        assertThat(step.tick().price()).isGreaterThan(start);
        assertThat(step.tick().price()).isLessThan(theta);
    }

    @Test
    void zeroSigmaAtThetaStaysPut() {
        GbmStep step = Gbm.step(Gbm.initial(75_000), 0, 1, MEAN_REVERTING, 99);
        assertThat(step.tick().price()).isEqualTo(75_000.0);
    }

    @Test
    void zeroSigmaAboveThetaFallsTowardMean() {
        GbmStep step = Gbm.step(Gbm.initial(150_000), 0, 1, MEAN_REVERTING, 99);
        assertThat(step.tick().price()).isLessThan(150_000);
        assertThat(step.tick().price()).isGreaterThan(75_000);
    }
}
