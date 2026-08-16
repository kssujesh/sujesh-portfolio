# Sujesh Portfolio — Database-backed version

This version removes the manual JSON export workflow.

## What changed

The portfolio now has:

- SQLite database
- Admin login
- `/admin` dashboard
- Add/edit/delete Projects
- Add/edit/delete Skills
- Add/edit/delete Experience
- Add/edit/delete Certifications
- Add/edit/delete Achievements
- Edit profile
- Public site reads directly from the database
- Changes appear immediately after saving

There is **no JSON export step** for normal updates.

## Run locally

1. Install Node.js LTS.
2. Open a terminal in this folder.
3. Run:

```bash
npm install
npm start
```

4. Open:

`http://localhost:3000`

5. Portfolio manager:

`http://localhost:3000/admin`

Default development credentials if you did not create a `.env` file:

- Username: `sujesh`
- Password: `change-me`

**Change these before deploying publicly.**

## Better local setup

Copy `.env.example` to `.env` and set:

```text
SESSION_SECRET=a-long-random-secret
ADMIN_USERNAME=your-username
ADMIN_PASSWORD=a-strong-password
```

Restart the server.

## How future updates work

You no longer edit JSON.

Example:

1. Open `/admin`.
2. Log in.
3. Click `+ Add new project`.
4. Enter title, description, category, skills, GitHub link, etc.
5. Click `Add project`.
6. Open the public site.

The new project is stored in SQLite and appears on the site immediately.

## Deploying online

This is a real server application, not a static HTML folder.

A straightforward deployment is Render/Railway/Fly.io or another Node hosting provider. Because SQLite is a file database, the production host must provide persistent storage/volume if you want the database to survive redeploys.

For a larger production setup, the next upgrade would be PostgreSQL/Supabase. The admin UI can stay almost identical while the database changes underneath.

## Security

Before public deployment:

- Change the admin username/password.
- Set a long random `SESSION_SECRET`.
- Use HTTPS.
- Do not commit `.env`.
- For a production public portfolio, add rate limiting and CSRF protection.

## Resume

The supplied resume is served from:

`/assets/Sujesh_Resume.pdf`

Replace that file when your resume changes, or we can add resume upload to the admin manager in the next iteration.
