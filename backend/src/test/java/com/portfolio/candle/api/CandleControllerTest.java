package com.portfolio.candle.api;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.portfolio.candle.api.dto.CandleIngestRequest;
import com.portfolio.candle.api.dto.CandleIngestResponse;
import com.portfolio.candle.api.dto.CandleListResponse;
import com.portfolio.candle.api.dto.CandleQueryRequest;
import com.portfolio.candle.api.dto.CandleResponse;
import com.portfolio.candle.api.error.UnknownSymbolException;
import com.portfolio.candle.candle.CandleService;
import org.springframework.http.MediaType;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(CandleController.class)
class CandleControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private CandleService candleService;

    @Test
    void returnsCandlesForSymbol() throws Exception {
        when(candleService.list(any(CandleQueryRequest.class)))
                .thenReturn(new CandleListResponse(
                        "005930",
                        "1m",
                        List.of(new CandleResponse(
                                Instant.parse("2026-08-14T00:30:00Z"),
                                new BigDecimal("75000.00000000"),
                                new BigDecimal("75100.00000000"),
                                new BigDecimal("74950.00000000"),
                                new BigDecimal("75050.00000000"),
                                1000L))));

        mockMvc.perform(get("/api/v1/candles").param("symbol", "005930").param("interval", "1m"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.symbol").value("005930"))
                .andExpect(jsonPath("$.interval").value("1m"))
                .andExpect(jsonPath("$.candles[0].bucketStart").value("2026-08-14T00:30:00Z"))
                .andExpect(jsonPath("$.candles[0].open").value("75000.00000000"))
                .andExpect(jsonPath("$.candles[0].high").value("75100.00000000"))
                .andExpect(jsonPath("$.candles[0].low").value("74950.00000000"))
                .andExpect(jsonPath("$.candles[0].close").value("75050.00000000"))
                .andExpect(jsonPath("$.candles[0].volume").value(1000));
    }

    @Test
    void returnsEmptyCandlesForReservedMockSymbol() throws Exception {
        when(candleService.list(any(CandleQueryRequest.class)))
                .thenReturn(new CandleListResponse("005930", "1m", List.of()));

        mockMvc.perform(get("/api/v1/candles").param("symbol", "005930").param("interval", "1m"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.symbol").value("005930"))
                .andExpect(jsonPath("$.candles.length()").value(0));
    }

    @Test
    void returns400ForInvalidSymbolPattern() throws Exception {
        mockMvc.perform(get("/api/v1/candles").param("symbol", "005930-KS").param("interval", "1m"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_QUERY"));
    }

    @Test
    void returns400ForInvalidInterval() throws Exception {
        mockMvc.perform(get("/api/v1/candles").param("symbol", "005930").param("interval", "2m"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_QUERY"))
                .andExpect(jsonPath("$.message").exists())
                .andExpect(jsonPath("$.traceId").exists());
    }

    @Test
    void returns404ForUnknownSymbol() throws Exception {
        when(candleService.list(any(CandleQueryRequest.class))).thenThrow(new UnknownSymbolException("ZZZZ"));

        mockMvc.perform(get("/api/v1/candles").param("symbol", "ZZZZ").param("interval", "1m"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("UNKNOWN_SYMBOL"));
    }

    @Test
    void ingestReturnsUpsertedCount() throws Exception {
        when(candleService.ingest(any(CandleIngestRequest.class)))
                .thenReturn(new CandleIngestResponse("MSFT", "1m", 1));

        mockMvc.perform(post("/api/v1/candles")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(
                                """
                                {
                                  "symbol": "MSFT",
                                  "interval": "1m",
                                  "candles": [{
                                    "bucketStart": "2026-08-14T15:00:00Z",
                                    "open": "420.10000000",
                                    "high": "420.50000000",
                                    "low": "420.00000000",
                                    "close": "420.25000000",
                                    "volume": 10
                                  }]
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.symbol").value("MSFT"))
                .andExpect(jsonPath("$.interval").value("1m"))
                .andExpect(jsonPath("$.upserted").value(1));
    }

    @Test
    void ingestReturns400ForInvalidInterval() throws Exception {
        mockMvc.perform(post("/api/v1/candles")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(
                                """
                                {
                                  "symbol": "MSFT",
                                  "interval": "2m",
                                  "candles": [{
                                    "bucketStart": "2026-08-14T15:00:00Z",
                                    "open": "1.00000000",
                                    "high": "1.00000000",
                                    "low": "1.00000000",
                                    "close": "1.00000000"
                                  }]
                                }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_QUERY"))
                .andExpect(jsonPath("$.traceId").exists());
    }

    @Test
    void ingestReturns400ForUnreadableJson() throws Exception {
        mockMvc.perform(post("/api/v1/candles")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_QUERY"));
    }
}
