# 005 — Chart hydrate from GET + persist completed GBM rolls

- **Status**: Done
- **Date**: 2026-08-17
- **Layers touched**: Frontend
- **Related**: `api/candles.openapi.yaml`, `001-candles-api.md`, `003-candle-ingest.md`, `004-samsung-mock-fixture.md`

004는 삼성전자 mock 시드·심볼만 닫았다. 이 슬라이스가 홈 차트와 DB를 처음으로 연결한다.

## Problem

홈(`/`) 실시간 차트는 GBM → 큐 → RAF → Lightweight Charts만 쓰고, PostgreSQL 시드를 그리지 않는다. `/candles` 검증 페이지만 GET/POST로 DB에 붙는다. 새로고침하면 방금 완성한 봉이 사라지고, 시드 3봉과 라이브 봉이 한 화면에 없다.

## Goals

- 차트 최초 로딩은 `GET /api/v1/candles`로 완료 봉만 채운다.
- 실시간 틱은 기존 GBM + RAF 파이프라인을 유지한다.
- 분 경계 `roll`에서 **완성된 봉만** `POST /api/v1/candles`로 upsert한다 (형성 중인 봉은 저장하지 않는다).

## Non-goals

- 새 REST 경로, 스키마, Flyway, WebSocket, 틱 ingest
- 서버 측 tick→OHLC 집계, 호가, 외부 시세
- 심볼/인터벌 전환 UI, 5m/1h/1d 차트
- ingest 실패 재시도·큐잉, 인증
- `/candles` 검증 페이지를 차트로 교체

## Policies (this slice)

| ID | Decision |
| --- | --- |
| P1 | 차트 심볼 `005930`, 인터벌 `1m` 고정 (004 fixture). |
| P2 | 히스토리 로드는 **홈 Server Component**가 `BACKEND_URL`로 `GET` (기존 `fetchCandles`). 브라우저는 Spring URL을 모른다. |
| P3 | `limit`는 계약 기본값(200). 시드가 없으면 히스토리는 비거나, 이미 persist된 roll만 온다. |
| P4 | GET 실패·`BACKEND_URL` 없음·404 → 빈 히스토리. 차트와 GBM은 계속 동작. 페이지를 에러로 죽이지 않는다. |
| P5 | API 가격은 decimal string으로 유지. LWC/GBM만 `number`로 변환한다 (표시·시뮬레이션 정밀도). |
| P6 | GBM 시작가 = 히스토리 **마지막 close**, 없으면 `75000`. |
| P7 | 집계 상태는 빈 값으로 시작한다. 마지막 DB 봉의 OHLC를 “현재 분”으로 이어 쓰지 않는다. 라이브 봉의 `time`은 wall-clock 분 시작. |
| P8 | 시드 `bucketStart`(예: 2026-08-14T00:30Z)와 라이브 `Date.now()` 사이 공백은 허용한다. |
| P9 | `AggregateEffect.type === "roll"`의 `completed`만 persist. `update`(형성 중)는 차트만 갱신. |
| P10 | persist는 same-origin `POST /api/candles` (기존 BFF). 배치 크기 1, `volume`은 `null` (GBM에 거래량 없음). |
| P11 | consumer/`onEffect`에서 POST를 **await하지 않는다**. 실패해도 차트는 계속. 재시도 없음. |
| P12 | 라이브 봉 `time` ≤ 마지막 히스토리 `time`이면 `series.update`와 POST를 모두 건너뛴다 (LWC 단조 증가 + 시드 덮어쓰기 방지). |
| P13 | 같은 분의 재roll은 기존 upsert(replace)로 처리한다. 이 슬라이스에서 클라이언트 디듀프를 넣지 않는다. |

## Requirements

| ID | Requirement | Acceptance criteria |
| --- | --- | --- |
| R1 | 초기 차트는 DB 완료 봉을 그린다 | `BACKEND_URL`과 시드가 있으면 홈 차트가 GET 결과 N봉을 `setData`한다. 상태 텍스트에 hydrated count. |
| R2 | GET 실패해도 mock은 산다 | 업스트림 오류 시 빈 `setData`, GBM은 `75000`부터, 캔버스가 마운트된다. |
| R3 | 실시간은 GBM | producer/consumer/aggregate 경로 유지. 틱 HTTP 없음. |
| R4 | roll만 저장 | `update` 이펙트는 POST를 만들지 않는다. `roll.completed`는 1-bar ingest body가 된다. |
| R5 | BFF만 사용 | 클라이언트 persist URL은 `/api/candles`. `BACKEND_URL`이 클라이언트 번들에 없다. |
| R6 | 가격 와이어 포맷 | POST `open/high/low/close`는 decimal string (`toFixed(8)`). `bucketStart`는 UTC ISO-8601 `Z`. |

## Design

### API surface

경로·스키마 변경 없음. `docs/specs/api/candles.openapi.yaml`에 차트 hydrate / roll persist 용도를 서술만 추가한다.

### Data

마이그레이션 없음(당시). V4 이후 Flyway 시드는 없다. 첫 hydrate는 빈 목록이거나 이미 POST된 roll이다.

## Amendment (2026-08-17) — seed removed

`V4__delete_005930_1m_seed.sql` removes the V3 fixture bars. GBM start price falls back to `75000` when history is empty.

### Frontend

- `app/page.tsx` (Server Component): `fetchCandles({ symbol: 005930, interval: 1m })`. 실패를 catch해 props로 넘긴다.
- `CandleChart` (client): `setData(history)` → GBM start from last close → 기존 producer/consumer. `onEffect`에서 roll이면 `void postCompletedBar(...)`.
- 매핑·정책 함수는 `lib/chart/db-sync.ts` (순수 + fetch 헬퍼). React/LWC 의존 없음.
- `/candles` 페이지는 그대로 둔다.

### Backend

변경 없음. GET 200/400/404/500, POST 200/400/500은 001·003 계약.

### Infrastructure

매니페스트·env 키 추가 없음. 로컬은 기존 `BACKEND_URL`.

## Edge cases

- 히스토리 0건(알려진 심볼 + 다른 인터벌은 이 슬라이스에서 호출하지 않음): 빈 차트 + GBM `75000`.
- 백엔드 다운: R2.
- 탭 hidden: 기존대로 producer/consumer pause. 숨은 동안 roll/POST 없음.
- POST 4xx/5xx: 차트 유지, 상태 문구는 이번 슬라이스에서 필수 아님.
- 시드 마지막 분과 라이브 분이 같으면 P12로 드롭 (정상 경로에서는 날짜가 다름).

## Test plan

| Level | What it covers |
| --- | --- |
| Frontend unit | API fixture → chart bars; GBM start price; roll → ingest body; update → no persist; time ≤ last history → drop |
| Frontend unit | `postCompletedBar`가 `POST /api/candles`를 1-bar decimal body로 호출 |
| E2E | `/` 차트 마운트 + hydrate status. 백엔드 없어도 차트는 보임 |
| Backend | 회귀만 (`./gradlew test`). 새 엔드포인트 없음 |

## Rollout

프론트만. 롤백: 홈에서 GET/POST 제거, GBM-only 차트로 복귀. 이미 upsert된 라이브 봉은 DB에 남는다.

## Open questions

None — P1–P13이 이 슬라이스의 결정이다.
