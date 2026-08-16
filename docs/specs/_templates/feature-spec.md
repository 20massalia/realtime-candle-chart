# NNN — <Feature name>

- **Status**: Draft
- **Date**: YYYY-MM-DD
- **Layers touched**: Frontend / Backend / Database / Infra
- **Related**: `api/<resource>.openapi.yaml`, `db/<table>.md`, `k8s/<workload>.md`

## Problem

What is broken or missing today, and for whom. No solution language here.

## Goals

- Observable outcome 1
- Observable outcome 2

## Non-goals

Explicitly out of scope, so it does not get built by accident.

## Requirements

| ID | Requirement | Acceptance criteria |
| --- | --- | --- |
| R1 | ... | Verifiable condition — a test can assert it |
| R2 | ... | ... |

## Design

### API surface

Endpoints added or changed. Link the OpenAPI file; do not duplicate the schema here.

### Data

Tables, columns, indexes, and the migration plan (expand → migrate → contract where needed). Link the `db/` spec for anything non-trivial.

### Frontend

Routes, Server vs Client Component split, where the fetch happens, loading and error states.

### Backend

Controller → service → repository responsibilities, transaction boundaries, error mapping.

### Infrastructure

New env vars, secrets, resource impact, config changes.

## Edge cases

- Empty result / first-run state
- Concurrency and duplicate requests
- Backend unavailable or slow — what does the user see?
- Timezone and precision handling

## Test plan

| Level | What it covers |
| --- | --- |
| Backend unit | ... |
| Backend integration (Testcontainers) | ... |
| Frontend unit (Vitest) | ... |
| E2E (Playwright) | ... |

## Rollout

Deploy order (migration before or after code?), feature flag, rollback plan.

## Open questions

Unresolved items with an owner. Resolve these before status becomes `Agreed`.
