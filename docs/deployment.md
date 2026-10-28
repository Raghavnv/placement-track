# Deployment

| Part | Host | Free tier notes |
|---|---|---|
| API (`server/`) | **Render** web service | Sleeps after 15 min idle; the first request then takes ~30-60 s |
| Client (`client/`) | **Vercel** | Preview deployment for every PR |
| Database | **MongoDB Atlas** (M0 free) | Render cannot reach the MongoDB on your laptop, so production needs Atlas |

Order: **Atlas → Render → Vercel → update `CLIENT_URL` on Render → create the admin.**

Both Render and Vercel deploy the `main` branch, so a feature only goes live after its PR is merged.

---

## 1. MongoDB Atlas

1. Sign up at <https://www.mongodb.com/cloud/atlas/register> and create a **free M0** cluster (region: Mumbai `ap-south-1` or the closest one to your Render region).
2. **Database Access → Add user**: choose a username and click *Autogenerate Secure Password*. Save the password somewhere safe.
3. **Network Access → Add IP Address → Allow access from anywhere (`0.0.0.0/0`)**. Render's free tier has no fixed IP address, so this is required.
4. **Connect → Drivers** and copy the connection string. Put your password in it and add the database name `placement-track` before the `?`:
   ```
   mongodb+srv://<user>:<password>@<cluster>.mongodb.net/placement-track?retryWrites=true&w=majority
   ```
   If the password contains `@ : / ? #`, URL-encode those characters (e.g. `@` → `%40`).

## 2. Render (API)

1. <https://dashboard.render.com> → **New → Blueprint** → connect GitHub → pick `placement-track`. Render reads `render.yaml`.
2. When asked, fill in these variables (see the table below): `MONGO_URI` (from step 1) and `CLIENT_URL` (use `http://localhost:5173` for now and come back after Vercel).
3. Deploy. Check `https://<service>.onrender.com/api/health` → `{"status":"ok"}`.

### Render environment variables

| Key | Value | Set by |
|---|---|---|
| `NODE_ENV` | `production` | `render.yaml` |
| `NODE_VERSION` | `22` | `render.yaml` |
| `JWT_EXPIRES_IN` | `7d` | `render.yaml` |
| `JWT_SECRET` | random 64-char string | `render.yaml` (`generateValue`) |
| `MONGO_URI` | Atlas connection string from step 1 | **you** |
| `CLIENT_URL` | `https://<your-app>.vercel.app,https://<your-app>-*.vercel.app` | **you** (after step 3) |
| `PORT` | do not set it | Render sets it automatically |

`CLIENT_URL` is a comma-separated list of allowed CORS origins. `*` matches one part of the domain name, so `https://placement-track-*.vercel.app` also allows Vercel preview deployments.

Not using the blueprint? Create a **Web Service** manually with *Root Directory* `server`, *Build Command* `npm ci`, *Start Command* `npm start`, *Health Check Path* `/api/health`, and add every variable in the table yourself. For `JWT_SECRET`, generate one with:
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

## 3. Vercel (client)

1. <https://vercel.com/new> → import `placement-track`.
2. **Root Directory: `client`**. Vercel detects Vite automatically (build `npm run build`, output `dist`).
3. Add these environment variables (for both Production and Preview):

| Key | Value |
|---|---|
| `VITE_API_BASE_URL` | `https://<service>.onrender.com/api` |
| `VITE_REMINDER_DAYS` | `3` |

4. Deploy. `client/vercel.json` rewrites every route to `index.html`, so refreshing `/student/drives` works.

> `VITE_` variables are built into the JavaScript bundle and are public. Never put secrets in Vercel's client variables.
> After changing a Vercel variable, **redeploy**: Vite reads them at build time, not at runtime.

## 4. Point Render at Vercel

Back in Render → your service → **Environment**, set `CLIENT_URL` to your Vercel URL(s) and save. Render restarts the service.

## 5. Create the admin (and optional demo data)

Render's free plan has no shell, so run the scripts **from your laptop** against Atlas:

```bash
cd server

# Only the placement officer account (safe; never deletes data)
MONGO_URI="<atlas-uri>" ADMIN_SEED_EMAIL="officer@yourcollege.edu" ADMIN_SEED_PASSWORD="<strong password>" \
  NODE_ENV=production npm run seed:admin

# OR full demo data for presentations: WIPES the database, then adds an admin, 12 students, 8 drives and 29 applications
MONGO_URI="<atlas-uri>" ADMIN_SEED_PASSWORD="<strong password>" npm run seed
```

## Checklist

- [ ] `/api/health` on Render returns `ok`
- [ ] Logging in from the Vercel site works (if not: the browser console shows a CORS error → check `CLIENT_URL` has no trailing slash and matches exactly)
- [ ] Student register → apply → admin moves stage → student sees the card move
- [ ] No `.env` file is committed (`git ls-files | grep .env` shows only `.env.example`)
