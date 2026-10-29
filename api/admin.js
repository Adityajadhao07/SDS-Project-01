const { db } = require('./_lib/db');
const { send, handler, requireRole } = require('./_lib/util');

module.exports = handler(async (req, res) => {
  const s = requireRole(req, res, 'admin');
  if (!s) return;
  const sql = await db();

  if (req.method === 'GET') {
    const status = ['pending', 'approved', 'rejected', 'cancelled'].includes(req.query.status) ? req.query.status : 'all';
    const rows = await sql`
      SELECT b.id, b.venue, b.booking_date, b.start_hour, b.end_hour, b.purpose, b.attendees, b.status, b.admin_note, b.created_at,
             u.name, u.username,
             EXISTS (SELECT 1 FROM bookings o WHERE o.id <> b.id AND o.venue = b.venue AND o.booking_date = b.booking_date
                     AND o.status = 'approved' AND o.start_hour < b.end_hour AND o.end_hour > b.start_hour) AS conflict
      FROM bookings b JOIN users u ON u.id = b.user_id
      WHERE (${status}::text = 'all' OR b.status = ${status}::text)
      ORDER BY b.booking_date, b.start_hour, b.id`;
    return send(res, 200, { bookings: rows });
  }

  if (req.method === 'POST') {
    const id = parseInt((req.body || {}).id, 10);
    const action = (req.body || {}).action;
    const note = String((req.body || {}).note || '').trim().slice(0, 200) || null;

    let done;
    if (action === 'approve') {
      // Atomic: approves only if still pending AND no approved booking overlaps
      done = await sql`UPDATE bookings b SET status = 'approved', admin_note = ${note}, decided_by = ${s.username}, decided_at = now()
        WHERE b.id = ${id} AND b.status = 'pending'
        AND NOT EXISTS (SELECT 1 FROM bookings o WHERE o.venue = b.venue AND o.booking_date = b.booking_date AND o.status = 'approved'
                        AND o.start_hour < b.end_hour AND o.end_hour > b.start_hour)
        RETURNING id`;
    } else if (action === 'reject') {
      done = await sql`UPDATE bookings SET status = 'rejected', admin_note = ${note}, decided_by = ${s.username}, decided_at = now()
        WHERE id = ${id} AND status = 'pending' RETURNING id`;
    } else return send(res, 400, { error: 'Unknown action.' });

    if (done.length) return send(res, 200, { ok: true });
    const [cur] = await sql`SELECT status FROM bookings WHERE id = ${id}`;
    if (!cur) return send(res, 404, { error: 'Request not found.' });
    if (cur.status !== 'pending') return send(res, 409, { error: `This request is already ${cur.status}.` });
    return send(res, 409, { error: 'Cannot approve: another approved booking already overlaps this room and time. Reject this request instead.' });
  }

  send(res, 405, { error: 'Method not allowed.' });
});
