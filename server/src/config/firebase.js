import fs from 'node:fs';
import path from 'node:path';
import { initializeApp, cert, getApps, applicationDefault } from 'firebase-admin/app';
import { env } from './env.js';

/**
 * Lazily initialises the Firebase Admin SDK. Only reached when
 * DATA_STORE=firestore or AUTH_MODE=firebase, so a local memory-mode run
 * never needs credentials on disk.
 */

let app = null;

export function getFirebaseApp() {
  if (app) return app;
  if (getApps().length) {
    app = getApps()[0];
    return app;
  }

  // 1) Whole service account in one env var. This is the deployment path:
  //    Render and Vercel have no persistent disk to hold a key file.
  if (env.firebaseServiceAccountJson) {
    const raw = env.firebaseServiceAccountJson.trim();
    let parsed;
    try {
      // Accept base64 too, since dashboards often mangle the embedded
      // newlines in a private key when pasted as raw JSON.
      const text = raw.startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8');
      parsed = JSON.parse(text);
    } catch {
      throw new Error(
        'FIREBASE_SERVICE_ACCOUNT_JSON is set but is not valid JSON (or base64-encoded JSON). ' +
          'Paste the entire service account file contents, or base64-encode it first.'
      );
    }
    app = initializeApp({
      credential: cert(parsed),
      projectId: parsed.project_id || env.firebaseProjectId || undefined,
    });
    return app;
  }

  // 2) A key file on disk. The local development path.
  const credPath = env.googleCredentials
    ? path.resolve(process.cwd(), env.googleCredentials)
    : '';

  if (credPath && fs.existsSync(credPath)) {
    const serviceAccount = JSON.parse(fs.readFileSync(credPath, 'utf8'));
    app = initializeApp({
      credential: cert(serviceAccount),
      projectId: serviceAccount.project_id || env.firebaseProjectId || undefined,
    });
  } else {
    // Falls back to GOOGLE_APPLICATION_CREDENTIALS resolved by the SDK, or
    // to the ambient identity when deployed on Google infrastructure.
    try {
      app = initializeApp({
        credential: applicationDefault(),
        projectId: env.firebaseProjectId || undefined,
      });
    } catch (err) {
      throw new Error(
        'Firebase credentials not found. Locally: download a service account key from ' +
          'Firebase Console > Project settings > Service accounts, save it as ' +
          'server/serviceAccountKey.json and set GOOGLE_APPLICATION_CREDENTIALS in server/.env. ' +
          'When deployed: set FIREBASE_SERVICE_ACCOUNT_JSON to the whole file contents instead. ' +
          `Original error: ${err.message}`
      );
    }
  }

  return app;
}
