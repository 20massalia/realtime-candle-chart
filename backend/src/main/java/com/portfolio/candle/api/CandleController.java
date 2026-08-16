package com.portfolio.candle.api;

import com.portfolio.candle.api.dto.CandleIngestRequest;
import com.portfolio.candle.api.dto.CandleIngestResponse;
import com.portfolio.candle.api.dto.CandleListResponse;
import com.portfolio.candle.api.dto.CandleQueryRequest;
import com.portfolio.candle.candle.CandleService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class CandleController {

    private final CandleService candleService;

    public CandleController(CandleService candleService) {
        this.candleService = candleService;
    }

    @GetMapping("/api/v1/candles")
    public CandleListResponse list(@Valid @ModelAttribute CandleQueryRequest request) {
        return candleService.list(request);
    }

    @PostMapping("/api/v1/candles")
    public CandleIngestResponse ingest(@Valid @RequestBody CandleIngestRequest request) {
        return candleService.ingest(request);
    }
}
