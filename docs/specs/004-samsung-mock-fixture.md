# 004 — Samsung Electronics mock fixture (005930)

- **Status**: Done
- **Date**: 2026-08-17
- **Layers touched**: Frontend / Backend / Database
- **Related**: `api/candles.openapi.yaml`, `db/candle.md`, `001-candles-api.md`

## Problem

001–003 시드·검증 페이지 기본 심볼은 `AAPL`(USD ~190)이고, Phase 1 GBM은 이미 KRW ~₩75,000이다. 다음 슬라이스가 국내 주식 삼성전자를 쓸 때 심볼·가격대가 어긋나고, 현재 OpenAPI `symbol` 패턴 `^[A-Z.]{1,10}$`는 종목코드 `005930`을 거절한다.

## Goals

- 기본 mock/시드/조회 심볼은 `005930` (삼성전자) 하나다.
- GBM 시작가와 DB 시드 OHLC는 같은 KRW 가격대(~₩75,000)를 쓴다.
- `005930`이 GET/POST 계약의 `symbol` 패턴을 통과한다.

## Non-goals

- 거래소·벤더·웹 스크래핑 등 **실제 외부 시세 연동**
- 실시간 호가, 상장 종목 마스터, 인증
- Phase 1 차트를 API 캔들로 교체 (GBM mock 유지)
- 시세 정확성 보장 (고정 mock 값)

## Requirements

| ID | Requirement | Acceptance criteria |
| --- | --- | --- |
| R1 | 심볼 패턴이 한국 종목코드를 허용한다 | `symbol`은 `^[A-Z0-9.]{1,10}$`. `005930`은 200 경로, 하이픈/11자 이상은 400 `INVALID_QUERY` |
| R2 | Flyway 시드는 삼성전자 1m 3봉 | 빈 DB에 V1–V3 적용 후 `GET ...?symbol=005930&interval=1m`이 200과 3행. `AAPL`은 404 |
| R3 | 시드 가격은 GBM과 같은 KRW 스케일 | 시드 OHLC는 74,000–76,000 구간. 차트 `INITIAL_PRICE`는 `75000` |
| R4 | 프론트 기본 심볼 | `/candles` 기본 `symbol=005930`. ingest 폼 기본 OHLC는 KRW decimal string |
| R5 | 외부 시세 없음 | 시드·GBM 초기값은 리포지토리 상수. HTTP 시세 클라이언트 없음 |

## Design

### API surface

`docs/specs/api/candles.openapi.yaml`: `symbol` pattern `^[A-Z0-9.]{1,10}$` (GET query + POST body). Path/status는 변경 없음.

### Data

V2는 이미 적용된 환경이 있으므로 수정하지 않는다. `V3__seed_005930_1m_candles.sql`:

1. `DELETE FROM candle WHERE symbol = 'AAPL';`
2. `005930` / `1m` 3행 insert (KRX 장중 UTC `2026-08-14T00:30Z`–`00:32Z`, OHLC ~₩75,000)

스키마(컬럼/체크/유니크) 변경 없음.

### Frontend

- `/candles` 기본 심볼 `005930`.
- ingest 폼 기본가를 시드와 같은 KRW decimal로.
- `CandleChart` GBM `INITIAL_PRICE = 75000` (삼성전자 mock). 네트워크 호출 없음.

### Backend

`CandleQueryRequest` / `CandleIngestRequest` `@Pattern`을 계약과 동일하게 맞춘다. 조회·upsert 로직 변경 없음.

### Infrastructure

매니페스트 변경 없음. 이미 뜬 볼륨은 API 재기동 시 Flyway V3가 시드를 교체한다.

## Edge cases

- 기존 볼륨의 AAPL ingest 행도 V3 `DELETE`로 제거된다.
- `MSFT` 등 다른 심볼 ingest 테스트는 그대로 두어 “미등록 심볼 upsert”를 검증한다.
- `AAPL` GET은 시드 삭제 후 `UNKNOWN_SYMBOL`.

## Test plan

| Level | What it covers |
| --- | --- |
| Backend web | `005930` 200 JSON; invalid symbol 400 |
| Backend integration | Testcontainers V3 시드 3행, `AAPL` 404 |
| Frontend unit | OpenAPI fixture `005930` + KRW decimal; 차트 baseline 75000 |
| E2E | `/candles` 기본 심볼 표시 (백엔드 있을 때) |

## Rollout

V3 after V2. Rollback: `DELETE FROM candle WHERE symbol = '005930';` (AAPL 시드는 복구하지 않음).

## Open questions

None.

## Amendment (2026-08-17)

Chart hydrate (GET) and persisting GBM rolls (POST) are specified in `005-chart-hydrate-roll-persist.md`. This spec only unified the mock fixture to `005930`.

## Amendment (2026-08-17) — seed removed

V2/V3 files stay as history. `V4__delete_005930_1m_seed.sql` deletes the three V3 fixture bars. R2 (GET 005930 returns 3 seed rows) no longer holds on a fresh DB.
