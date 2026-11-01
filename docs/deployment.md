# Deployment guide: Vercel + Render + MongoDB Atlas

> **Status:** nothing has been deployed from the build environment, so these steps are written from the project's configuration and the platforms' standard behaviour, not from a live run. Dashboards change names and layouts; if a button differs, follow the platform's current docs. Do the smoke test at the end and note anything that differs.

Order matters: **Atlas (database) -> Render (API) -> Vercel (web app) -> point the API's CORS at Vercel -> seed -> smoke test.**

```
Browser --https--> Vercel (React app, static)
   |  REST + WebSocket (https/wss)
   v
Render (Express + Socket.io + cron) --TLS--> MongoDB Atlas
```

## 0. Before you start

- Code pushed to GitHub (Vercel and Render deploy from the repo).
- Generate two **different** secrets and keep them somewhere safe:
  ```bash
  node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"   # run twice
  ```
  One becomes `JWT_SECRET`, the other `OTP_SECRET`. Never commit them.

## 1. MongoDB Atlas

1. Create a free **M0** cluster. Choose a region close to your users (Mumbai, `ap-south-1`, for India) and the same region you pick on Render if possible.
2. **Database Access** -> add a database user with a strong generated password. Keep the password handy.
3. **Network Access** -> Render's free instances do not have fixed outbound IP addresses, so the simple option is to allow `0.0.0.0/0`. This is acceptable for a demo only because the connection needs the strong password and is TLS-encrypted; for production use a plan with static outbound IPs and allow only those.
4. **Connect -> Drivers** -> copy the `mongodb+srv://...` string. Replace `<password>` with the password (URL-encode special characters such as `@` -> `%40`) and add the database name before the `?`:
   ```
   mongodb+srv://slotdrop_user:PASSWORD@cluster0.xxxxx.mongodb.net/slotdrop?retryWrites=true&w=majority
   ```

## 2. Render (API)

1. **New -> Web Service** -> connect the GitHub repo.
2. Settings:

   | Field | Value |
   |---|---|
   | Root Directory | `server` |
   | Runtime | Node |
   | Build Command | `npm install` |
   | Start Command | `npm start` |
   | Health Check Path | `/api/health` |

3. **Environment variables**

   | Key | Value |
   |---|---|
   | `NODE_VERSION` | `22` |
   | `NODE_ENV` | `production` |
   | `MONGODB_URI` | the Atlas string from step 1 |
   | `JWT_SECRET` | secret #1 |
   | `OTP_SECRET` | secret #2 (must differ from `JWT_SECRET`) |
   | `CLIENT_ORIGIN` | your Vercel URL, e.g. `https://slotdrop.vercel.app` (**no trailing slash**). Set it after step 3, then redeploy |

   The server refuses to start in production if `JWT_SECRET` or `OTP_SECRET` is missing.
4. Deploy. When it is live, open `https://<your-service>.onrender.com/api/health`. You should see `{"data":{"status":"ok"}}`.
5. On the first boot against an empty database, the server creates default hourly slot windows (9 AM to 9 PM) and seven days of slots by itself. Admins can change the windows later from the dashboard.

## 3. Vercel (web app)

1. **Add New -> Project** -> import the same repo.
2. Settings:

   | Field | Value |
   |---|---|
   | Root Directory | `client` |
   | Framework Preset | Vite (auto-detected) |
   | Build Command | `npm run build` |
   | Output Directory | `dist` |

3. **Environment variables** (these are read at build time, so changing them needs a redeploy):

   | Key | Value |
   |---|---|
   | `VITE_API_MODE` | `api` |
   | `VITE_API_URL` | `https://<your-service>.onrender.com` (no trailing slash, **no** `/api`) |

4. Deploy. `client/vercel.json` already rewrites every path to `index.html`, so refreshing on `/history` or `/admin` works.
5. Go back to Render and set `CLIENT_ORIGIN` to the exact Vercel URL, then redeploy the API.

