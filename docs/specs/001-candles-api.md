# 001 — Candles history API (vertical slice)

- **Status**: Done
- **Date**: 2026-08-15
- **Layers touched**: Frontend / Backend / Database
- **Related**: `api/candles.openapi.yaml`, `db/candle.md`

## Problem

Phase 1 차트는 브라우저에서 GBM mock 틱만 그린다. 프론트와 백엔드가 합의할 수 있는 캔들 조회 API가 없어, PostgreSQL에 저장한 OHLC를 Next.js에서 검증할 수 없다.

## Goals

- `GET /api/v1/candles`가 OpenAPI 계약대로 캔들 목록을 반환한다.
- 잘못된 쿼리는 400, 미등록 심볼은 404를 공통 에러 스키마로 반환한다.
- Next.js `/candles` 페이지가 BFF Route Handler를 통해 실제 응답을 표시한다.

## Non-goals

- Kubernetes / Docker 이미지 / Helm
- WebSocket 실시간 수집, 틱 ingest, upsert
- 차트 렌더링을 API 데이터로 교체 (Phase 1 mock 차트 유지)
- 인증

## Requirements

| ID | Requirement | Acceptance criteria |
| --- | --- | --- |
| R1 | 심볼·인터벌로 캔들을 조회한다 | `symbol`+`interval` 필수, `limit` 기본 200·최대 1000. 200과 `CandleListResponse` |
| R2 | 최신 N개를 시간 오름차순으로 돌려준다 | `candles`는 `bucketStart` ascending |
| R3 | 가격은 정밀도 손실 없이 직렬화한다 | `open`/`high`/`low`/`close`는 JSON string (`format: decimal`) |
| R4 | 유효하지 않은 쿼리는 400 | `INVALID_QUERY` + `ErrorResponse` |
| R5 | DB에 한 번도 없는 심볼은 404 | `UNKNOWN_SYMBOL` + `ErrorResponse` |
| R6 | 프론트는 내부 URL을 브라우저에 노출하지 않는다 | Client는 `/api/candles`만 호출, Spring은 `BACKEND_URL`로만 |

## Design

### API surface

See `docs/specs/api/candles.openapi.yaml`. Path is versioned `/api/v1/candles` (not unversioned `/candles`).

### Data

Table `candle`, natural key `(symbol, interval, bucket_start)`. See `docs/specs/db/candle.md`. First migration creates the table; second seeds AAPL 1m rows for the slice.

### Frontend

- Types and fetch in `lib/api/candles.ts` (derived from the contract).
- Route Handler `app/api/candles/route.ts` proxies to Spring.
- Server page `app/candles/page.tsx` loads default `AAPL`/`1m` and renders a table plus error state.

### Backend

`CandleController` → `CandleService` (`@Transactional(readOnly = true)`) → `CandleRepository`. Web layer uses record DTOs only. `ApiExceptionHandler` maps domain errors to `ErrorResponse`.

### Infrastructure

Local JDBC via `POSTGRES_*` env vars. No container manifests in this slice.

## Edge cases

- Known symbol with no rows for that interval → 200 and `candles: []`
- Unknown symbol → 404 even if the pattern is valid
- Backend down → page shows the error; Route Handler returns 502/503
- Timestamps are UTC ISO-8601 (`...Z`)

## Test plan

| Level | What it covers |
| --- | --- |
| Backend unit | Service 404 vs empty-interval; newest-N then ascending |
| Backend web | `@WebMvcTest` status/JSON field names vs contract |
| Backend integration | Testcontainers PostgreSQL + Flyway seed |
| Frontend unit | Response parser against an OpenAPI fixture |
| E2E | `/candles` heading and table or explicit error |

## Rollout

Apply Flyway before serving traffic. Rollback: drop `candle` (empty/dev table).

## Open questions

None for this slice.

## Amendment (2026-08-17)

Default fixture symbol is `005930` (see `004-samsung-mock-fixture.md`). V4 removes the V3 seed rows.
