# API contract template

Copy the YAML below to `docs/specs/api/<resource>.openapi.yaml` and fill it in **before** writing backend or frontend code. Both sides derive from this file; neither side may add a field that is not here.

## Conventions

- Paths: `/api/v1/<plural-noun>`. No verbs in paths.
- JSON fields are `camelCase` on the wire, even though PostgreSQL columns are `snake_case`.
- Timestamps are ISO-8601 with an offset (`2026-08-14T11:32:00Z`), serialized from `timestamptz`.
- Money and prices are strings in JSON to preserve `numeric` precision — declare `type: string, format: decimal` and parse deliberately on the client.
- Every endpoint declares its error statuses. An undeclared status is a bug.
- All errors share one shape: `code`, `message`, `traceId`.

## Skeleton

```yaml
openapi: 3.1.0
info:
  title: <Resource> API
  version: 1.0.0
servers:
  - url: http://localhost:8080
    description: Local Spring Boot
paths:
  /api/v1/candles:
    get:
      operationId: listCandles
      summary: List OHLC candles for a symbol
      parameters:
        - name: symbol
          in: query
          required: true
          schema: { type: string, pattern: '^[A-Z.]{1,10}$' }
        - name: interval
          in: query
          required: true
          schema: { type: string, enum: [1m, 5m, 1h, 1d] }
        - name: limit
          in: query
          required: false
          schema: { type: integer, minimum: 1, maximum: 1000, default: 200 }
      responses:
        '200':
          description: Candles ordered by bucketStart ascending
          content:
            application/json:
              schema: { $ref: '#/components/schemas/CandleListResponse' }
        '400':
          description: Invalid symbol or interval
          content:
            application/json:
              schema: { $ref: '#/components/schemas/ErrorResponse' }
        '404':
          description: Unknown symbol
          content:
            application/json:
              schema: { $ref: '#/components/schemas/ErrorResponse' }
components:
  schemas:
    Candle:
      type: object
      required: [bucketStart, open, high, low, close]
      properties:
        bucketStart: { type: string, format: date-time }
        open: { type: string, format: decimal }
        high: { type: string, format: decimal }
        low: { type: string, format: decimal }
        close: { type: string, format: decimal }
        volume: { type: integer, format: int64, nullable: true }
    CandleListResponse:
      type: object
      required: [symbol, interval, candles]
      properties:
        symbol: { type: string }
        interval: { type: string }
        candles:
          type: array
          items: { $ref: '#/components/schemas/Candle' }
    ErrorResponse:
      type: object
      required: [code, message]
      properties:
        code: { type: string, example: INVALID_INTERVAL }
        message: { type: string }
        traceId: { type: string, nullable: true }
```

## Checklist before implementing

- [ ] Every field marked `required` is genuinely always present
- [ ] Nullable fields are declared `nullable: true` and handled on the client
- [ ] Every error status the backend can throw is declared
- [ ] Field names match exactly on both sides, including casing
- [ ] Numeric precision decided (string vs number) and consistent
- [ ] Pagination or `limit` bounds defined for any list endpoint
