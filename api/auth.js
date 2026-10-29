const { hashPassword, verifyPassword, getSession, setSession, clearSession } = require('./_lib/auth');
const { send, handler } = require('./_lib/util');
const admins = require('./_lib/admins');

module.exports = handler(async (req, res) => {
  const action = req.query.action;
  const b = req.body || {};

  if (action === 'me') return send(res, 200, { user: getSession(req) });
  if (action === 'logout') { clearSession(res); return send(res, 200, { ok: true }); }
  if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed.' });

  if (action === 'admin-login') {
    const a = admins.find((x) => x.username === String(b.username || '').trim().toLowerCase());
    if (!a || !verifyPassword(b.password, a.passwordHash)) return send(res, 401, { error: 'Wrong administrator username or password.' });
    setSession(res, { role: 'admin', username: a.username, name: a.name });
    return send(res, 200, { user: { role: 'admin', name: a.name } });
  }

  const { db } = require('./_lib/db');

  if (action === 'register') {
    const name = String(b.name || '').trim();
    const username = String(b.username || '').trim().toLowerCase();
    const password = String(b.password || '');
    if (name.length < 2 || name.length > 60) return send(res, 400, { error: 'Enter your full name.' });
    if (!/^[a-z0-9_.]{3,30}$/.test(username)) return send(res, 400, { error: 'Username must be 3-30 characters: letters, numbers, dot or underscore.' });
    if (password.length < 6) return send(res, 400, { error: 'Password must be at least 6 characters.' });
    if (admins.some((x) => x.username === username)) return send(res, 409, { error: 'That username is taken.' });
    const sql = await db();
    try {
      const [u] = await sql`INSERT INTO users (username, name, password_hash) VALUES (${username}, ${name}, ${hashPassword(password)}) RETURNING id`;
      setSession(res, { role: 'user', id: u.id, username, name });
      return send(res, 201, { user: { role: 'user', name, username } });
    } catch (e) {
      if (e.code === '23505') return send(res, 409, { error: 'That username is taken.' });
      throw e;
    }
  }

  if (action === 'login') {
    const username = String(b.username || '').trim().toLowerCase();
    const sql = await db();
    const [u] = await sql`SELECT id, name, password_hash FROM users WHERE username = ${username}`;
    if (!u || !verifyPassword(b.password, u.password_hash)) return send(res, 401, { error: 'Wrong username or password.' });
    setSession(res, { role: 'user', id: u.id, username, name: u.name });
    return send(res, 200, { user: { role: 'user', name: u.name, username } });
  }

  send(res, 400, { error: 'Unknown action.' });
});
