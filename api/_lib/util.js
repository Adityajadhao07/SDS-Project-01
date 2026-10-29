const { getSession } = require('./auth');

const send = (res, status, body) => res.status(status).json(body);

// Wraps a handler so unexpected errors become a clean JSON response
const handler = (fn) => async (req, res) => {
  try { await fn(req, res); }
  catch (e) {
    console.error(e);
    const setup = /JWT_SECRET|DATABASE_URL/.test(e.message);
    send(res, 500, { error: setup ? `Server setup incomplete: ${e.message}.` : 'Something went wrong on the server. Try again.' });
  }
};

function requireRole(req, res, role) {
  const s = getSession(req);
  if (!s || s.role !== role) { send(res, 401, { error: 'Please log in to continue.' }); return null; }
  return s;
}

// Current date/hour in India, because bookings are for campus time
function istNow() {
  const p = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23' }).formatToParts(new Date());
  const g = (t) => p.find((x) => x.type === t).value;
  return { date: `${g('year')}-${g('month')}-${g('day')}`, hour: Number(g('hour')) };
}

// Bookings run 8 AM - 8 PM in whole hours
function slotError(date, start, end) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '') || isNaN(Date.parse(date))) return 'Pick a valid date.';
  if (!Number.isInteger(start) || !Number.isInteger(end) || start < 8 || end > 20 || end <= start)
    return 'Choose a time between 8 AM and 8 PM, with the end after the start.';
  return null;
}

module.exports = { send, handler, requireRole, istNow, slotError };
