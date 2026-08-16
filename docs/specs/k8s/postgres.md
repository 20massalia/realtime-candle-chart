# Workload: postgres

- **Status**: Agreed
- **Date**: 2026-08-16
- **Overlay**: `infra/k8s/overlays/dev`
- **Related**: `002-local-k8s.md`, `db/candle.md`

## Role

In-cluster PostgreSQL 16 for Flyway + JPA. Not exposed outside the cluster. Schema source of truth remains Flyway, not this image.

## Image

`postgres@sha256:4e6e670bb069649261c9c18031f0aded7bb249a5b6664ddec29c013a89310d50` (`postgres:16.13-alpine` as pulled 2026-08-16).

## Env (from Secret)

`POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`. `PGDATA=/var/lib/postgresql/data/pgdata`.

## Storage

PVC 1Gi, `ReadWriteOnce`. Dev StorageClass is cluster default (kind `standard`).

## Probes

TCP 5432. startupProbe allows init; readiness before API becomes Ready.

## Resources (dev)

| | CPU | Memory |
| --- | --- | --- |
| requests | 50m | 256Mi |
| limits | 250m | 512Mi |

## Security

`runAsNonRoot: true`, `runAsUser/Group: 70` (official `postgres:16.13-alpine` `postgres` user), `fsGroup: 70`, `allowPrivilegeEscalation: false`. `readOnlyRootFilesystem: false` (data directory writes).

## Labels

`app.kubernetes.io/name: candle-postgres`, `component: database`, `version: 16.13`

## Secrets

Credentials only via `secretGenerator` from gitignored `overlays/dev/postgres.env`. Never literals in YAML.
