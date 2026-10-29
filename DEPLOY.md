# Deploying DealVault on Vercel

This build is a single Node application: no build step, no runtime dependencies.
On Vercel it runs as one serverless function (`api/index.js`) that serves the
pages, the gated rooms and the admin API. `vercel.json` sends every request
through it so the confidentiality gate and security headers cannot be bypassed.

Read the two short sections below, then follow **Option A** or **Option B**.

---

## 1. Before you deploy

### Admin key (required)

The operator console at `/admin` is disabled until you set `ADMIN_KEY`.
Locally it falls back to `dealvault-admin-2026`; on Vercel there is no fallback
on purpose.

Pick something long and random, for example:

```bash
node -e "console.log(require('crypto').randomBytes(18).toString('base64url'))"
```

### Storage (strongly recommended)

The app keeps accounts, requests, sessions and audit records in one JSON
document. It supports two backends:

| Backend | When | Behaviour |
| --- | --- | --- |
| **Upstash Redis / Vercel KV** | `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`, or `KV_REST_API_URL` + `KV_REST_API_TOKEN` are set | Persistent across deploys, shared by every instance. **Use this.** |
| **Local file** | No KV variables | Reads and writes `data/store.json` locally. On Vercel it falls back to `/tmp`, which is erased when the instance recycles — accounts and audit records would vanish. |

Connecting a Redis database from the Vercel dashboard adds the variables for
you (Storage → Create Database → Upstash Redis → Connect to project).
The free tier is more than enough for a deal platform at this stage.

### Demo mode

There is no email provider wired in. In demo mode the verification and reset
codes are returned to the browser and shown on screen, so investors can get in
without email. That is on by default on Vercel and should stay on for a demo.
Set `DEMO_MODE=false` only after you add real delivery — otherwise nobody can
verify an account.

---

## 2. Environment variables

| Name | Required | Default on Vercel | Notes |
| --- | --- | --- | --- |
| `ADMIN_KEY` | **Yes** | none — console disabled | Long random string. |
| `UPSTASH_REDIS_REST_URL`<br>`UPSTASH_REDIS_REST_TOKEN` | Recommended | none | Added automatically by the Upstash/Vercel KV integration. `KV_REST_API_URL` / `KV_REST_API_TOKEN` also work. |
| `DEMO_MODE` | No | `true` | Shows verification/reset codes in the browser. |
| `PLATFORM_NAME` | No | `DealVault` | Shown across pages and the console. |
| `CONTACT_EMAIL` | No | `deals@dealvault.app` | Shown in the footer and legal pages. |
| `DATA_DIR` | No | `/tmp/dealvault-data` | Only for a mounted volume; ignore otherwise. |

---

## Option A — GitHub + Vercel dashboard (recommended)

1. Unzip the project somewhere permanent.
2. Create an empty repository and push the folder:

   ```bash
   cd dealvault
   git init
   git add .
   git commit -m "DealVault deal room"
   git branch -M main
   git remote add origin https://github.com/<you>/dealvault.git
   git push -u origin main
   ```

   `data/store.json` ships the demo seed and **must be committed** so a fresh
   deployment starts with the demo portfolio (see "Starting clean" below to
   ship empty instead).

3. In Vercel: **Add New → Project → Import** the repository.
4. Leave the framework preset as **Other**. Do not set a build command or
   output directory; `vercel.json` handles everything.
5. Add the environment variables from the table above (at minimum `ADMIN_KEY`).
6. **Deploy.**
7. Connect Upstash Redis (Storage → Create Database), then redeploy so the new
   variables are picked up.

## Option B — Vercel CLI

```bash
cd dealvault
npx vercel login
npx vercel          # first run: link the project, preview deployment
npx vercel --prod   # production
```

When prompted: framework **Other**, no build command, no output directory.
Add environment variables with `npx vercel env add ADMIN_KEY production`
(or in the dashboard), then run `npx vercel --prod` again.

---

## 3. After the first deploy

1. Open `https://<your-project>.vercel.app/api/health`. You should see
   `"ok": true` and `"storage": "remote"` once Redis is connected
   (`"file"` means you are on `/tmp` and data will not survive).
2. Open `/admin`, sign in with your `ADMIN_KEY`, and check the seeded demo
   portfolio: nine investors, twelve requests, reading history.
3. Walk the investor journey: `/register` → email code (on screen in demo
   mode) → `/projects` → brief → Express interest → `/nda` → sign → the
   request appears in the console queue → approve → the room opens.
4. Revoke or delete the demo investors before inviting real ones
   (`/admin` → investor → Suspend). Seeded emails are listed in README.md.

### Starting with an empty database

The seeded demo loads only when the store is empty. To ship clean, replace the
contents of `data/store.json` with:

```json
{ "version": 1, "meta": { "createdAt": "…", "seeded": true, "lastWritten": null },
  "users": [], "requests": [], "events": [], "questions": [], "audit": [],
  "sessions": {}, "adminSessions": {}, "codes": {} }
```

commit, and redeploy — or, once on Redis, clear the KV key and redeploy.

### Custom domain

Vercel → Project → Settings → Domains → Add. HTTPS is automatic. Sessions are
host-only cookies, so signing in on the new domain is a fresh login.

---

## 4. What to expect

- **Cold starts:** the first request after idle takes a second or two.
- **Rate limits** are held in memory per instance. They slow down abuse but are
  not a hard global limit. Put Vercel's firewall or a WAF rule in front for that.
- **One writer:** the store is a single JSON document; concurrent writes are
  last-write-wins. That is fine for a curated pipeline, not for high-volume
  concurrent use.
- **Demo authentication:** codes are shown in the browser, so anyone who can
  reach the site can create an account and read non-confidential briefs.
  Confidential rooms still require an explicit operator approval — but for a
  real deployment set `DEMO_MODE=false` after adding email delivery, so codes
  are never exposed in the page.

## 5. Updating the site

Assets are versioned with `?v=1`. After editing a stylesheet or script, bump
the number in every HTML page (search for `?v=1`) so browsers refetch.
Commit and push — Vercel redeploys.

## 6. Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| Admin says "disabled" | `ADMIN_KEY` unset | Add it in Settings → Environment Variables, then redeploy. |
| `/api/health` shows `"storage": "file"` | No KV variables | Connect Upstash Redis, redeploy. |
| Accounts disappear after a while | File backend on `/tmp` | Same as above. |
| `/projects` redirects to `/login` | Expected | The showcase is registered-only; sign in first. |
| Room redirects to the brief | Not approved | Approve the request in `/admin` → Requests. |
| Verification code never appears | `DEMO_MODE=false` and no email provider | Set `DEMO_MODE=true` or add email delivery. |
| 404 on `/room/...` | Wrong slug | Slugs are in `server/content.js` (`cafepass-amman`, `sakan`, `nakhlah`). |

## 7. Local use

```bash
npm start        # http://127.0.0.1:4173
npm run demo     # seed demo data, then start
npm run reset    # delete the local store
```

No install step is needed — there are no dependencies.
