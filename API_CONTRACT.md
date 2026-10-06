# Campus Equipment Booking API — Full Contract & Data Design

**Base URL:** `http://localhost:5173` (supports both root `/` and `/api/` prefixes)

---

## 1. Entity-Relationship Diagram (ERD)

```
┌──────────────────────┐         ┌──────────────────────────────────┐
│      equipment       │         │           bookings               │
├──────────────────────┤         ├──────────────────────────────────┤
│ id       TEXT  [PK]  │◄──1──N──│ equipment_id  TEXT  [FK]         │
│ name     TEXT  [NN]  │         │ id            TEXT  [PK]         │
│ location TEXT  [NN]  │         │ borrower_name TEXT  [NN]         │
└──────────────────────┘         │ start_at      TEXT  [NN]         │
                                 │ end_at        TEXT  [NN]         │
                                 │ purpose       TEXT  [NN]         │
                                 │ created_at    TEXT  [NN] DEFAULT │
                                 └──────────────────────────────────┘
```

**Relationship:** One `equipment` → Many `bookings` (via `equipment_id` foreign key).

---

## 2. DDL Schema (SQLite / Cloudflare D1)

```sql
DROP TABLE IF EXISTS bookings;
DROP TABLE IF EXISTS equipment;

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

-- Seed data (minimum 2 items)
INSERT OR IGNORE INTO equipment (id, name, location) VALUES
  ('eq-1', 'Projector A',      'Building 1'),
  ('eq-2', 'Sony 4K Camera',   'Media Lab B'),
  ('eq-3', 'Meeting Room 301', 'Floor 3');
```

---

## 3. API Endpoints

### 3.1 Equipment

| Method | Path | Description | Success | Errors |
|--------|------|-------------|---------|--------|
| GET | `/equipment` | List all equipment | 200 OK | — |

**Response 200:**
```json
[
  { "id": "eq-1", "name": "Projector A", "location": "Building 1" },
  { "id": "eq-2", "name": "Sony 4K Camera", "location": "Media Lab B" }
]
```

### 3.2 Bookings

| Method | Path | Description | Success | Errors |
|--------|------|-------------|---------|--------|
| GET    | `/bookings`     | List all bookings              | 200 | — |
| GET    | `/bookings/:id` | Retrieve a single booking      | 200 | 404 |
| POST   | `/bookings`     | Create a new booking           | 201 | 400, 404, 409 |
| PATCH  | `/bookings/:id` | Partially update a booking     | 200 | 400, 404, 409 |
| DELETE | `/bookings/:id` | Delete a booking               | 204 | 404 |

---

#### POST `/bookings` — Create Booking

**Request Body (JSON):**
```json
{
  "equipmentId":  "eq-1",
  "borrowerName": "Arthur Kulmong",
  "startAt":      "2026-10-20T09:00:00.000Z",
  "endAt":        "2026-10-20T11:00:00.000Z",
  "purpose":      "Exam Presentation"
}
```

**Response 201 Created:**
```json
{
  "id":           "bk-900fd47e",
  "equipmentId":  "eq-1",
  "borrowerName": "Arthur Kulmong",
  "startAt":      "2026-10-20T09:00:00.000Z",
  "endAt":        "2026-10-20T11:00:00.000Z",
  "purpose":      "Exam Presentation"
}
```

#### PATCH `/bookings/:id` — Update Booking

**Request Body (JSON, all fields optional):**
```json
{
  "borrowerName": "Updated Name",
  "startAt":      "2026-10-20T10:00:00.000Z",
  "endAt":        "2026-10-20T12:00:00.000Z"
}
```

**Response 200 OK:** Returns full updated booking object.

#### DELETE `/bookings/:id` — Delete Booking

**Response 204 No Content:** Empty body on success.

---

## 4. Business Rules

1. **Overlap Detection:** Two bookings on the same equipment conflict when `startA < endB AND endA > startB`. The API uses SQLite's `datetime()` function for accurate comparison:
   ```sql
   WHERE equipment_id = ?
     AND datetime(start_at) < datetime(?)
     AND datetime(end_at)   > datetime(?)
   ```
2. **Date Validation:** `startAt` must be strictly before `endAt`. Both must be valid ISO-8601 strings.
3. **Equipment Exists:** POST and PATCH verify that the referenced `equipmentId` exists in the `equipment` table.
4. **Parameter Binding:** All queries use D1's `.bind()` to prevent SQL injection.

---

## 5. Error Envelope (Single-Key Format)

All errors use a single-key JSON envelope:

```json
{ "error": "<human-readable message>" }
```

| Status | Condition | Example Message |
|--------|-----------|-----------------|
| 400 | Missing required fields | `"Missing required fields: equipmentId, borrowerName, startAt, endAt, and purpose are required"` |
| 400 | Invalid date format | `"Invalid date format. Use ISO-8601 strings"` |
| 400 | startAt ≥ endAt | `"startAt must be strictly before endAt"` |
| 404 | Equipment not found | `"Equipment with ID \"eq-99\" not found"` |
| 404 | Booking not found | `"Booking not found"` |
| 409 | Time overlap on same equipment | `"Booking time conflicts with an existing booking for this equipment"` |
| 500 | Unhandled server error | `"<error.message>"` |