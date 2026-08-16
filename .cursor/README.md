# Cursor meta-code

Agent configuration for this repository. Committed on purpose — it is shared infrastructure, not personal setup.

## Layout

| Path | Purpose |
| --- | --- |
| `rules/00-global.mdc` | Always applied: repo layout, spec-driven workflow, stack guardrails, verification gate |
| `rules/10-frontend-nextjs.mdc` | Loaded for `app/`, `components/`, `lib/`, `stores/`, `proxy.ts` |
| `rules/20-backend-spring.mdc` | Loaded for `backend/**` Java/Kotlin and Gradle files |
| `rules/30-database-postgres.mdc` | Loaded for migrations, entities, repositories, `*.sql` |
| `rules/40-infra-k8s.mdc` | Loaded for `infra/**` manifests, charts, values |
| `skills/fullstack-tdd-loop/` | Contract-first TDD loop across Next.js and Spring Boot |
| `skills/db-schema-sync/` | Flyway ↔ live schema ↔ JPA drift audit and safe migrations |
| `skills/k8s-manifest-validation/` | Local render/validate gate, then read-only rollout verification |
| `agents/verifier.md` | Runs the verification gate, reports pass/fail, never edits |
| `agents/api-contract-guardian.md` | Read-only audit of OpenAPI ↔ controller ↔ frontend agreement |
| `agents/db-migration-reviewer.md` | Read-only migration safety review (locks, downtime, entity match) |
| `mcp.json` | MCP servers: `postgres`, `kubernetes`, `playwright`, `next-devtools` |

## MCP servers

All four run locally over stdio via `npx`. No secrets are stored in `mcp.json` — values are interpolated from your shell environment.

| Server | Package | Why |
| --- | --- | --- |
| `postgres` | `@yawlabs/postgres-mcp` | Schema introspection (`pg_describe_table`), `EXPLAIN`, index and slow-query diagnostics. Read-only by default — writes need `ALLOW_WRITES`, which this config deliberately omits |
| `kubernetes` | `mcp-server-kubernetes` | Cluster inspection: pods, logs, events, rollout status. Pinned to a version with the read-only enforcement fix, and locked to read-only tools |
| `playwright` | `@playwright/mcp` | Drives a real browser to verify the frontend actually consumes the backend payload, including console and network errors |
| `next-devtools` | `next-devtools-mcp` | Next.js 16 built-in dev-server endpoint: build/runtime/type errors, routes, Server Action lookup |

### Required environment variables

Do **not** rely on `export` in `~/.zshrc`. Cursor launched from the Dock does not inherit that shell. Put secrets in gitignored `.env.mcp` at the repo root (`mcp.json` loads it with `envFile`). Copy from `.cursor/mcp.env.example`.

```bash
cp .cursor/mcp.env.example .env.mcp
# then set DATABASE_URL and KUBECONFIG
```

Create the reader role once per database:

```sql
CREATE ROLE mcp_reader LOGIN PASSWORD '<password>';
GRANT pg_read_all_data TO mcp_reader;
```

PostgreSQL then enforces the read-only boundary itself, independent of any agent-side flag.

### Safety posture

- Database writes and DDL never go through MCP. Schema changes ship as reviewed Flyway migrations.
- Cluster mutations (`apply`, `delete`, `scale`, `rollout restart`, `exec`) require explicit per-action approval.
- Point `DATABASE_URL` and `KUBECONFIG` at non-production targets unless the user names production in the request.

### Enabling MCP in the UI

Customize lists **user** MCP from `~/.cursor/mcp.json` plus Marketplace plugins. A project-only `.cursor/mcp.json` does not show up in that list if the user file is missing or empty.

This machine’s user file is the one to toggle: `postgres`, `playwright`, `next-devtools`. Leave `kubernetes` off until `~/.kube/config` exists — `mcp-server-kubernetes` exits immediately if that file is missing (`MCP error -32000: Connection closed`).

1. Open **Customize** from the Cursor sidebar (not VS Code Settings).
2. Reload the window if the four names are missing after editing `~/.cursor/mcp.json` (`Cmd+Shift+P` → **Developer: Reload Window**).
3. Enable the servers. If a toggle stays red, open **Output** (`Cmd+Shift+U`) → **MCP Logs**.

`npx` must be on the GUI PATH. This repo’s Node comes from nvm; if logs say `npx: command not found`, open the project from a terminal (`cursor .`) so nvm is loaded, or put a Homebrew `npx` on PATH.

To debug a server that will not start, run its command in a terminal:

```bash
# postgres MCP reads DATABASE_URL, not MCP_DATABASE_URL
DATABASE_URL="postgres://mcp_reader:<password>@localhost:5432/candles" \
  npx -y @yawlabs/postgres-mcp@0.10.0
```

`next-devtools` only reports application state while `pnpm dev` is running.
