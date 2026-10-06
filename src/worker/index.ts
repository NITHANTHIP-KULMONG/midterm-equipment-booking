import { Hono } from 'hono';
import { cors } from 'hono/cors';

type Bindings = {
    DB: D1Database;
};

const app = new Hono<{ Bindings: Bindings }>();
const api = new Hono<{ Bindings: Bindings }>();

// CORS รองรับทุก Client
const corsMiddleware = cors({
    origin: '*',
    allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key'],
});

app.use('*', corsMiddleware);
api.use('*', corsMiddleware);

// Error Helper ตาม Contract: { "error": "..." }
const sendErr = (c: any, status: number, message: string) => {
    return c.json({ error: message }, status);
};

// Helper แปลง Row จาก DB เป็น JSON CamelCase ตาม Contract
const formatBooking = (row: any) => ({
    id: row.id,
    equipmentId: row.equipment_id,
    borrowerName: row.borrower_name,
    startAt: row.start_at,
    endAt: row.end_at,
    purpose: row.purpose,
});

// Helper เช็ค Overlap: startA < endB AND endA > startB
const hasOverlap = async (db: D1Database, equipmentId: string, startAt: string, endAt: string, excludeId?: string) => {
    let query = `
    SELECT id FROM bookings 
    WHERE equipment_id = ? 
      AND datetime(start_at) < datetime(?) 
      AND datetime(end_at) > datetime(?)
  `;
    const params: any[] = [equipmentId, endAt, startAt];

    if (excludeId) {
        query += ' AND id != ?';
        params.push(excludeId);
    }

    const conflict = await db.prepare(query).bind(...params).first();
    return Boolean(conflict);
};

// --- ROUTES IMPLEMENTATION ---

// 1. GET /equipment
api.get('/equipment', async (c) => {
    const result = await c.env.DB.prepare('SELECT id, name, location FROM equipment').all();
    return c.json(result.results || [], 200);
});

// 2. GET /bookings
api.get('/bookings', async (c) => {
    const result = await c.env.DB.prepare('SELECT * FROM bookings ORDER BY start_at ASC').all();
    const bookings = (result.results || []).map(formatBooking);
    return c.json(bookings, 200);
});

// 3. GET /bookings/:id
api.get('/bookings/:id', async (c) => {
    const id = c.req.param('id');
    const row = await c.env.DB.prepare('SELECT * FROM bookings WHERE id = ?').bind(id).first();
    if (!row) return sendErr(c, 404, 'Booking not found');
    return c.json(formatBooking(row), 200);
});

// 4. POST /bookings
api.post('/bookings', async (c) => {
    const body = await c.req.json().catch(() => null);
    if (!body) return sendErr(c, 400, 'Invalid JSON body');

    const { equipmentId, borrowerName, startAt, endAt, purpose } = body;

    // Validation: Missing fields
    if (!equipmentId || !borrowerName || !startAt || !endAt || !purpose) {
        return sendErr(c, 400, 'Missing required fields: equipmentId, borrowerName, startAt, endAt, and purpose are required');
    }

    // Validation: Date format & start < end
    const startDate = new Date(startAt);
    const endDate = new Date(endAt);
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return sendErr(c, 400, 'Invalid date format. Use ISO-8601 strings');
    }
    if (startDate >= endDate) {
        return sendErr(c, 400, 'startAt must be strictly before endAt');
    }

    // Validation: equipmentId exists
    const eq = await c.env.DB.prepare('SELECT id FROM equipment WHERE id = ?').bind(equipmentId).first();
    if (!eq) {
        return sendErr(c, 404, `Equipment with ID "${equipmentId}" not found`);
    }

    // Validation: Overlapping Check (409 Conflict)
    const isOverlapped = await hasOverlap(c.env.DB, equipmentId, startAt, endAt);
    if (isOverlapped) {
        return sendErr(c, 409, 'Booking time conflicts with an existing booking for this equipment');
    }

    const id = `bk-${crypto.randomUUID().slice(0, 8)}`;
    await c.env.DB.prepare(
        'INSERT INTO bookings (id, equipment_id, borrower_name, start_at, end_at, purpose) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(id, equipmentId, borrowerName.trim(), startAt, endAt, purpose.trim()).run();

    const newBooking = {
        id,
        equipmentId,
        borrowerName: borrowerName.trim(),
        startAt,
        endAt,
        purpose: purpose.trim(),
    };

    return c.json(newBooking, 201);
});

// 5. PATCH /bookings/:id
api.patch('/bookings/:id', async (c) => {
    const id = c.req.param('id');
    const existing: any = await c.env.DB.prepare('SELECT * FROM bookings WHERE id = ?').bind(id).first();
    if (!existing) return sendErr(c, 404, 'Booking not found');

    const body = await c.req.json().catch(() => null);
    if (!body) return sendErr(c, 400, 'Invalid JSON body');

    const equipmentId = body.equipmentId ?? existing.equipment_id;
    const borrowerName = body.borrowerName ?? existing.borrower_name;
    const startAt = body.startAt ?? existing.start_at;
    const endAt = body.endAt ?? existing.end_at;
    const purpose = body.purpose ?? existing.purpose;

    // Validate dates
    const startDate = new Date(startAt);
    const endDate = new Date(endAt);
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return sendErr(c, 400, 'Invalid date format');
    }
    if (startDate >= endDate) {
        return sendErr(c, 400, 'startAt must be strictly before endAt');
    }

    // Validate equipment exists
    const eq = await c.env.DB.prepare('SELECT id FROM equipment WHERE id = ?').bind(equipmentId).first();
    if (!eq) return sendErr(c, 404, `Equipment with ID "${equipmentId}" not found`);

    // Overlap check (exclude self)
    const isOverlapped = await hasOverlap(c.env.DB, equipmentId, startAt, endAt, id);
    if (isOverlapped) {
        return sendErr(c, 409, 'Updated booking time conflicts with an existing booking');
    }

    await c.env.DB.prepare(
        'UPDATE bookings SET equipment_id = ?, borrower_name = ?, start_at = ?, end_at = ?, purpose = ? WHERE id = ?'
    ).bind(equipmentId, borrowerName, startAt, endAt, purpose, id).run();

    return c.json({
        id,
        equipmentId,
        borrowerName,
        startAt,
        endAt,
        purpose,
    }, 200);
});

// 6. DELETE /bookings/:id (204 No Content)
api.delete('/bookings/:id', async (c) => {
    const id = c.req.param('id');
    const res = await c.env.DB.prepare('DELETE FROM bookings WHERE id = ?').bind(id).run();
    if (res.meta.changes === 0) {
        return sendErr(c, 404, 'Booking not found');
    }
    return c.body(null, 204);
});

// ผูก Router ทั้งแบบมี /api และไม่มี prefix เพื่อความเข้ากันได้
app.route('/api', api);
app.route('/', api);

app.notFound((c) => sendErr(c, 404, 'Route not found'));
app.onError((err, c) => sendErr(c, 500, err.message));

export default app;