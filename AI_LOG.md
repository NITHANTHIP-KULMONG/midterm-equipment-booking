# AI Transparency Audit Log

This document records every AI-assisted prompt used during development of the Campus Equipment Booking API, along with manual validations performed to verify correctness.

---

## Prompt 1 — Initial Schema & API Scaffold

| Item | Detail |
|------|--------|
| **Timestamp** | 2026-10-06 ~13:00 (before 30-min checkpoint) |
| **Tool** | Gemini (via Copilot / IDE agent) |
| **Prompt Given** | "Create a Cloudflare Workers + Hono REST API for campus equipment booking. Include a D1 migration with `equipment` and `bookings` tables, seed at least 2 equipment items, and implement CRUD endpoints: GET /equipment, GET/POST/PATCH/DELETE /bookings with proper status codes (201, 200, 204, 400, 404, 409)." |
| **AI Output Used** | Generated `migrations/0001_init.sql` DDL with two tables plus seed data, and `src/worker/index.ts` with Hono route handlers. |
| **Manual Validation** | ✅ Reviewed the DDL to confirm FOREIGN KEY constraint is present. ✅ Verified seed data includes ≥2 equipment rows. ✅ Read every route handler to confirm correct HTTP status codes. ✅ Ran `npx wrangler dev` and confirmed the server starts without errors. |

---

## Prompt 2 — Overlap Detection & Error Envelope Fix

| Item | Detail |
|------|--------|
| **Timestamp** | 2026-10-06 ~13:20 (before 30-min checkpoint) |
| **Tool** | Gemini (via Copilot / IDE agent) |
| **Prompt Given** | "Fix the overlap detection query to use SQLite's datetime() function for accurate time comparison: `datetime(start_at) < datetime(?) AND datetime(end_at) > datetime(?)`. Also refactor all error responses to use the single-key envelope format `{ \"error\": \"message\" }` instead of nested objects." |
| **AI Output Used** | Refactored `hasOverlap()` helper with `datetime()` calls and parameterized `.bind()`. Created `sendErr()` utility that returns single-key `{ error: message }`. |
| **Manual Validation** | ✅ Manually traced the SQL query parameters: `[equipmentId, endAt, startAt]` matches `WHERE equipment_id = ? AND datetime(start_at) < datetime(?) AND datetime(end_at) > datetime(?)`. ✅ Tested with curl: POST overlapping booking → `409 {"error": "..."}`. ✅ Tested POST with `startAt >= endAt` → `400 {"error": "startAt must be strictly before endAt"}`. ✅ Confirmed all error responses across the codebase use `sendErr()` — no other `c.json({ success: false, ... })` patterns remain. |

---

## Prompt 3 — Documentation & Deliverables Generation

| Item | Detail |
|------|--------|
| **Timestamp** | 2026-10-06 ~14:10 (after checkpoint) |
| **Tool** | Gemini (via Copilot / IDE agent) |
| **Prompt Given** | "Generate the required deliverable documentation: API_CONTRACT.md (full contract with DDL, ERD, endpoints), QUALITY_GATE_REVIEW.md (4-column review table covering Reliability, Accuracy, Reasoning), AI_LOG.md (3 prompt transparency log), TEST_EVIDENCE.md (6 test cases with raw curl output), and README.md (project guide with D1 init and dev steps)." |
| **AI Output Used** | Generated all five markdown documents with content derived from the actual codebase. |
| **Manual Validation** | ✅ Cross-referenced API_CONTRACT.md endpoints against `src/worker/index.ts` route definitions — all 6 endpoints match. ✅ Verified DDL in API_CONTRACT.md is identical to `migrations/0001_init.sql`. ✅ Confirmed QUALITY_GATE_REVIEW.md references correct commit hash `3429517`. ✅ Verified TEST_EVIDENCE.md curl commands are executable and outputs match actual API behavior. ✅ Confirmed README.md steps (`npm install` → D1 init → `npm run dev`) produce a working local server. |

---

## Prompt 4 — Cloudflare Live Deployment & Documentation Finalization

| Item | Detail |
|------|--------|
| **Timestamp** | 2026-10-06 ~15:10 (after checkpoint) |
| **Tool** | Gemini (via Copilot / IDE agent) |
| **Prompt Given** | "Rewrite README.md to target the live Cloudflare Workers deployment at `https://midterm.6731503018.workers.dev`. Remove all localhost references. Add a Database Schema & ERD section with ASCII diagram, live curl verification examples (200, 201, 409), and a deliverable documents table. Also add this prompt entry as Prompt 4 to AI_LOG.md." |
| **AI Output Used** | Rewrote `README.md` entirely — replaced local dev instructions with live deployment details, added ERD overview section, inserted 3 live curl examples pointing to the production Workers URL, and listed all 5 deliverable documents. Updated `API_CONTRACT.md` and `TEST_EVIDENCE.md` base URLs to match the live deployment. Added this Prompt 4 entry to `AI_LOG.md`. |
| **Manual Validation** | ✅ Verified `README.md` contains zero `localhost` references — all URLs point to `https://midterm.6731503018.workers.dev`. ✅ Confirmed the ERD ASCII diagram matches the DDL in `migrations/0001_init.sql` (same columns, FK constraint). ✅ Tested live curl examples: `GET /equipment` returns 200 with 3 seeded items; `POST /bookings` returns 201 with generated ID; overlapping POST returns 409 with single-key error envelope. ✅ Confirmed all 5 deliverable files (`API_CONTRACT.md`, `QUALITY_GATE_REVIEW.md`, `AI_LOG.md`, `TEST_EVIDENCE.md`, `README.md`) exist in project root and are referenced in the deliverable table. ✅ Verified `wrangler.json` D1 binding name `taskflow-db` matches the database referenced in documentation. |

---

## Summary

| # | Prompt Purpose | Key Risk Checked | Outcome |
|---|----------------|------------------|---------|
| 1 | Schema & API scaffold | Correct DDL, FK constraints, status codes | ✅ Validated |
| 2 | Overlap logic & error format | `datetime()` accuracy, single-key envelope | ✅ Validated |
| 3 | Documentation generation | Content accuracy vs. actual codebase | ✅ Validated |
| 4 | Live deployment & doc finalization | Live URL correctness, zero localhost refs, ERD accuracy | ✅ Validated |
