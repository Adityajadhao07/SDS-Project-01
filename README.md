# SDS Venue Booking

Plain HTML/CSS/JS front end (`public/`) + Vercel serverless functions (`api/`) + Neon Postgres.

## Deploy on Vercel
1. Push this folder to a GitHub repo.
2. Vercel dashboard: Add New > Project > import the repo (Framework: Other, no build command).
3. In the project, open **Storage** and add **Neon** (Postgres). This sets `DATABASE_URL` for you. Tables are created automatically on first use.
4. Project Settings > Environment Variables: add `JWT_SECRET` = any long random string (e.g. run `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`).
5. Redeploy. Open the URL.

Default administrator: `admin` / `Admin@SDS2026`. Change it before sharing the link.

## Adding administrators (code only)
1. `node scripts/hash-password.js "their-password"`
2. Add `{ username, name, passwordHash }` to `api/_lib/admins.js`, commit, push. Vercel redeploys.

## Rules built in
- Users register with name, username, password. Admins cannot be created on the site.
- Bookings run 8 AM to 8 PM in whole hours (India time).
- Only approved bookings block a room. Pending requests do not, and the admin cannot approve one that overlaps an approved booking.

## Local run
`npm i -g vercel`, `npm install`, `vercel link`, `vercel env pull .env.local`, `vercel dev`
