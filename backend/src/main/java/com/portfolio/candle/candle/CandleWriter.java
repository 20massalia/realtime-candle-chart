package com.portfolio.candle.candle;

import com.portfolio.candle.api.dto.CandleIngestItemRequest;
import java.util.List;

public interface CandleWriter {

    void upsertBatch(String symbol, String interval, List<CandleIngestItemRequest> bars);
}
