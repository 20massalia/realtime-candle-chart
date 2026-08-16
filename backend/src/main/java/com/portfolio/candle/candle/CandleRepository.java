package com.portfolio.candle.candle;

import java.util.List;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CandleRepository extends JpaRepository<CandleEntity, Long> {

    boolean existsBySymbol(String symbol);

    List<CandleEntity> findBySymbolAndIntervalOrderByBucketStartDesc(
            String symbol, String interval, Pageable pageable);
}
