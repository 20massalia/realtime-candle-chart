package com.portfolio.candle.stream;

import com.portfolio.candle.api.dto.CandleStreamEvent;
import org.springframework.web.socket.WebSocketSession;

public interface CandleStreamHub {

    void subscribe(WebSocketSession session);

    void unsubscribe(WebSocketSession session);

    void broadcast(CandleStreamEvent event);
}
