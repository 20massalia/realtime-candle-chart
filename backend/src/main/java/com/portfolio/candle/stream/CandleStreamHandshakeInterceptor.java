package com.portfolio.candle.stream;

import java.net.URI;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.HandshakeInterceptor;
import org.springframework.web.util.UriComponentsBuilder;

@Component
public class CandleStreamHandshakeInterceptor implements HandshakeInterceptor {

    static final String ATTR_SYMBOL = "symbol";
    static final String ATTR_INTERVAL = "interval";

    private final MockMarketProperties mockMarketProperties;
    private final CandleWebSocketProperties webSocketProperties;

    public CandleStreamHandshakeInterceptor(
            MockMarketProperties mockMarketProperties, CandleWebSocketProperties webSocketProperties) {
        this.mockMarketProperties = mockMarketProperties;
        this.webSocketProperties = webSocketProperties;
    }

    @Override
    public boolean beforeHandshake(
            ServerHttpRequest request,
            ServerHttpResponse response,
            WebSocketHandler wsHandler,
            Map<String, Object> attributes) {
        Map<String, String> query = queryParams(request.getURI());
        String symbol = query.get("symbol");
        String interval = query.get("interval");
        if (!mockMarketProperties.symbol().equals(symbol) || !mockMarketProperties.interval().equals(interval)) {
            reject(response);
            return false;
        }
        String origin = request.getHeaders().getOrigin();
        List<String> allowed = webSocketProperties.allowedOrigins();
        if (origin != null && (allowed == null || !allowed.contains(origin))) {
            reject(response);
            return false;
        }
        attributes.put(ATTR_SYMBOL, symbol);
        attributes.put(ATTR_INTERVAL, interval);
        return true;
    }

    @Override
    public void afterHandshake(
            ServerHttpRequest request,
            ServerHttpResponse response,
            WebSocketHandler wsHandler,
            Exception exception) {
        // no-op
    }

    private static Map<String, String> queryParams(URI uri) {
        Map<String, String> params = new LinkedHashMap<>();
        UriComponentsBuilder.fromUri(uri)
                .build()
                .getQueryParams()
                .forEach((key, values) -> {
                    if (!values.isEmpty()) {
                        params.put(key, values.getFirst());
                    }
                });
        return params;
    }

    private static void reject(ServerHttpResponse response) {
        response.setStatusCode(HttpStatus.BAD_REQUEST);
    }
}
