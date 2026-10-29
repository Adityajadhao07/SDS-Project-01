const venues = require('./_lib/venues.json');
const { db } = require('./_lib/db');
const { send, handler, requireRole, istNow, slotError } = require('./_lib/util');

module.exports = handler(async (req, res) => {
  const s = requireRole(req, res, 'user');
  if (!s) return;
  const sql = await db();

  if (req.method === 'GET') {
    const rows = await sql`SELECT id, venue, booking_date, start_hour, end_hour, purpose, attendees, status, admin_note, created_at
      FROM bookings WHERE user_id = ${s.id} ORDER BY booking_date DESC, start_hour DESC, id DESC`;
    return send(res, 200, { bookings: rows });
  }

  if (req.method === 'POST') {
    const b = req.body || {};
    const start = Number(b.start), end = Number(b.end);
    const date = String(b.date || ''), purpose = String(b.purpose || '').trim();
    const attendees = parseInt(b.attendees, 10);
    const v = venues.find((x) => x.name === b.venue);
    if (!v) return send(res, 400, { error: 'That room does not exist.' });
    const err = slotError(date, start, end);
    if (err) return send(res, 400, { error: err });
    const now = istNow();
    if (date < now.date || (date === now.date && start <= now.hour)) return send(res, 400, { error: 'Choose a time that has not started yet.' });
    if (purpose.length < 3 || purpose.length > 200) return send(res, 400, { error: 'Describe the purpose in a few words.' });
    if (!(attendees >= 1) || attendees > v.capacity) return send(res, 400, { error: `${v.name} holds up to ${v.capacity} people.` });

    const taken = await sql`SELECT 1 FROM bookings WHERE venue = ${v.name} AND booking_date = ${date} AND status = 'approved' AND start_hour < ${end} AND end_hour > ${start}`;
    if (taken.length) return send(res, 409, { error: 'This room was just booked for that time. Search again.' });
    const dupe = await sql`SELECT 1 FROM bookings WHERE user_id = ${s.id} AND venue = ${v.name} AND booking_date = ${date} AND status = 'pending' AND start_hour < ${end} AND end_hour > ${start}`;
    if (dupe.length) return send(res, 409, { error: 'You already have a pending request for this room and time.' });

    const [row] = await sql`INSERT INTO bookings (user_id, venue, booking_date, start_hour, end_hour, purpose, attendees)
      VALUES (${s.id}, ${v.name}, ${date}, ${start}, ${end}, ${purpose}, ${attendees}) RETURNING id`;
    return send(res, 201, { id: row.id });
  }

  if (req.method === 'DELETE') {
    const id = parseInt(req.query.id, 10);
    const r = await sql`UPDATE bookings SET status = 'cancelled' WHERE id = ${id} AND user_id = ${s.id} AND status IN ('pending', 'approved') RETURNING id`;
    if (!r.length) return send(res, 404, { error: 'This request cannot be cancelled.' });
    return send(res, 200, { ok: true });
  }

  send(res, 405, { error: 'Method not allowed.' });
});
