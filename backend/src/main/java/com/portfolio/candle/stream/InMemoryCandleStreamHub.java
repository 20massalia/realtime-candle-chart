package com.portfolio.candle.stream;

import java.io.IOException;
import java.util.Set;
import java.util.concurrent.CopyOnWriteArraySet;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.ObjectMapper;
import com.portfolio.candle.api.dto.CandleStreamEvent;

@Component
public class InMemoryCandleStreamHub implements CandleStreamHub {

    private static final Logger log = LoggerFactory.getLogger(InMemoryCandleStreamHub.class);

    private final Set<WebSocketSession> sessions = new CopyOnWriteArraySet<>();
    private final ObjectMapper objectMapper;

    public InMemoryCandleStreamHub(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @Override
    public void subscribe(WebSocketSession session) {
        sessions.add(session);
    }

    @Override
    public void unsubscribe(WebSocketSession session) {
        sessions.remove(session);
    }

    @Override
    public void broadcast(CandleStreamEvent event) {
        String json;
        try {
            json = objectMapper.writeValueAsString(event);
        } catch (JacksonException e) {
            throw new IllegalStateException("Failed to serialize candle stream event", e);
        }
        TextMessage message = new TextMessage(json);
        for (WebSocketSession session : sessions) {
            if (!session.isOpen()) {
                sessions.remove(session);
                continue;
            }
            synchronized (session) {
                try {
                    session.sendMessage(message);
                } catch (IOException e) {
                    log.debug("Dropping candle stream session {}: {}", session.getId(), e.getMessage());
                    sessions.remove(session);
                }
            }
        }
    }
}
