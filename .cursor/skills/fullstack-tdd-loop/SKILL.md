---
name: fullstack-tdd-loop
description: Contract-first test-driven loop for features that span the Next.js frontend and the Spring Boot backend. Use when adding or changing an API endpoint, wiring a new page to backend data, fixing a bug that crosses the frontend/backend boundary, or when the user mentions an API contract, OpenAPI spec, or full-stack feature.
---

# Full-stack TDD loop

Order is fixed: contract → backend test → backend code → frontend test → frontend code → verify. Never write implementation before the failing test exists.

## Progress checklist

Copy this and keep it updated:

```
- [ ] 1. Spec + contract updated in docs/specs/
- [ ] 2. Backend test written and failing for the right reason
- [ ] 3. Backend implemented, test green
- [ ] 4. Frontend test written and failing
- [ ] 5. Frontend implemented, test green
- [ ] 6. Contract conformance verified end to end
- [ ] 7. Full gate run, real output quoted
```

## Step 1 — Contract first

Update `docs/specs/api/<resource>.openapi.yaml` before any code. Define path, method, query/path params, request body, success schema, and every error status.

Both sides derive from this file. If the contract does not describe it, it does not exist.

## Step 2 — Backend test first

Web layer with `@WebMvcTest`, persistence with Testcontainers PostgreSQL. Assert the contract, not the implementation: status code, JSON field names, and types exactly as specified.

```java
@Test
void returnsCandlesForSymbol() throws Exception {
  mockMvc.perform(get("/api/v1/candles").param("symbol", "AAPL").param("interval", "1m"))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.candles[0].bucketStart").exists())
      .andExpect(jsonPath("$.candles[0].close").isNumber());
}
```

Run it and confirm it fails for the intended reason (404/missing bean), not a typo or config error.

## Step 3 — Backend implementation

Minimum code to pass: DTO records → controller → service → repository. Re-run `cd backend && ./gradlew test`.

## Step 4 — Frontend test first

Unit-test pure logic in `lib/` with Vitest. For UI, use Testing Library with the fetch layer mocked using a fixture whose shape is copied from the contract — not from what the code happens to return.

Add a Playwright spec when a user-visible flow changed.

## Step 5 — Frontend implementation

Derive the request and response types from the contract. Handle the error statuses the contract declares; do not swallow them.

## Step 6 — Contract conformance

Run the backend, then confirm the live response matches the contract field-by-field:

```bash
curl -s "http://localhost:8080/api/v1/candles?symbol=AAPL&interval=1m" | jq .
```

Compare against the OpenAPI schema. Any drift is a bug in whichever side deviated from the contract — fix the code, not the contract, unless the requirement itself changed.

For the browser path, drive the running app with the `playwright` MCP server: navigate the page, then read console errors and network responses to confirm the frontend consumes the real payload. Use the `next-devtools` MCP server (`get_errors`) to pull build, runtime, and type errors straight from the dev server.

## Step 7 — Gate

```bash
pnpm typecheck && pnpm lint && pnpm test
pnpm test:e2e                       # if UI behavior changed
cd backend && ./gradlew test
```

Quote the actual output. If a command cannot run here, say so and name what is unverified.

## Failure handling

Test still red after two implementation attempts? Stop guessing:

- Backend: read the full stack trace, then use the `postgres` MCP server (`pg_describe_table`, `pg_explain`) to check the real schema and query plan.
- Frontend: pull `get_errors` and `get_logs` from `next-devtools` MCP rather than inferring from the browser UI.

Report the diagnosis before continuing.
