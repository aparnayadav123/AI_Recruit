# RecruitAI — Cloud Deployment Runbook

Goal: get RecruitAI off the home computer and always-on, so the OryFolks Careers page
(`oryfolks.com/careers`) can reliably fetch published jobs.

**Root cause (confirmed):** the Careers page fetches live from the RecruitAI backend at
`RECRUITAI_API_URL` (currently `http://localhost:8089` — a home machine that's offline).
The integration itself is correct; it just needs reliable hosting.

The code is now deployment-ready. What's left is creating the cloud services and wiring
three URLs together. Order matters — do the steps top to bottom.

---

## What was changed in the code (already done)

| File | Change |
|------|--------|
| `backend/src/main/resources/application.properties` | `server.port=${PORT:8089}`, `spring.data.mongodb.uri=${MONGODB_URI:…}`, `spring.data.mongodb.database=${MONGODB_DATABASE:RecruitAI}` — reads host + DB from env vars. |
| `backend/Dockerfile` + `.dockerignore` | Container image Render builds & runs. |
| `render.yaml` | Render Blueprint for the backend service. |
| `src/api.ts` | API base is now `VITE_API_BASE_URL` (falls back to `/api` locally). |
| `vercel.json` | Vercel build + SPA routing for the recruiter dashboard. |

Local development is unchanged — with none of these env vars set, everything runs exactly as before.

---

## Step 1 — Database: MongoDB Atlas

You already have an Atlas cluster (used by the OryFolks site: `oryfolks.obbgnyd.mongodb.net`).
Reuse it — RecruitAI will live in its own `RecruitAI` database on the same cluster.

1. Atlas → **Network Access** → add `0.0.0.0/0` (allow from anywhere), so Render can connect.
2. Atlas → **Database Access** → confirm a user exists with read/write (the OryFolks one works).
3. Copy the connection string. It looks like:
   ```
   mongodb+srv://<user>:<password>@oryfolks.obbgnyd.mongodb.net/?retryWrites=true&w=majority
   ```
   Keep this handy — it's the `MONGODB_URI` for Step 2.

> Prefer isolation? Create a brand-new free cluster instead and use its string. Either works.

---

## Step 2 — Backend: Render

1. Push this repo to GitHub (if not already).
2. Render → **New → Blueprint** → connect this repo. It auto-detects `render.yaml`.
3. When prompted, set the env vars:
   - `MONGODB_URI` = the Atlas string from Step 1
   - `MONGODB_DATABASE` = `RecruitAI` (already defaulted in the blueprint)
   - `GEMINI_API_KEY` = *(optional; leave blank — the app falls back to the deterministic parser)*
4. Deploy. First build takes a few minutes (Maven downloads dependencies).
5. When live, note the URL, e.g. **`https://recruitai-backend.onrender.com`**.
6. Verify:
   - `https://recruitai-backend.onrender.com/api/health` → `200`
   - `https://recruitai-backend.onrender.com/api/jobs/public` → JSON array

> ⚠️ **Free-tier cold start.** Render's free plan sleeps a service after ~15 min idle; the next
> request then waits ~50s while it wakes. Because the Careers page fetches jobs through a Vercel
> serverless function (which times out at ~10s), a cold backend can make the page show no jobs.
> **Mitigation (recommended):** keep it warm with a free cron ping to `/api/health` every 10 min
> (e.g. cron-job.org or UptimeRobot). Or use Render's paid Starter plan (always-on).

---

## Step 3 — Recruiter dashboard: Vercel

1. Vercel → **New Project** → import this repo.
2. Framework preset: **Vite** (auto-detected via `vercel.json`).
3. Add env var:
   - `VITE_API_BASE_URL` = `https://recruitai-backend.onrender.com/api`  *(your Step-2 URL + `/api`)*
4. Deploy. Recruiters can now log in from anywhere and create/publish jobs.

> CORS is already open for any origin, so the dashboard talks to the Render backend without extra config.

---

## Step 4 — Point the OryFolks Careers page at the new backend

The Careers site (separate project, already on Vercel) reads the backend URL from `RECRUITAI_API_URL`.

1. In the **OryFolks** Vercel project → Settings → Environment Variables:
   - `RECRUITAI_API_URL` = `https://recruitai-backend.onrender.com`  *(no trailing slash, no `/api`)*
2. **Redeploy** the OryFolks project so the change takes effect.
3. (Local dev only) update `OryFolks/project/api/.env` the same way if testing locally.

---

## Step 5 — End-to-end test

1. Open the recruiter dashboard (Vercel URL) → log in → create a job → **Publish to Careers**.
2. Open `https://oryfolks.com/careers` → the job appears within seconds.
3. If it doesn't: check `…onrender.com/api/jobs/public` returns the job (backend OK), then confirm
   the OryFolks `RECRUITAI_API_URL` matches and was redeployed.

---

## Security note

The OryFolks `api/.env` currently holds a plaintext Atlas password and SendGrid key. If that repo is
public or shared, rotate those credentials and keep them only in the host's env-var settings.
