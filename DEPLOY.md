# Deploying VitalQR

Render hosts the API, Vercel hosts the React client, Firebase stores the data. Free tiers throughout.

You have to do the account steps yourself — signing up and authorising deployments needs your credentials. Everything else is already configured in `render.yaml` and `client/vercel.json`.

---

## The one thing to understand first

**`PUBLIC_APP_URL` is baked into every QR code your users generate.**

Point it at your Vercel domain. If it says `localhost`, every printed sticker, wristband and lock-screen image leads nowhere on someone else's phone. Change it later and every code already printed keeps working — the code encodes a URL, and that URL is on *your* domain.

This creates a chicken-and-egg: the API needs the client's URL, and the client needs the API's URL. Resolve it by deploying the API first with a placeholder, then coming back. Steps below do this in order.

---

## 1. Push to GitHub

```bash
cd VitalQR
git init
git add .
git commit -m "VitalQR: emergency medical QR profile system"
```

Create an empty repo on GitHub, then:

```bash
git remote add origin https://github.com/<you>/vitalqr.git
git branch -M main
git push -u origin main
```

`.gitignore` already excludes `node_modules/`, `.env`, `server/.data/` and any `serviceAccountKey.json`. **Confirm your service account key is not in the commit** before pushing — it grants full access to your Firebase project.

---

## 2. Firebase

1. <https://console.firebase.google.com> → **Add project**.
2. **Build → Firestore Database → Create database** → production mode, region `asia-south1` (Mumbai) for lowest latency in India.
3. **Build → Authentication → Get started → Email/Password → Enable.**
4. **Project settings (gear) → Service accounts → Generate new private key.** A JSON file downloads. Keep it; never commit it.
5. **Project settings → General → Your apps → Web (`</>`)** → register an app → copy the `firebaseConfig` values. You need these in step 4.

Deploy the security rules (they deny all direct client access, which is the point — every read goes through the API so redaction can't be bypassed):

```bash
npm install -g firebase-tools
firebase login
firebase deploy --only firestore:rules
```

---

## 3. Render — the API

1. <https://render.com> → sign in with GitHub → **New → Blueprint** → pick your repo. It reads `render.yaml` automatically.
2. Render will ask for the values marked `sync: false`. Set:

| Variable | Value |
|---|---|
| `FIREBASE_SERVICE_ACCOUNT_JSON` | The **entire contents** of the JSON file from step 2.4 |
| `FIREBASE_PROJECT_ID` | e.g. `vitalqr-prod` |
| `PUBLIC_APP_URL` | `https://vitalqr.vercel.app` — a placeholder for now, corrected in step 5 |
| `CORS_ORIGINS` | Same placeholder |

Leave the Twilio fields blank unless you want real SMS.

3. Deploy. Note the URL, e.g. `https://vitalqr-api.onrender.com`.
4. Check it: opening `https://vitalqr-api.onrender.com/api/health` should return JSON showing `"dataStore":"firestore"`.

> **If the private key breaks on paste.** Render's dashboard sometimes mangles the `\n` sequences inside `private_key`. Base64-encode the file and paste that instead — the server accepts either:
>
> ```bash
> base64 -w0 serviceAccountKey.json
> ```

---

## 4. Vercel — the client

1. <https://vercel.com> → **Add New → Project** → import the repo.
2. **Set Root Directory to `client`.** This matters; without it Vercel builds the repo root and finds nothing.
3. Framework preset: Vite (auto-detected from `vercel.json`).
4. Environment Variables:

| Variable | Value |
|---|---|
| `VITE_API_URL` | Your Render URL from step 3 |
| `VITE_AUTH_MODE` | `firebase` |
| `VITE_FIREBASE_API_KEY` | from step 2.5 |
| `VITE_FIREBASE_AUTH_DOMAIN` | from step 2.5 |
| `VITE_FIREBASE_PROJECT_ID` | from step 2.5 |
| `VITE_FIREBASE_STORAGE_BUCKET` | from step 2.5 |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | from step 2.5 |
| `VITE_FIREBASE_APP_ID` | from step 2.5 |

5. Deploy. Note the URL, e.g. `https://vitalqr.vercel.app`.
6. Back in **Firebase → Authentication → Settings → Authorized domains**, add that Vercel domain or sign-in will be rejected.

---

## 5. Close the loop

In Render → your service → **Environment**, correct both values to the real Vercel domain:

```
PUBLIC_APP_URL = https://vitalqr.vercel.app
CORS_ORIGINS   = https://vitalqr.vercel.app
```

Save. Render redeploys.

**Now verify properly, on a phone, before printing anything:**

1. Sign up on the Vercel URL, fill a profile, open **My QR**.
2. The scan link shown on that page must start with your Vercel domain — not `localhost`, not `claude.ai`.
3. Scan the code with a different phone's camera, ideally on mobile data rather than your wifi.
4. The emergency profile should open with no login.

---

## Free-tier limits worth knowing

**Render sleeps after 15 minutes idle.** The next request takes roughly 50 seconds to wake the service. For an app whose entire premise is the golden hour, that is a real problem, and worth saying out loud in your viva rather than hoping nobody scans a cold profile at the exhibition.

Mitigations, in order of honesty:

- Before a demo, open the app yourself to warm it up, and keep a tab open.
- Point a free uptime monitor (UptimeRobot, cron-job.org) at `/api/health` every 10 minutes. This keeps it warm within the free tier's spirit but does consume your monthly instance hours.
- For production, Render's paid tier removes sleeping entirely.

**Firestore free tier** allows 50k reads and 20k writes a day — far beyond anything an exhibition will produce.

**Vercel** serves the static client from its CDN and never sleeps.

---

## Installing it as an app

The client is a progressive web app: `client/public/manifest.webmanifest`, a service worker, and a full icon set.

- **Android / Chrome / Edge** — an "Install the app" button appears on the landing page and on any scanned profile.
- **iOS Safari** — Apple fires no install event, so the same button explains the Share → **Add to Home Screen** route instead.

The service worker caches the app shell and the hashed build assets only. **It never caches `/api/` responses.** A responder reading a stale allergy list from a cache is precisely the failure this project exists to prevent; the documented answer to "no internet" remains the printed fallback card.

Installability needs HTTPS, which both Vercel and Render provide by default.

---

## If something breaks

| Symptom | Cause |
|---|---|
| QR opens `localhost` | `PUBLIC_APP_URL` never corrected in step 5 |
| "Cannot reach the VitalQR server" | `VITE_API_URL` wrong, or Render asleep — wait 50s and retry |
| CORS error in the console | `CORS_ORIGINS` doesn't exactly match the Vercel origin (no trailing slash) |
| `auth/unauthorized-domain` on sign-in | Vercel domain missing from Firebase authorized domains |
| Profiles vanish after a redeploy | `DATA_STORE` is still `memory`; Render's disk is ephemeral. Set it to `firestore` |
| Deep links 404 on refresh | Root Directory isn't `client`, so `vercel.json` rewrites never loaded |
| Install button never appears | Not HTTPS, already installed, or a browser without install support |
