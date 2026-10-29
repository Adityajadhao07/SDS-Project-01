// Neon Postgres (added from the Vercel dashboard; it provides DATABASE_URL automatically)
let sql, ready;

function getSql() {
  if (!sql) {
    const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
    if (!url) throw new Error('DATABASE_URL is not set');
    sql = require('@neondatabase/serverless').neon(url);
  }
  return sql;
}

// Creates the tables the first time any function runs
function init() {
  if (!ready) {
    const q = getSql();
    ready = (async () => {
      await q`CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT now())`;
      await q`CREATE TABLE IF NOT EXISTS bookings (
        id SERIAL PRIMARY KEY,
        user_id INT NOT NULL REFERENCES users(id),
        venue TEXT NOT NULL,
        booking_date TEXT NOT NULL,
        start_hour INT NOT NULL,
        end_hour INT NOT NULL,
        purpose TEXT NOT NULL,
        attendees INT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        admin_note TEXT,
        decided_by TEXT,
        decided_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT now())`;
      await q`CREATE INDEX IF NOT EXISTS bookings_slot ON bookings (venue, booking_date, status)`;
    })().catch((e) => { ready = null; throw e; });
  }
  return ready;
}

async function db() { await init(); return getSql(); }
module.exports = { db };
