# 003 — Candle ingest (OHLC upsert)

- **Status**: Done
- **Date**: 2026-08-16
- **Layers touched**: Frontend / Backend / Database
- **Related**: `api/candles.openapi.yaml`, `db/candle.md`, `001-candles-api.md`

## Problem

001 조회 API는 Flyway 시드 3행만 반환한다. 완료된 OHLC를 저장하는 쓰기 경로가 없어, 새 심볼·새 봉을 `GET /api/v1/candles`로 검증하거나 시드를 갱신할 수 없다.

## Goals

- `POST /api/v1/candles`가 OpenAPI 계약대로 배치 OHLC를 `(symbol, interval, bucketStart)`에 upsert한다.
- 같은 키를 다시 보내면 행을 교체하고 200을 반환한다 (멱등).
- 새 심볼을 ingest하면 이후 GET이 200과 해당 봉을 반환한다.
- Next.js `/candles` 페이지에서 BFF `POST /api/candles`로 한 봉을 넣고 테이블이 갱신된다.

## Non-goals

- WebSocket, 틱 스트림, 서버 측 tick→OHLC 집계
- 인증, rate limit, 부분 성공(207)
- 스키마 변경 / 새 Flyway 버전 (`candle` unique key 재사용)
- Kubernetes 매니페스트 변경
- Phase 1 차트 mock을 API 데이터로 교체

## Requirements

| ID | Requirement | Acceptance criteria |
| --- | --- | --- |
| R1 | 배치 upsert | `symbol`+`interval`+`candles`(1–500). 200과 `CandleIngestResponse.upserted == candles.length` |
| R2 | 자연키 충돌 시 교체 | 동일 `(symbol, interval, bucketStart)`는 `open/high/low/close/volume`을 EXCLUDED 값으로 덮어쓴다 |
| R3 | 가격은 decimal string | 요청·응답 모두 `open/high/low/close`는 JSON string (`format: decimal`) |
| R4 | 잘못된 본문은 400 | `INVALID_QUERY` + `ErrorResponse` (심볼/인터벌, 빈·초과 배치, 중복 bucketStart, OHLC 제약, 파싱 실패) |
| R5 | ingest는 404를 쓰지 않는다 | 미등록 심볼도 insert 후 조회 가능. GET의 `UNKNOWN_SYMBOL`은 유지 |
| R6 | 브라우저는 Spring URL을 모른다 | Client는 `POST /api/candles`만 호출 |

## Design

### API surface

See `docs/specs/api/candles.openapi.yaml` (`POST /api/v1/candles`). GET은 변경 없음.

### Data

No new migration. Upsert:

```sql
INSERT INTO candle (...) VALUES (...)
ON CONFLICT (symbol, interval, bucket_start) DO UPDATE SET
  open = EXCLUDED.open, high = EXCLUDED.high, low = EXCLUDED.low,
  close = EXCLUDED.close, volume = EXCLUDED.volume;
```

OHLC CHECK는 DB에 이미 있다. 서비스가 같은 규칙을 먼저 검사해 500 대신 400을 낸다. 대량 쓰기는 JDBC batch이며 행마다 `save()` 하지 않는다.

### Frontend

- `ingestCandles` in `lib/api/candles.ts` (contract-derived).
- Route Handler `POST` on `app/api/candles/route.ts` proxies to Spring.
- Client leaf form on `/candles` posts one bar, then `router.refresh()`.

### Backend

`CandleController` → `CandleService.ingest` (`@Transactional`) → `CandleWriter` (JdbcTemplate batch). Web layer uses record DTOs only. `HttpMessageNotReadableException` maps to `INVALID_QUERY`.

### Infrastructure

No new env vars. Local JVM or in-cluster API both accept POST.

## Edge cases

- Request 안 중복 `bucketStart` → 400 (last-write-wins를 숨기지 않음)
- OHLC 위반 (`high < low` 등) → 400
- volume `null` 허용, 음수 volume → 400
- 가격 ≤ 0 → 400
- 동일 페이로드 재전송 → 200, 행 내용 동일
- 배치 501개 → 400
- 본문 JSON 파싱 실패 → 400 (`INVALID_QUERY`)

## Test plan

| Level | What it covers |
| --- | --- |
| Backend unit | OHLC/duplicate 거부; writer가 한 번 batch 호출 |
| Backend web | POST 200 field names; 400 `INVALID_QUERY` |
| Backend integration | upsert 후 GET; 같은 키 close 갱신; 새 심볼 GET 200 |
| Frontend unit | ingest 응답 파서 vs OpenAPI fixture |
| E2E | `/candles` ingest form 제출 후 테이블 또는 명시적 에러 |

## Rollout

코드만. 롤백: POST 매핑 제거. 이미 upsert된 행은 남는다 (dev 데이터).

## Open questions

None.

## Close-out — 2026-08-16

Shipped as specified. Local `bootRun` on `:8080` (host Postgres) verified: POST 200 + upsert, GET reflects replace, invalid interval 400 `INVALID_QUERY`. Playwright 16/16 passed against `http://localhost:3000` (Next 16 blocks `127.0.0.1` as a cross-origin dev host unless listed in `allowedDevOrigins`). In-cluster `candle-api:0.0.1-local` was not rebuilt; port-forward to that image was stopped so the new JVM could bind 8080.
