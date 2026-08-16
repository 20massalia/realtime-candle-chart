# Workload: api (candle-api)

- **Status**: Agreed
- **Date**: 2026-08-17
- **Overlay**: `infra/k8s/overlays/dev`
- **Related**: `002-local-k8s.md`

## Role

Spring Boot `GET /api/v1/candles`. Browser does not call this Service; port-forward or a future Next.js Route Handler uses in-cluster DNS `http://api.candle-dev.svc.cluster.local:8080`.

## Image

| Env | Reference |
| --- | --- |
| dev | `candle-api:0.0.1-006` (never `:latest`). Same-tag `IfNotPresent` can keep a stale node cache; bump the overlay tag when the JAR changes. Docker Desktop Kubernetes uses `IfNotPresent`; kind still needs `kind load`. |

## Probes (HTTP, port `http` / 8080)

| Probe | Path | Notes |
| --- | --- | --- |
| startup | `/actuator/health/liveness` | period 5s, failureThreshold 30 |
| liveness | `/actuator/health/liveness` | after startup succeeds |
| readiness | `/actuator/health/readiness` | includes `db` |

## Resources (dev)

| | CPU | Memory |
| --- | --- | --- |
| requests | 100m | 512Mi |
| limits | 500m | 768Mi |

Heap via `-XX:MaxRAMPercentage=75.0`. Limit must stay above heap + metaspace.

## Security

Pod and container: `runAsNonRoot: true`, `runAsUser: 65532`, `allowPrivilegeEscalation: false`, `readOnlyRootFilesystem: true`, `capabilities.drop: [ALL]`. `emptyDir` on `/tmp`.

## Rollout

`RollingUpdate`, `maxUnavailable: 0`, `maxSurge: 1`. PDB `minAvailable: 1` (dev replicas = 1, so voluntary disruption is blocked — acceptable for local).

## Config / secrets

- ConfigMap: `POSTGRES_HOST=postgres`, `POSTGRES_PORT=5432`
- Secret: `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`
- No JDBC URL in manifests

## Labels

`app.kubernetes.io/name: candle-api`, `component: api`, `version: 0.0.1`
