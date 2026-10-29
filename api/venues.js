const venues = require('./_lib/venues.json');
const { db } = require('./_lib/db');
const { send, handler, requireRole, slotError } = require('./_lib/util');

// Rooms matching capacity + features, each flagged available/unavailable for the time window.
// Only APPROVED bookings block a slot; pending requests do not.
module.exports = handler(async (req, res) => {
  if (!requireRole(req, res, 'user')) return;
  const q = req.query;
  const start = Number(q.start), end = Number(q.end);
  const err = slotError(q.date, start, end);
  if (err) return send(res, 400, { error: err });

  const minCap = Math.max(0, parseInt(q.minCapacity, 10) || 0);
  let list = venues.filter((v) =>
    v.capacity >= minCap &&
    (!q.type || v.type === q.type) &&
    (q.projector !== '1' || v.projector) &&
    (q.sound !== '1' || v.soundSystem));

  const sql = await db();
  const rows = await sql`SELECT venue, start_hour, end_hour FROM bookings WHERE booking_date = ${q.date} AND status = 'approved'`;
  const busy = {};
  for (const r of rows) for (let h = r.start_hour; h < r.end_hour; h++) (busy[r.venue] ||= []).push(h);

  list = list.map((v) => {
    const b = busy[v.name] || [];
    let available = true;
    for (let h = start; h < end; h++) if (b.includes(h)) available = false;
    return { ...v, busy: b, available };
  }).sort((a, b) => b.available - a.available || a.capacity - b.capacity || a.name.localeCompare(b.name));

  send(res, 200, { venues: list });
});
