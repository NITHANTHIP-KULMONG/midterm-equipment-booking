# Campus Equipment Booking API — Midterm Exam

## Live Deployment

| Item | Value |
|------|-------|
| **Base URL** | `https://midterm.6731503018.workers.dev` |
| **Runtime** | Cloudflare Workers |
| **Framework** | Hono (TypeScript) |
| **Database** | Cloudflare D1 (Remote `taskflow-db` — SQLite) |

---

## Database Schema & ERD Overview

### Entity-Relationship Diagram

```
┌──────────────────────┐          ┌──────────────────────────────────┐
│      equipment       │          │            bookings              │
├──────────────────────┤          ├──────────────────────────────────┤
│ id       TEXT  [PK]  │◄──1──N──│ equipment_id  TEXT  [FK]         │
│ name     TEXT  [NN]  │          │ id            TEXT  [PK]         │
│ location TEXT  [NN]  │          │ borrower_name TEXT  [NN]         │
└──────────────────────┘          │ start_at      TEXT  [NN]         │
                                  │ end_at        TEXT  [NN]         │
                                  │ purpose       TEXT  [NN]         │
                                  │ created_at    TEXT  [NN] DEFAULT │
                                  └──────────────────────────────────┘
```

**Relationship:** One `equipment` → Many `bookings` (via `equipment_id` foreign key).

### DDL (migrations/0001_init.sql)

```sql
CREATE TABLE IF NOT EXISTS equipment (
  id       TEXT PRIMARY KEY,
  name     TEXT NOT NULL,
  location TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS bookings (
  id            TEXT PRIMARY KEY,
  equipment_id  TEXT NOT NULL,
  borrower_name TEXT NOT NULL,
  start_at      TEXT NOT NULL,
  end_at        TEXT NOT NULL,
  purpose       TEXT NOT NULL,
  created_at    TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (equipment_id) REFERENCES equipment(id)
);
```

Seed data includes 3 equipment items: *Projector A*, *Sony 4K Camera*, and *Meeting Room 301*.

---

## API Endpoints

| Method | Path | Description | Status Codes |
|--------|------|-------------|-------------|
| GET    | `/equipment`      | List all equipment       | 200 |
| GET    | `/bookings`       | List all bookings        | 200 |
| GET    | `/bookings/:id`   | Get a single booking     | 200, 404 |
| POST   | `/bookings`       | Create a new booking     | 201, 400, 404, 409 |
| PATCH  | `/bookings/:id`   | Update a booking         | 200, 400, 404, 409 |
| DELETE | `/bookings/:id`   | Delete a booking         | 204, 404 |

All endpoints are also accessible under the `/api/` prefix (e.g., `/api/bookings`).

### Error Format

Every error returns a single-key JSON envelope:

```json
{ "error": "<message>" }
```

---

## Live Curl Verification Examples

### 1. List Equipment — `200 OK`

```bash
curl -i https://midterm.6731503018.workers.dev/equipment
```

Expected:
```json
[
  {"id":"eq-1","name":"Projector A","location":"Building 1"},
  {"id":"eq-2","name":"Sony 4K Camera","location":"Media Lab B"},
  {"id":"eq-3","name":"Meeting Room 301","location":"Floor 3"}
]
```

### 2. Create Booking — `201 Created`

```bash
curl -i -X POST https://midterm.6731503018.workers.dev/bookings \
  -H "Content-Type: application/json" \
  -d '{"equipmentId":"eq-1","borrowerName":"Arthur Kulmong","startAt":"2026-10-20T09:00:00.000Z","endAt":"2026-10-20T11:00:00.000Z","purpose":"Exam Presentation"}'
```

Expected:
```json
{"id":"bk-...","equipmentId":"eq-1","borrowerName":"Arthur Kulmong","startAt":"2026-10-20T09:00:00.000Z","endAt":"2026-10-20T11:00:00.000Z","purpose":"Exam Presentation"}
```

### 3. Overlapping Booking — `409 Conflict`

```bash
curl -i -X POST https://midterm.6731503018.workers.dev/bookings \
  -H "Content-Type: application/json" \
  -d '{"equipmentId":"eq-1","borrowerName":"Somchai","startAt":"2026-10-20T10:00:00.000Z","endAt":"2026-10-20T12:00:00.000Z","purpose":"Overlap test"}'
```

Expected:
```json
{"error":"Booking time conflicts with an existing booking for this equipment"}
```

---

## Key Implementation Details

1. **Overlap Detection** — Uses SQLite's `datetime()` for accurate comparison:
   ```sql
   WHERE equipment_id = ?
     AND datetime(start_at) < datetime(?)
     AND datetime(end_at)   > datetime(?)
   ```
2. **Parameter Binding** — All queries use `.bind()` to prevent SQL injection.
3. **CORS** — Enabled for all origins via Hono middleware.
4. **ID Generation** — Booking IDs use `bk-` prefix + truncated UUID.

---

## Project Structure

```
midterm/
├── migrations/
│   └── 0001_init.sql          # DDL schema + seed data
├── src/
│   ├── worker/
│   │   └── index.ts           # Hono API routes (Workers entry point)
│   └── react-app/             # React frontend (SPA shell)
├── wrangler.json              # Wrangler / D1 binding configuration
└── package.json
```

---

## Deliverable Documents

| File | Description |
|------|-------------|
| [`API_CONTRACT.md`](./API_CONTRACT.md) | Full API contract — DDL schema, ERD, all endpoints with request/response examples, error envelope spec |
| [`QUALITY_GATE_REVIEW.md`](./QUALITY_GATE_REVIEW.md) | Quality gate review record — 4-column table covering Reliability, Accuracy, and Reasoning/You Own It with pre-30m commit `3429517` |
| [`AI_LOG.md`](./AI_LOG.md) | AI transparency audit log — 3 prompt entries with manual validation steps |
| [`TEST_EVIDENCE.md`](./TEST_EVIDENCE.md) | Test evidence — summary table and raw curl outputs for all 6 test cases (201, 409, 400, 404, 200, 204) |
| [`README.md`](./README.md) | This file — runnable project guide and deployment overview |
