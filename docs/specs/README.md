# Specs

Specification-first workspace. Code follows a spec; a spec is never reverse-engineered from code.

## Layout

| Path | Contents |
| --- | --- |
| `api/` | OpenAPI contracts between Next.js and Spring Boot — `<resource>.openapi.yaml` |
| `db/` | Schema specs: table design, indexes, partitioning, migration plans |
| `k8s/` | Deployment specs: workloads, resources, probes, scaling, rollout strategy |
| `_templates/` | Copy these to start a new spec |

Feature specs live at the top level as `NNN-<slug>.md` (e.g. `001-candle-history-api.md`). Numbers are assigned in order and never reused.

## Workflow

1. **Spec** — copy `_templates/feature-spec.md`, fill it in, get it agreed. Status starts at `Draft`.
2. **Contract** — for anything crossing the frontend/backend boundary, write `api/<resource>.openapi.yaml` from `_templates/api-contract.md` before writing code.
3. **Implement** — failing test first, on both sides. See the `fullstack-tdd-loop` skill.
4. **Verify** — run the gate in `.cursor/rules/00-global.mdc`, or delegate to the `verifier` subagent.
5. **Close** — set the spec status to `Done` and record what actually shipped if it diverged from the plan.

## Status values

`Draft` → `Agreed` → `In progress` → `Done` → `Superseded by NNN`

A spec is a record of a decision, not a wiki page. Do not silently rewrite an `Agreed` spec: amend it with a dated note, or supersede it with a new one.

## Existing specs

| Spec | Status |
| --- | --- |
| [`../spec-phase1.md`](../spec-phase1.md) — Phase 1: GBM mock ticks, RAF queue, 1m OHLC rendering | Done |
| [`001-candles-api.md`](001-candles-api.md) — GET `/api/v1/candles` vertical slice | Done |
| [`002-local-k8s.md`](002-local-k8s.md) — kind / Docker Desktop K8s + in-cluster Postgres + `candle-api` | Done |
| [`003-candle-ingest.md`](003-candle-ingest.md) — POST `/api/v1/candles` upsert | Done |
| [`004-samsung-mock-fixture.md`](004-samsung-mock-fixture.md) — mock/시드 심볼 `005930` (삼성전자), 외부 시세 없음 | Done |
| [`005-chart-hydrate-roll-persist.md`](005-chart-hydrate-roll-persist.md) — 홈 차트 GET hydrate + GBM roll POST | Done (live path superseded by 006) |
| [`006-server-gbm-websocket.md`](006-server-gbm-websocket.md) — 서버 GBM/1m 집계 + WebSocket 스트림 | Done |

Phase 1 predates this directory and stays where it is because `docs/prompts/task-template.md` references that path.
