package com.portfolio.candle;

import com.portfolio.candle.stream.CandleWebSocketProperties;
import com.portfolio.candle.stream.MockMarketProperties;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;

@SpringBootApplication
@EnableConfigurationProperties({MockMarketProperties.class, CandleWebSocketProperties.class})
public class CandleApiApplication {

    public static void main(String[] args) {
        SpringApplication.run(CandleApiApplication.class, args);
    }
}
