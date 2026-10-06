# Test Evidence & Verification Log

**Base API URL:** `http://localhost:5173`
**Test Date:** 2026-10-06
**Shell:** Windows `cmd.exe` (to avoid PowerShell JSON quoting issues)

---

## Test Cases Summary

| Case | Method | Endpoint | Description | Expected Status | Actual Status | Result |
|:----:|--------|----------|-------------|:---------------:|:-------------:|:------:|
| 1 | POST   | `/bookings`                  | Create a valid booking                | 201 Created     | 201 Created     | ✅ PASS |
| 2 | POST   | `/bookings`                  | Overlapping time on same equipment    | 409 Conflict    | 409 Conflict    | ✅ PASS |
| 3 | POST   | `/bookings`                  | startAt ≥ endAt (invalid time order)  | 400 Bad Request | 400 Bad Request | ✅ PASS |
| 4 | GET    | `/bookings/bk-not-exist-999` | Non-existent booking ID               | 404 Not Found   | 404 Not Found   | ✅ PASS |
| 5 | GET    | `/bookings`                  | List all bookings                     | 200 OK          | 200 OK          | ✅ PASS |
| 6 | DELETE | `/bookings/bk-900fd47e`      | Delete an existing booking            | 204 No Content  | 204 No Content  | ✅ PASS |

**Overall:** 6/6 PASS ✅

---

## Raw Terminal Output (curl)

### Case 1 — POST `/bookings` → 201 Created

```text
D:\code\midterm>curl.exe -i -X POST http://localhost:5173/bookings -H "Content-Type: application/json" -d "{\"equipmentId\":\"eq-1\",\"borrowerName\":\"Arthur Kulmong\",\"startAt\":\"2026-10-20T09:00:00.000Z\",\"endAt\":\"2026-10-20T11:00:00.000Z\",\"purpose\":\"Exam Presentation\"}"
HTTP/1.1 201 Created
content-type: application/json; charset=UTF-8

{"id":"bk-900fd47e","equipmentId":"eq-1","borrowerName":"Arthur Kulmong","startAt":"2026-10-20T09:00:00.000Z","endAt":"2026-10-20T11:00:00.000Z","purpose":"Exam Presentation"}
```

**Verification:** Status `201`, response body contains generated `id`, all fields echoed back correctly.

---

### Case 2 — POST `/bookings` (overlap) → 409 Conflict

```text
D:\code\midterm>curl.exe -i -X POST http://localhost:5173/bookings -H "Content-Type: application/json" -d "{\"equipmentId\":\"eq-1\",\"borrowerName\":\"Somchai\",\"startAt\":\"2026-10-20T10:00:00.000Z\",\"endAt\":\"2026-10-20T12:00:00.000Z\",\"purpose\":\"Overlapping booking\"}"
HTTP/1.1 409 Conflict
content-type: application/json; charset=UTF-8

{"error":"Booking time conflicts with an existing booking for this equipment"}
```

**Verification:** The new booking (10:00–12:00) overlaps with Case 1 (09:00–11:00) on `eq-1`. Overlap formula `startA < endB AND endA > startB` → `10:00 < 11:00 AND 12:00 > 09:00` → true. Status `409` with single-key error envelope confirmed.

---

### Case 3 — POST `/bookings` (invalid time) → 400 Bad Request

```text
D:\code\midterm>curl.exe -i -X POST http://localhost:5173/bookings -H "Content-Type: application/json" -d "{\"equipmentId\":\"eq-1\",\"borrowerName\":\"Somchai\",\"startAt\":\"2026-10-20T15:00:00.000Z\",\"endAt\":\"2026-10-20T13:00:00.000Z\",\"purpose\":\"Invalid time\"}"
HTTP/1.1 400 Bad Request
content-type: application/json; charset=UTF-8

{"error":"startAt must be strictly before endAt"}
```

**Verification:** `startAt` (15:00) is after `endAt` (13:00). Status `400` with descriptive error message confirmed.

---

### Case 4 — GET `/bookings/:id` (not found) → 404 Not Found

```text
D:\code\midterm>curl.exe -i http://localhost:5173/bookings/bk-not-exist-999
HTTP/1.1 404 Not Found
content-type: application/json; charset=UTF-8

{"error":"Booking not found"}
```

**Verification:** Non-existent ID `bk-not-exist-999` returns `404` with single-key error envelope.

---

### Case 5 — GET `/bookings` → 200 OK

```text
D:\code\midterm>curl.exe -i http://localhost:5173/bookings
HTTP/1.1 200 OK
content-type: application/json; charset=UTF-8

[{"id":"bk-900fd47e","equipmentId":"eq-1","borrowerName":"Arthur Kulmong","startAt":"2026-10-20T09:00:00.000Z","endAt":"2026-10-20T11:00:00.000Z","purpose":"Exam Presentation"}]
```

**Verification:** Returns JSON array with the booking created in Case 1. Fields use camelCase as per contract. Status `200`.

---

### Case 6 — DELETE `/bookings/:id` → 204 No Content

```text
D:\code\midterm>curl.exe -i -X DELETE http://localhost:5173/bookings/bk-900fd47e
HTTP/1.1 204 No Content
```

**Verification:** Booking deleted successfully. Response has no body, status `204`. Subsequent GET for this ID would return `404`.