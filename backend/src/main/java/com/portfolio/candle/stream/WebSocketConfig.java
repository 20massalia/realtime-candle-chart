package com.portfolio.candle.stream;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

@Configuration
@EnableWebSocket
public class WebSocketConfig implements WebSocketConfigurer {

    private final CandleWebSocketHandler handler;
    private final CandleStreamHandshakeInterceptor interceptor;
    private final CandleWebSocketProperties properties;

    public WebSocketConfig(
            CandleWebSocketHandler handler,
            CandleStreamHandshakeInterceptor interceptor,
            CandleWebSocketProperties properties) {
        this.handler = handler;
        this.interceptor = interceptor;
        this.properties = properties;
    }

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        String[] origins = properties.allowedOrigins() == null
                ? new String[0]
                : properties.allowedOrigins().toArray(String[]::new);
        registry.addHandler(handler, "/ws/v1/candles")
                .addInterceptors(interceptor)
                .setAllowedOrigins(origins);
    }
}
