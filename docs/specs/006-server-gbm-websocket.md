# 006 — Server GBM aggregation + WebSocket candle stream

- **Status**: Done
- **Date**: 2026-08-17
- **Layers touched**: Frontend / Backend
- **Related**: `api/candles.openapi.yaml`, `005-chart-hydrate-roll-persist.md`, `001-candles-api.md`, `003-candle-ingest.md`, `004-samsung-mock-fixture.md`

005는 브라우저에서 GBM·1m 집계를 돌리고 roll만 POST했다. 탭마다 다른 경로가 같은 `005930` 키를 덮어쓴다. 이 슬라이스는 시뮬레이션과 집계를 서버 단일 엔진으로 옮기고, 형성 중/완료 봉을 WebSocket으로 차트에 보낸다.

## Problem

홈 차트는 클라이언트 GBM이 소스다. 새로고침마다 다른 시계열이고, 여러 탭이 서로 다른 완료 봉을 `POST /api/v1/candles`로 싸운다. 서버는 저장소일 뿐이라 실시간 시세를 소유하지 않는다.

## Goals

- Spring Boot가 `005930` `1m`에 대해 GBM 틱을 만들고 1m OHLC로 집계한다.
- 분 경계에서 **완료 봉만** 기존 ingest 경로로 upsert한다. 클라이언트는 roll POST를 하지 않는다.
- 구독 중인 차트는 WebSocket으로 `update`/`roll` 이벤트를 받는다.
- 홈 차트는 GET hydrate 후 소켓 메시지를 RAF 큐로만 그린다 (틱 생성·집계 없음).

## Non-goals

- 외부 시세, 호가, 틱 REST ingest, STOMP/SockJS
- 5m/1h/1d 라이브 엔진, 심볼 전환 UI
- 서버 측 속도 배율(공유 엔진을 클라이언트가 가속하지 않음)
- Kubernetes Ingress/Service 변경, 인증, 재시도 큐
- Next.js가 WebSocket을 업그레이드 프록시하는 것 (브라우저는 Spring `ws` URL로 직접 연결; 시크릿 없음)
- 클라이언트 GBM fallback

## Policies (this slice)

| ID | Decision |
| --- | --- |
| P1 | 엔진 심볼 `005930`, 인터벌 `1m` 고정. 프로세스당 엔진 1개. |
| P2 | 틱 주기 300ms, `mu=0`, `sigma=0.03`, 시작가 = DB 마지막 close 없으면 `75000`. GBM은 `double` (기존 클라이언트와 동일). 저장·와이어 가격은 decimal string (`numeric` 8dp). |
| P3 | 형성 중 봉은 DB에 쓰지 않는다. `roll.completed`만 `CandleService.ingest` (volume `null`). |
| P4 | 집계는 wall-clock 분 시작. 히스토리 마지막 봉을 “현재 분”으로 이어 쓰지 않는다 (005 P7과 동일). |
| P5 | `005930`은 reserved mock 심볼. 행이 없어도 GET은 200 + `candles: []` (404 아님). 그 외 미존재 심볼은 기존 `UNKNOWN_SYMBOL`. |
| P6 | WebSocket 경로 `GET /ws/v1/candles?symbol&interval` (HTTP upgrade). 이 슬라이스는 `symbol=005930&interval=1m`만 수락. 그 외는 핸드셰이크 거부. |
| P7 | 프레임은 JSON text. 스키마는 OpenAPI `CandleStreamEvent`. 가격은 decimal string, `bucketStart`는 UTC ISO-8601. |
| P8 | 브라우저는 `NEXT_PUBLIC_CANDLE_WS_URL`(기본 `ws://localhost:8080/ws/v1/candles`)로 연결한다. `BACKEND_URL`은 서버 전용. |
| P9 | Origin allowlist (`http://localhost:3000`, `http://127.0.0.1:3000`). Origin 없는 핸드셰이크(테스트 클라이언트)는 허용. |
| P10 | 홈 차트는 `createProducer`/`applyTick`을 호출하지 않고 roll을 POST하지 않는다. |
| P11 | 소켓 메시지는 `useRef` 큐 + RAF drain. React state에 스트림을 넣지 않는다. |
| P12 | 일시정지는 **로컬**: drain이 `series.update`를 건너뛴다. 소켓은 유지. **큐는 hidden과 같이 `roll`(완료 봉)은 모두 남기고, 형성 중 `update`는 마지막 roll 이후 최신 1개만 남긴다.** 속도 프리셋은 UI만 (서버 틱 주기 불변). |
| P13 | 탭 hidden: 소켓 유지, drain 중지. 큐는 완료 봉(`roll`)을 유지하고 같은 분의 `update`만 최신 1개로 압축한다 (메모리). |
| P14 | 소켓 close/error → 짧은 backoff 재연결. 실패해도 차트·히스토리는 유지. |
| P15 | `time` ≤ 마지막 hydrate `time`인 라이브 봉은 `series.update` 생략 (LWC 단조 + 히스토리 덮어쓰기 방지). |
| P16 | 통합 테스트에서 엔진이 시드를 오염시키지 않도록 `candle.mock-market.enabled=false`를 IT 기본으로 둔다. 로컬 `bootRun`은 enabled. |