> CORS and Socket.io accept **one** origin. Vercel *preview* deployments have different URLs and will be blocked; test on the production URL (or add a custom domain and use that).

## 4. Load demo data (optional, demo databases only)

The seed script **wipes** the database. Never run it against real data. Render's free tier has no shell, so run it from your own machine, pointed at Atlas:

```bash
cd server
npm install
MONGODB_URI="mongodb+srv://...your Atlas string..." JWT_SECRET=anything OTP_SECRET=anything npm run seed
```

(The two secrets are only needed because the config loader insists on them; seeding does not use them.) It prints the demo logins. Password for all: `SlotDrop@123`.

If you run it with `NODE_ENV=production` it will refuse unless you add `-- --force`, as a guard against wiping a real database.

For a real society, skip the seed: sign in as an admin you create yourself (insert one admin, or run the seed once and then change/deactivate the demo accounts), add flats, then add people from the **People** screen.

## 5. Smoke test (about 10 minutes)

| # | Check | Expected |
|---|---|---|
| 1 | `GET <api>/api/health` | `{"data":{"status":"ok"}}` |
| 2 | Open the Vercel URL, sign in as the guard | Lands on "Log a parcel"; no CORS errors in the browser console |
| 3 | Log a parcel for `A-1204` (Amazon, shelf S-05) | Success toast |
| 4 | In a second tab or phone, sign in as `priya.sharma@slotdrop.in` | The new parcel is there **without refreshing**, with a notification (this proves WebSockets work) |
| 5 | Choose a slot -> confirm | Pass with QR, OTP and countdown |
| 6 | Guard -> Handover -> enter flat `A-1204` + the OTP | Full-screen green "Release the parcel" |
| 7 | Enter the same OTP again | Red "Do not release" |
| 8 | Admin -> Dashboard | Charts render; changing the date range updates everything |
| 9 | On a phone: Guard -> Handover -> Scan QR | Camera permission prompt, then a successful scan (camera needs HTTPS, which Vercel provides) |
| 10 | Run the server tests where MongoDB is available: `cd server && npm test` | All suites pass; record the output for your report |

## 6. Troubleshooting

| Symptom | Likely cause and fix |
|---|---|
| Browser console: CORS error | `CLIENT_ORIGIN` on Render does not exactly match the page's origin (scheme, host, no trailing slash, no preview URL). Fix and redeploy the API |
| Login says "Cannot reach SlotDrop" | `VITE_API_URL` missing or wrong (it is build-time: redeploy Vercel after changing it) |
| Live updates never arrive | WebSocket blocked or `VITE_API_URL` points to the wrong host. Check the Network tab for `socket.io` requests; check Render logs |
| Server crashes on start: "JWT_SECRET and OTP_SECRET must be set" | Env vars missing on Render |
| `MongooseServerSelectionError` / timeout | Atlas Network Access does not allow Render, or the password is not URL-encoded |
| First request after a while takes 30-60 s | Free Render instances sleep when idle. For demo day, open the app a few minutes early or use a paid instance |
| Reminders ("uncollected for 48 hours") never fire | The cron job runs inside the web process; a sleeping instance misses it. Use an always-on instance, or call a scheduled endpoint from an external scheduler (future work) |
| Parcel photos vanish after a redeploy | Render's disk is ephemeral. Move uploads to Cloudinary or S3 by replacing `server/src/services/storageService.js` |
| `npm run seed` refuses to run | `NODE_ENV=production` is set; add `-- --force` only on a demo database |
| 404 when refreshing a page on Vercel | `client/vercel.json` missing from the deployed root directory |

## 7. Before you share the link

- The demo accounts and the password `SlotDrop@123` are public (they are in the README). Do not leave a seeded database reachable if it holds anything real; for a real society, deactivate them.
- Use long random secrets; rotating `JWT_SECRET` signs everyone out, rotating `OTP_SECRET` invalidates all unused OTPs and QR codes.
- Keep `.env` files out of git (the `.gitignore` already excludes them); only `.env.example` is committed.
