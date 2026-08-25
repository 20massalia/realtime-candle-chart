# 007 — GitHub Actions CI gate

- **Status**: Done
- **Date**: 2026-08-25
- **Layers touched**: Infra
- **Related**: `002-local-k8s.md`, `.github/workflows/ci.yml`

로컬 검증 게이트(`typecheck` / `lint` / Vitest / Gradle Testcontainers / `kubeconform`)가 GitHub에 없어, PR 머지 전에 같은 명령을 강제하거나 캐시 전후 시간을 측정할 수 없다.

## Goals

- `pull_request`와 `main` push에서 frontend / backend / k8s / e2e job이 병렬로 돈다.
- `workflow_dispatch`로 pnpm·Gradle 캐시를 끄고 같은 커밋을 반복 실행할 수 있다.
- 런 Summary에 job별 conclusion과 duration_s가 남는다.

## Non-goals

- Vercel / Render CD, 원격 클러스터 apply, 운영 시크릿
- CI에서 Spring Boot + Postgres를 띄워 `@needs-api` ingest E2E를 돌리는 것
- 프로덕션 Render에 E2E ingest를 보내는 것

## Policies (this slice)

| ID | Decision |
| --- | --- |
| P1 | Job 이름 `frontend`, `backend`, `k8s`, `e2e`, `metrics`는 Required checks용으로 고정한다. |
| P2 | k8s job은 `kubectl kustomize infra/k8s/overlays/dev \| kubeconform -strict -summary -`만 수행한다. 클러스터 없음. |
| P3 | e2e는 `PLAYWRIGHT_WEBSERVER_MODE=start`로 Next를 빌드해 띄운다. `@needs-api` ingest는 grep-invert로 제외한다. |
| P4 | PR concurrency는 같은 PR의 이전 런만 cancel한다. `workflow_dispatch`는 측정용으로 cancel하지 않는다. |
| P5 | `workflow_dispatch.use_cache=false`이면 Node/Java setup에서 `cache`를 넣지 않는다. |

## Requirements

| ID | Requirement | Acceptance criteria |
| --- | --- | --- |
| R1 | 프론트 게이트 | `pnpm typecheck`, `pnpm lint`, `pnpm test`가 이 job에서 실패하면 job이 red |
| R2 | 백엔드 게이트 | `backend/gradlew test --no-daemon` (Testcontainers PostgreSQL) |
| R3 | 매니페스트 게이트 | overlay 렌더가 kubeconform `-strict`를 통과 |
| R4 | 차트 E2E | 백엔드 없이 통과하는 Playwright 스펙이 CI에서 돈다. ingest upsert는 이 job에 없다 |
| R5 | 수동 측정 | Actions UI 또는 `gh workflow run ci.yml -f use_cache=false`로 캐시 없는 런이 가능하다 |

## Design

### Infrastructure

`.github/workflows/ci.yml`. 이미지 빌드·배포 job 없음.

### Frontend / Backend

코드 변경 없음. e2e ingest 테스트에만 `@needs-api` 태그를 붙인다.

## Test plan

| Level | What it covers |
| --- | --- |
| CI | `main`/PR에서 네 게이트 job이 그린 |
| Manual | dispatch `use_cache=false` 런의 Setup step에 `cache: pnpm` / `cache: gradle`이 없음 |

## Rollout

워크플로 파일이 `main`에 올라가면 동작한다. 저장소 Settings → Branches → Required checks에 `frontend`, `backend`, `k8s`를 켠다. `e2e`는 첫 그린 확인 후 추가.

## Close-out — 2026-08-25

Shipped as specified. First green run is on GitHub after push.