## Requirements

| ID | Requirement | Acceptance criteria |
| --- | --- | --- |
| R1 | 서버 집계 | 같은 분 틱은 `update`, 분 경계는 `roll` (완료 OHLC + 새 봉). 순수 로직 단위 테스트. |
| R2 | roll만 저장 | `update`는 ingest 호출 없음. `roll`은 completed 1봉 upsert. |
| R3 | 브로드캐스트 | 구독 세션에 `CandleStreamEvent` JSON. `roll`만 `completed` 필드. |
| R4 | 구독 쿼리 | `005930`+`1m`만 upgrade. 잘못된 symbol/interval은 핸드셰이크 실패. |
| R5 | GET reserved | 빈 DB에서 `GET ...?symbol=005930&interval=1m` → 200, `candles: []`. |
| R6 | 차트 소비 | hydrate `setData` 후 WS 이벤트를 RAF로 `series.update`. 클라이언트 POST 없음. |
| R7 | 장애 | WS 실패 시 캔버스는 마운트되고 상태 문구가 stream 실패를 나타낸다. |
| R8 | 가격 포맷 | 이벤트 `open/high/low/close`는 decimal string. |

## Design

### API surface

See `docs/specs/api/candles.openapi.yaml`:

- REST GET/POST 유지. GET 설명만 P5를 반영.
- `GET /ws/v1/candles` WebSocket upgrade + `CandleStreamEvent`.

### Data

마이그레이션 없음. 완료 봉은 기존 `candle` unique key.

### Frontend

- `app/page.tsx`: 기존 GET hydrate.
- `lib/api/candles-stream.ts`: URL + `CandleStreamEvent` 파서 (계약 fixture).
- `lib/chart/stream-consumer.ts`: RAF drain.
- `CandleChart`: WebSocket → 큐 → RAF. producer/aggregate/POST 제거.
- `/candles` 검증 페이지·수동 ingest는 유지.

### Backend

- `market`: GBM + 1m aggregator (순수).
- `stream`: `MockMarketEngine` (스케줄) → ingest + hub broadcast.
- `CandleWebSocketHandler` + handshake interceptor.
- `CandleService.list`: reserved 심볼은 exists 검사 생략.

### Infrastructure

매니페스트 변경 없음. 로컬: `BACKEND_URL`, `NEXT_PUBLIC_CANDLE_WS_URL`.

## Edge cases

- 구독자 0명: 엔진은 계속 틱·roll persist.
- 엔진 비활성: WS upgrade는 되나 프레임이 없음 (IT). 차트는 hydrate만.
- 재연결: 형성 중 봉을 스냅샷으로 보내지 않음. 다음 `update`/`roll`부터 그림.
- BigDecimal 8dp 반올림: `Half up` from `Double.toString`.

## Test plan

| Level | What it covers |
| --- | --- |
| Backend unit | GBM dt/sigma=0; aggregator update/roll; engine update≠persist, roll=ingest+broadcast; reserved GET |
| Backend web | GET `005930` empty → 200 (service mock) |
| Backend IT | `mock-market.enabled=false`; GET `005930` 200 empty; 기존 ingest/MSFT |
| Frontend unit | stream fixture parse; WS URL; RAF consumer; `canAppendAfterHistory` |
| E2E | `/` 마운트 + hydrate/stream status. 백엔드 없어도 차트 보임 |

## Rollout

백엔드 먼저(엔진+WS), 프론트는 소켓 URL이 있어야 라이브. 롤백: 엔진 `enabled=false`, 차트는 히스토리만.

## Open questions

None — P1–P16.

## Close-out — 2026-08-17

Shipped as specified. Backend `./gradlew test` 36 passed. Frontend Vitest 67 passed. Playwright 18 passed after tightening `/candles` locator. Live `bootRun` on :8080 was still the pre-006 JVM at verification time (`GET /ws/v1/candles` → 500); restart the API process to enable the mock engine and WebSocket.

## Amendment (2026-08-17) — review defects

- Scheduler tick failures are logged and the next tick still runs (`ScheduledExecutorService` otherwise stops forever).
- Rejected WS handshakes set HTTP 400 (not a bare `false` that became 200).
- Paused charts bound the stream queue to the latest event, same as hidden tabs.

## Amendment (2026-08-21) — idle queue keeps completed bars

Hidden/paused charts still skip RAF drain, but `boundStreamQueue` no longer drops `roll` events. Idle coalescing keeps every completed bar in order and only the latest forming `update` after the last roll, so returning to the tab does not skip minutes.

