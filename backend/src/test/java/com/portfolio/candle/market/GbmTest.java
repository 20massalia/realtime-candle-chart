package com.portfolio.candle.market;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;

import org.junit.jupiter.api.Test;

class GbmTest {

    private static final GbmParams ZERO_DRIFT = new GbmParams(0, 0);
    private static final GbmParams TYPICAL = new GbmParams(0, 0.1);

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
}
