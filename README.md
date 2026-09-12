# VitalQR

**Your Medical History, One Scan Away**

A QR-based emergency medical profile system. A first responder scans a code with any phone camera and immediately sees blood group, allergies, chronic conditions, current medications and emergency contacts — no app, no login. Full medical history stays locked behind an OTP sent to the patient's own emergency contact.

> B.Tech CSE (Health Informatics) · VIT Bhopal University · DSN2098 Project Exhibition-I
> Farah Raza (25BHI10027) · Anushka Shukla (25BHI10033) · Ananya P (25BHI10030) · Hritika Kalshetti (25BHI10096)

---

## Quick start

Requires **Node.js 20 or newer**.

```bash
npm run install:all
cp server/.env.example server/.env
npm run seed --prefix server
npm run dev
```

Then open <http://localhost:5173>.

The seed command prints a demo login (`demo@vitalqr.app` / `demo12345`) and a scan URL you can open directly.

Out of the box this runs with **no cloud setup at all**: data goes to a local JSON file and OTP codes print to the server terminal. Switch to Firebase when you are ready — see [Switching to Firebase](#switching-to-firebase).

---

## The four Review-II deliverables

| Deliverable | Where it lives |
|---|---|
| Sign-up and profile form with live validation | `client/src/pages/Signup.jsx`, `client/src/pages/ProfileForm.jsx` |
| Auto-generated QR, downloadable and printable | `client/src/pages/QrPage.jsx`, `server/src/services/qrService.js` |
| Read-only emergency scan page (masked view) | `client/src/pages/Scan.jsx`, `server/src/lib/redact.js` |
| OTP flow unlocking the full history | `server/src/services/otpService.js`, `ProtectedRecord` in `Scan.jsx` |

Plus the **Emergency Decision Card** from the project description — `server/src/lib/decisionCard.js`.

---

## How it works

```
Owner                                    Responder
  |                                          |
  | 1. sign up, fill profile                 |
  v                                          |
React client ---> Express API ---> data store|
  |                    |                     |
  | 2. QR generated    |                     |
  |    (encodes a URL, |                     |
  |     not the data)  |                     |
  v                    |                     |
Printed / worn / saved -------- 3. scan ---->|
                       |                     v
                       |<--- 4. GET /api/scan/:publicId
                       |     returns ONLY the emergency tier
                       |
                       |<--- 5. POST .../otp/request
                       |     code sent to the owner's emergency contact
                       |
                       |<--- 6. POST .../otp/verify
                             full record released, access logged
```

### Why the QR encodes a URL, not the data

Encoding medical data directly into the QR would freeze it at print time and leak it to anyone who photographs the sticker. Encoding a URL means the data stays server-side, edits are reflected instantly by an already-printed code, and the code can be **revoked** by rotating its id.

### The privacy model

Two tiers, enforced in one place:

- **Emergency tier** — visible to anyone with the code. Name, age, blood group, allergies, conditions, medications, emergency contacts, organ-donor status.
- **Protected tier** — needs an OTP. Medical history, past surgeries, insurance, physician, address, exact date of birth.

`server/src/lib/redact.js` builds every public response by **whitelist**, naming the fields it copies out rather than deleting sensitive ones. A blacklist would start leaking the moment somebody adds a field to the schema.

Emergency contact numbers are shown in full, deliberately: a responder who cannot actually call the family has learned nothing.

### Why OTP is not Firebase phone auth

Firebase phone auth signs **in** the person holding the handset. Here a *third party* requests access and a *different person* — the patient's emergency contact — receives the code and approves. That is a different flow, so the challenge is issued and verified in `otpService.js`: 6-digit CSPRNG code, stored only as a salted SHA-256 hash, constant-time comparison, 5-minute TTL, capped attempts, single use.

Firebase is still used for owner login when `AUTH_MODE=firebase`.

---

## Configuration

Everything is driven by `server/.env` (copy from `.env.example`).

| Variable | Options | Notes |
|---|---|---|
| `DATA_STORE` | `memory` \| `firestore` | `memory` writes to `server/.data/db.json`. Zero setup. |
| `AUTH_MODE` | `local` \| `firebase` | `local` issues our own JWTs. |
| `OTP_TRANSPORT` | `console` \| `twilio` | `console` prints the code to the terminal. |
| `PUBLIC_APP_URL` | a URL | **Gets encoded into every QR.** Must be reachable by the scanning phone. |

`client/.env` mirrors `VITE_AUTH_MODE` and holds the Firebase web config.

> **The one setting that matters for a live demo:** `PUBLIC_APP_URL`. If it says `localhost`, the QR only works on the machine running the server — a phone scanning it will fail. The QR page warns you about this on screen.

---

## Switching to Firebase

1. Create a project at <https://console.firebase.google.com>, then enable **Firestore** and **Authentication → Email/Password**.
2. Project settings → Service accounts → *Generate new private key*. Save it as `server/serviceAccountKey.json` (already gitignored — **never commit it**).
3. In `server/.env`: `DATA_STORE=firestore`, `AUTH_MODE=firebase`.
4. Project settings → Your apps → Web app. Copy the config into `client/.env` as the `VITE_FIREBASE_*` values, and set `VITE_AUTH_MODE=firebase`.
5. Deploy the rules:

```bash
firebase deploy --only firestore:rules
```

`firebase/firestore.rules` denies all direct client access on purpose — every read goes through the API so redaction cannot be bypassed. That file is the enforcement point for the whole privacy model.

---

## The hosted card (`artifact/`)

`artifact/vitalqr-card.html` is a second, self-contained build published as a Claude Artifact, so there is something scannable on a real phone without deploying anything.

It exists because a published artifact that declares the `db` capability **cannot be shared publicly** — every viewer would need to sign in, which defeats the whole premise. So this build has no backend at all: the profile is deflated, base64url-encoded and carried **inside the QR's URL fragment** (a fragment is never sent to any server).

What that changes, deliberately:

| | Server build (`server/` + `client/`) | Hosted card (`artifact/`) |
|---|---|---|
| Where data lives | Firestore, server-side | Inside the QR itself |
| Edit after printing | Yes — same code keeps working | No — reprint required |
| Anyone who photographs the code | Sees only the emergency tier | Holds the emergency tier |
| Protected tier | OTP to the emergency contact, released server-side | AES-GCM encrypted with a PIN, decrypted in the browser |
| Revocation | Rotate the publicId | Not possible |

The PIN gate is real cryptography (PBKDF2, 310k iterations, AES-GCM), not a hidden element — but a 6-digit PIN is brute-forceable offline by whoever holds the card, which is exactly the argument for keeping that tier on a server. The page says so on screen, and is labelled a prototype throughout.

Use the server build for the report and the security discussion; use the hosted card for a booth demo where there is no laptop or network to rely on.

## Deploying

**Step-by-step instructions are in [DEPLOY.md](DEPLOY.md).** Render hosts the API (`render.yaml`), Vercel hosts the client (`client/vercel.json`), Firestore stores the data. Free tiers throughout.

The QR must resolve over HTTPS on a stranger's phone, so both halves have to be public. The setting that decides this is `PUBLIC_APP_URL` — it is encoded into every QR code, so it must be your deployed client domain. With `NODE_ENV=production` the server refuses to boot on an insecure `JWT_SECRET` or a non-HTTPS `PUBLIC_APP_URL`, which catches the common mistake of shipping codes that point at `localhost`.

Two free-tier facts worth knowing before a demo: **Render sleeps after 15 minutes idle** and takes ~50 s to wake, and **`DATA_STORE` must be `firestore` in production** because Render's disk is ephemeral and the `memory` store would be wiped on every deploy.

## Install it as an app

The client is a progressive web app — manifest, service worker and icon set under `client/public/`.

There is no app-store build; "Install the app" installs the web app. Chrome and Edge get a real install button, iOS Safari gets the Share → Add to Home Screen instruction, and the button hides itself entirely when neither applies rather than doing nothing when tapped.

The service worker caches the app shell and hashed build assets, and **never caches anything under `/api/`**. A responder reading a stale allergy list out of a cache is the exact failure this project exists to prevent; the documented answer to "no internet" stays the printed fallback card.

---

## API

| Method | Endpoint | Auth | Purpose |
|---|---|---|---|
| `GET` | `/api/health` | — | Config sanity check |
| `POST` | `/api/auth/signup` | — | Create account (local mode) |
| `POST` | `/api/auth/login` | — | Sign in (local mode) |
| `GET` | `/api/profile` | owner | Profile + QR + decision card |
| `PUT` | `/api/profile/emergency` | owner | Save the public tier |
| `PUT` | `/api/profile/private` | owner | Save the protected tier |
| `POST` | `/api/profile/rotate-qr` | owner | Revoke and reissue the code |
| `GET` | `/api/profile/audit` | owner | Access log |
| `GET` | `/api/qr/download.png\|svg` | owner | Printable QR |
| `GET` | `/api/scan/:publicId` | **none** | Emergency tier only |
| `POST` | `/api/scan/:publicId/otp/request` | **none** | Send code to a contact |
| `POST` | `/api/scan/:publicId/otp/verify` | **none** | Unlock the full record |

---

## Safety and limitations

Carried over from the Review-I safety slide, and implemented rather than just stated:

- **A decision aid, not a diagnosis.** Decision Card rules are prompts and cautions, never prescriptions or doses.
- **Blood group must still be crossmatched** before transfusion. Shown on the card and in the API response.
- **Stale data is the main clinical risk.** Every scan shows a "last updated" badge, and a profile older than a year gets an explicit warning banner.
- **No internet?** The scan page prints a fallback card carrying the same emergency fields.
- **Code copied or photographed?** Public scans still expose only the emergency tier, and the owner can revoke the code from the QR page.
- **Emergency contact unavailable?** Critical fields stay readable without any OTP.
- **Consent and access logs.** Every scan, OTP request and unlock is written to the owner's audit log, visible on the dashboard.

---

## Project layout

```
VitalQR/
  server/
    src/
      config/      env + firebase admin bootstrap
      store/       memoryStore | firestoreStore behind one interface
      lib/         ids, validation, decisionCard, redact  <- privacy tiering
      middleware/  auth (local JWT or Firebase ID token), errors
      routes/      auth, profile, scan (public), qr
      services/    qrService, otpService, notify (console | twilio)
      seed.js      demo profile for the exhibition
  client/
    src/
      pages/       Landing, Signup, Login, Dashboard, ProfileForm, QrPage, Scan
      components/  ui, Layout, DecisionCard, RepeatableList
      lib/auth/    localAuth | firebaseAuth behind one interface
  firebase/
    firestore.rules
```
