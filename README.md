# Campus Equipment Booking API (Midterm Exam)

REST API for reserving campus equipment (projectors, cameras, meeting rooms) with **time-overlap conflict prevention**, built on Cloudflare Workers + Hono + D1.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Cloudflare Workers |
| Framework | Hono |
| Database | Cloudflare D1 (SQLite) |
| Frontend | React + Vite (optional, SPA shell) |
| Language | TypeScript |

---

## Prerequisites

- **Node.js** ≥ 18
- **npm** ≥ 9
- **Wrangler** (installed as a dev dependency)

---

## How to Run Locally

### 1. Install Dependencies

```bash
npm install
```

### 2. Initialize the D1 Database (apply migrations)

```bash
npx wrangler d1 execute taskflow-db --local --file=./migrations/0001_init.sql
```

This creates the `equipment` and `bookings` tables and seeds 3 equipment items.

### 3. Start the Development Server

```bash
npm run dev
```

The API will be available at **http://localhost:5173**.

### 4. Verify It Works

```bash
curl http://localhost:5173/equipment
```

Expected response:
```json
[
  {"id":"eq-1","name":"Projector A","location":"Building 1"},
  {"id":"eq-2","name":"Sony 4K Camera","location":"Media Lab B"},
  {"id":"eq-3","name":"Meeting Room 301","location":"Floor 3"}
]
```

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

> All endpoints are available with both `/` and `/api/` prefixes (e.g., `/bookings` and `/api/bookings`).

### Error Format

All errors return a single-key JSON envelope:

```json
{ "error": "<message>" }
```

---

## Project Structure

```
midterm/
├── migrations/
│   └── 0001_init.sql          # DDL + seed data
├── src/
│   ├── worker/
│   │   └── index.ts           # Hono API routes (main entry point)
│   └── react-app/             # React frontend (SPA shell)
├── API_CONTRACT.md            # Full API contract & ERD
├── QUALITY_GATE_REVIEW.md     # Quality gate review record
├── AI_LOG.md                  # AI transparency audit log
├── TEST_EVIDENCE.md           # Test cases & raw curl output
├── README.md                  # This file
├── wrangler.json              # Wrangler / D1 configuration
└── package.json
```

---

## Key Implementation Details

1. **Overlap Detection** uses SQLite's `datetime()` function:
   ```sql
   WHERE equipment_id = ?
     AND datetime(start_at) < datetime(?)
     AND datetime(end_at)   > datetime(?)
   ```
2. **Parameter Binding** — All SQL queries use `.bind()` to prevent injection.
3. **CORS** — Enabled for all origins via Hono middleware.
4. **ID Generation** — Booking IDs use `bk-` prefix + truncated UUID.

---

## Deliverable Documents

| File | Purpose |
|------|---------|
| `API_CONTRACT.md` | Full API contract, DDL schema, and ERD |
| `QUALITY_GATE_REVIEW.md` | Quality gate review (Reliability, Accuracy, Reasoning) |
| `AI_LOG.md` | AI transparency audit log (3 prompts + validations) |
| `TEST_EVIDENCE.md` | Test evidence table + raw curl outputs (6 cases) |
| `README.md` | This runnable project guide |
