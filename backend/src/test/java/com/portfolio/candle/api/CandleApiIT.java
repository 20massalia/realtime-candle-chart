package com.portfolio.candle.api;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.springframework.http.MediaType;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

@SpringBootTest(properties = "candle.mock-market.enabled=false")
@AutoConfigureMockMvc
@Testcontainers
class CandleApiIT {

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");

    @Autowired
    private MockMvc mockMvc;

    @Test
    void returns200EmptyWhenSamsungHasNoRows() throws Exception {
        mockMvc.perform(get("/api/v1/candles").param("symbol", "005930").param("interval", "1m"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.symbol").value("005930"))
                .andExpect(jsonPath("$.interval").value("1m"))
                .andExpect(jsonPath("$.candles.length()").value(0));
    }

    @Test
    void returns404ForRetiredAaplSeedSymbol() throws Exception {
        mockMvc.perform(get("/api/v1/candles").param("symbol", "AAPL").param("interval", "1m"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("UNKNOWN_SYMBOL"));
    }

    @Test
    void returns404WhenSymbolDoesNotExist() throws Exception {
        mockMvc.perform(get("/api/v1/candles").param("symbol", "ZZZZ").param("interval", "1m"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("UNKNOWN_SYMBOL"));
    }

    @Test
    void returnsEmptyCandlesForKnownSymbolMissingInterval() throws Exception {
        mockMvc.perform(post("/api/v1/candles")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(msftBar("420.25000000")))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/v1/candles").param("symbol", "MSFT").param("interval", "1d"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.candles.length()").value(0));
    }

    @Test
    void livenessProbeIsUp() throws Exception {
        mockMvc.perform(get("/actuator/health/liveness"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("UP"));
    }

    @Test
    void readinessProbeIsUpWhenDatabaseIsReachable() throws Exception {
        mockMvc.perform(get("/actuator/health/readiness"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("UP"));
    }

    @Test
    void ingestThenGetReturnsNewSymbol() throws Exception {
        mockMvc.perform(post("/api/v1/candles")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(msftBar("420.25000000")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.symbol").value("MSFT"))
                .andExpect(jsonPath("$.upserted").value(1));

        mockMvc.perform(get("/api/v1/candles").param("symbol", "MSFT").param("interval", "1m"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.candles.length()").value(1))
                .andExpect(jsonPath("$.candles[0].close").value("420.25000000"));
    }

    @Test
    void ingestReplacesExistingBarOnNaturalKey() throws Exception {
        mockMvc.perform(post("/api/v1/candles")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(msftBar("421.00000000")))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/v1/candles").param("symbol", "MSFT").param("interval", "1m"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.candles.length()").value(1))
                .andExpect(jsonPath("$.candles[0].close").value("421.00000000"));
    }

    private static String msftBar(String close) {
        return """
                {
                  "symbol": "MSFT",
                  "interval": "1m",
                  "candles": [{
                    "bucketStart": "2026-08-14T15:00:00Z",
                    "open": "420.10000000",
                    "high": "422.00000000",
                    "low": "420.00000000",
                    "close": "%s",
                    "volume": 10
                  }]
                }
                """
                .formatted(close);
    }
}
