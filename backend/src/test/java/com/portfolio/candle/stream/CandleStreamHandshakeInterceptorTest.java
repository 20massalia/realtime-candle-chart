package com.portfolio.candle.stream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.net.URI;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.web.socket.WebSocketHandler;

class CandleStreamHandshakeInterceptorTest {

    private CandleStreamHandshakeInterceptor interceptor;

    @BeforeEach
    void setUp() {
        interceptor = new CandleStreamHandshakeInterceptor(
                new MockMarketProperties(true, "005930", "1m", 300, 0, 0.03, 0.02, 75_000),
                new CandleWebSocketProperties(List.of("http://localhost:3000", "http://127.0.0.1:3000")));
    }

    @Test
    void acceptsReservedStreamQueryWithoutOrigin() {
        Map<String, Object> attributes = new HashMap<>();
        boolean ok = interceptor.beforeHandshake(
                request("ws://localhost:8080/ws/v1/candles?symbol=005930&interval=1m", null),
                mock(ServerHttpResponse.class),
                mock(WebSocketHandler.class),
                attributes);
        assertThat(ok).isTrue();
        assertThat(attributes.get("symbol")).isEqualTo("005930");
        assertThat(attributes.get("interval")).isEqualTo("1m");
    }

    @Test
    void rejectsUnknownSymbol() {
        ServerHttpResponse response = mock(ServerHttpResponse.class);
        boolean ok = interceptor.beforeHandshake(
                request("ws://localhost:8080/ws/v1/candles?symbol=MSFT&interval=1m", null),
                response,
                mock(WebSocketHandler.class),
                new HashMap<>());
        assertThat(ok).isFalse();
        verify(response).setStatusCode(HttpStatus.BAD_REQUEST);
    }

    @Test
    void rejectsDisallowedOrigin() {
        ServerHttpResponse response = mock(ServerHttpResponse.class);
        boolean ok = interceptor.beforeHandshake(
                request("ws://localhost:8080/ws/v1/candles?symbol=005930&interval=1m", "https://evil.example"),
                response,
                mock(WebSocketHandler.class),
                new HashMap<>());
        assertThat(ok).isFalse();
        verify(response).setStatusCode(HttpStatus.BAD_REQUEST);
    }

    @Test
    void acceptsAllowlistedOrigin() {
        ServerHttpResponse response = mock(ServerHttpResponse.class);
        boolean ok = interceptor.beforeHandshake(
                request("ws://localhost:8080/ws/v1/candles?symbol=005930&interval=1m", "http://localhost:3000"),
                response,
                mock(WebSocketHandler.class),
                new HashMap<>());
        assertThat(ok).isTrue();
        verify(response, never()).setStatusCode(HttpStatus.BAD_REQUEST);
    }

    private static ServerHttpRequest request(String uri, String origin) {
        ServerHttpRequest request = mock(ServerHttpRequest.class);
        when(request.getURI()).thenReturn(URI.create(uri));
        HttpHeaders headers = new HttpHeaders();
        if (origin != null) {
            headers.set(HttpHeaders.ORIGIN, origin);
        }
        when(request.getHeaders()).thenReturn(headers);
        return request;
    }
}
