---
name: db-schema-sync
description: Detects and resolves drift between the live PostgreSQL schema, Flyway migrations, and JPA entities using read-only Postgres MCP introspection. Use when adding or altering a table or column, writing a Flyway migration, debugging a schema validation failure at startup, investigating a slow query, or when the user mentions schema drift, migration, or entity mapping.
---

# Database schema synchronization

Three artifacts must agree: **Flyway migrations** (source of truth), the **live schema**, and the **JPA entities**. This skill compares them with read-only introspection and fixes drift through a new migration — never by editing the database directly.

## Ground rules

- The `postgres` MCP server is read-only. Never ask it to run DDL or DML. Every schema change ships as a Flyway migration file the user reviews.
- Never edit an applied migration. Fix forward with a new `V{n}__*.sql`.
- Confirm which database `MCP_DATABASE_URL` points at before drawing conclusions. Never introspect production to design a dev change.

## Drift audit

```
- [ ] 1. Live schema captured
- [ ] 2. Migration history compared
- [ ] 3. Entity mapping compared
- [ ] 4. Drift reported with a source for each difference
```

**1. Capture the live schema** — `pg_list_tables`, then `pg_describe_table` for each relevant table. Record columns with types and nullability, primary key, foreign keys, unique constraints, and indexes.

**2. Compare with migrations** — read `backend/src/main/resources/db/migration/` in order and build the expected end state. Also check the applied history:

```sql
SELECT installed_rank, version, description, success FROM flyway_schema_history ORDER BY installed_rank DESC LIMIT 10;
```

A failed or missing row explains most "table does not exist" startup errors.

**3. Compare with entities** — for each `@Entity`, verify table name, every `@Column` name and nullability, the type mapping (`timestamptz` ↔ `OffsetDateTime`/`Instant`, `numeric` ↔ `BigDecimal`), and that no association is `EAGER`.

**4. Report** as a table: artifact, expected, actual, and which one is wrong.

## Common drift and the fix

| Symptom | Cause | Fix |
| --- | --- | --- |
| `Schema-validation: missing column` at startup | Entity has a field with no migration | New migration adding the column |
| Column exists in DB but not in any migration | Someone ran manual DDL | Write the migration that reproduces it, then reconcile environments |
| `BigDecimal` rounding differences | Column is `float`/`double` | Migration to `numeric(18, 8)`, expand → backfill → contract |
| Timestamps shift by hours | Column is `timestamp`, not `timestamptz` | Migration to `timestamptz` with an explicit source zone |
| Sudden slow endpoint | Missing index on a filtered column | Confirm with `pg_explain`, then `CREATE INDEX CONCURRENTLY` in its own migration |

## Writing the migration

```sql
-- V7__add_candle_source_column.sql
-- Rollback: ALTER TABLE candle DROP COLUMN source;
ALTER TABLE candle ADD COLUMN source text;
UPDATE candle SET source = 'mock' WHERE source IS NULL;
ALTER TABLE candle ALTER COLUMN source SET NOT NULL;
```

For a large table, split backfill into its own batched migration and keep `SET NOT NULL` in a later one. Index creation on a hot table:

```sql
-- V8__index_candle_symbol_bucket.sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_candle_symbol_interval_bucket
  ON candle (symbol, interval, bucket_start DESC);
```

`CONCURRENTLY` cannot run inside a transaction — keep it alone in the file.

## Performance follow-up

Before adding an index, check `pg_explain` for the actual plan, `pg_seq_scan_tables` for what is really scanning, and `pg_unused_indexes` so you do not stack a redundant index. State the before/after plan in the report.

## Verify

```bash
cd backend && ./gradlew flywayValidate
cd backend && ./gradlew test          # Testcontainers applies migrations from scratch
```

Then re-run `pg_describe_table` to confirm the live schema matches the intended end state, and record the change in `docs/specs/db/`.
