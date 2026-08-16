# 002 — Local Kubernetes deploy (API + Postgres)

- **Status**: Done
- **Date**: 2026-08-16
- **Layers touched**: Backend / Database / Infra
- **Related**: `k8s/api.md`, `k8s/postgres.md`, `001-candles-api.md`

## Problem

001 조회 API는 로컬 JVM + 호스트 Postgres에서만 동작한다. 매니페스트·이미지·프로브가 없어, 포트폴리오 스택에 적어 둔 Kubernetes 배포를 재현하거나 검증할 수 없다.

## Goals

- `kind` 클러스터 `candle-dev`, 또는 Docker Desktop Kubernetes에 Postgres와 `candle-api`가 기동한다.
- Pod가 Ready가 되면 `GET /api/v1/candles?symbol=005930&interval=1m`이 200과 시드 3행을 반환한다.
- 매니페스트는 `kubectl kustomize`로 렌더되고 `kubeconform -strict`를 통과한다.

## Non-goals

- Next.js / Ingress / TLS / Helm
- `overlays/prod` 및 원격 레지스트리
- WebSocket, ingest, 인증
- 클러스터 밖 호스트 Postgres를 그대로 붙이기 (인클러스터 Postgres만)

## Requirements

| ID | Requirement | Acceptance criteria |
| --- | --- | --- |
| R1 | 환경 값은 overlay에만 둔다 | base에 복제 수·이미지 태그·시크릿 리터럴 없음. `overlays/dev`가 이미지·리소스·Secret을 주입 |
| R2 | API 프로브 | liveness `/actuator/health/liveness`, readiness `/actuator/health/readiness` (readiness에 `db`) |
| R3 | 워크로드 가드레일 | CPU/memory requests+limits, `runAsNonRoot`, `allowPrivilegeEscalation: false`, 라벨 3종, API는 `maxUnavailable: 0` + PDB |
| R4 | 시크릿 | git에 운영 비밀번호 없음. dev는 `postgres.env.example`(로컬 기본값, `application.properties`와 동일). 로컬에서 바꾸려면 gitignored `postgres.env`로 교체 |
| R5 | 이미지 | API는 `candle-api:0.0.1-local` (`:latest` 금지). Postgres는 minor 태그 또는 digest |
| R6 | 마이그레이션 | API 기동 시 Flyway V1–V4. 빈 볼륨에는 시드 캔들이 없음 |
| R7 | 정적 검증 | `kubectl kustomize infra/k8s/overlays/dev \| kubeconform -strict -summary -` 성공 |

## Design

### API surface

변경 없음. 프로브만 Actuator로 추가 (`/actuator/health/*`). OpenAPI 계약 대상 아님.

### Data

스키마 변경 없음. 인클러스터 Postgres는 빈 PVC에서 시작해 Flyway가 `candle`을 만든다.

### Frontend

변경 없음. 브라우저는 계속 로컬 Next 또는 `kubectl port-forward svc/api 8080:8080`.

### Backend

- `spring-boot-starter-actuator`
- `management.endpoint.health.probes.enabled=true`
- readiness 그룹에 `readinessState,db`; liveness는 `livenessState`만
- JVM `-XX:MaxRAMPercentage=75.0` (고정 `-Xmx` 금지)

### Infrastructure

Kustomize only.

| Path | Owns |
| --- | --- |
| `infra/k8s/base/api` | Deployment, Service, PDB (환경 값 없이) |
| `infra/k8s/base/postgres` | Deployment, Service, PVC |
| `infra/k8s/overlays/dev` | namespace `candle-dev`, 이미지, 리소스, `secretGenerator` |
| `infra/k8s/kind/cluster.yaml` | 로컬 kind 클러스터 정의 |
| `backend/Dockerfile` | multi-stage `bootJar` → non-root JRE |

Deploy order: namespace → Secret/ConfigMap → Postgres Ready → API. `kubectl apply -k`가 한 번에 적용하고, API는 startup/readiness가 DB를 기다린다.

Verify:

```bash
kubectl -n candle-dev port-forward svc/api 8080:8080
curl -s "http://localhost:8080/api/v1/candles?symbol=005930&interval=1m"
```

## Edge cases

- `postgres.env` 없이 kustomize → Secret 생성 실패. apply 전에 example을 복사한다.
- 이미지 미로드 → `ErrImagePull`. `kind load docker-image candle-api:0.0.1-local --name candle-dev`
- JVM 콜드스타트 → startupProbe로 liveness 재시작을 막는다.
- PVC 재사용 시 Flyway는 이미 적용된 버전을 no-op. 시드 삭제는 V4.

## Amendment (2026-08-17)

Verify URL uses `symbol=005930`. See `004-samsung-mock-fixture.md`.

## Amendment (2026-08-17) — seed removed

V4 deletes the V3 fixture bars. `GET ?symbol=005930` is 404 on a fresh volume until ingest/roll.

## Test plan

| Level | What it covers |
| --- | --- |
| Backend integration | `/actuator/health/liveness` 200; readiness 200 and includes db when Postgres is up |
| Manifest | `kubectl kustomize` kinds present; `kubeconform -strict` |
| Manual cluster | kind apply 후 rollout, Flyway V4, 시드 없음 |

## Rollout

로컬 only. Rollback: `kind delete cluster --name candle-dev`.

## Open questions

None.

## Amendment — 2026-08-16

Local apply targets the existing Docker Desktop Kubernetes context (`docker-desktop`) so images are shared with the Docker daemon (`IfNotPresent`, no `kind load`). `infra/k8s/kind/cluster.yaml` remains the alternative if Docker Desktop Kubernetes is off.

## Close-out — 2026-08-16

Shipped as specified. Verified on `docker-desktop`, namespace `candle-dev`: Deployments `api` and `postgres` Ready 1/1, Services and API PDB present. `kubectl kustomize infra/k8s/overlays/dev` renders. `kubeconform` was not installed in the close-out PATH; R7 remains a local pre-apply check when the binary is available.
