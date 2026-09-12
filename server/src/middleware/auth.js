import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { getStore } from '../store/index.js';
import { ApiError } from './errors.js';

/**
 * Two auth modes behind one middleware:
 *
 *   AUTH_MODE=local     this server signs and verifies its own JWTs.
 *                       Zero setup, good for development and offline demos.
 *   AUTH_MODE=firebase  the React client signs in with the Firebase Auth
 *                       SDK and sends the ID token; we verify it here with
 *                       the Admin SDK. This is the deployment path.
 *
 * Either way, downstream routes just read req.user.uid.
 */

export function signLocalToken(user) {
  return jwt.sign({ sub: user.uid, email: user.email }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
  });
}

function bearerFrom(req) {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) return null;
  const token = header.slice(7).trim();
  return token || null;
}

async function verifyToken(token) {
  if (env.authMode === 'firebase') {
    const { getAuth } = await import('firebase-admin/auth');
    const { getFirebaseApp } = await import('../config/firebase.js');
    const decoded = await getAuth(getFirebaseApp()).verifyIdToken(token);
    return { uid: decoded.uid, email: decoded.email || '' };
  }

  const decoded = jwt.verify(token, env.jwtSecret);
  return { uid: decoded.sub, email: decoded.email || '' };
}

/** Hard gate: 401 unless a valid token is present. */
export async function requireAuth(req, _res, next) {
  try {
    const token = bearerFrom(req);
    if (!token) throw new ApiError(401, 'Sign in to continue');

    const user = await verifyToken(token);

    if (env.authMode === 'firebase') {
      // First API call after a Firebase sign-up: mirror the account locally
      // so profiles/{uid} always has a users/{uid} alongside it.
      const store = getStore();
      const existing = await store.getUserById(user.uid);
      if (!existing) {
        await store.createUser({ uid: user.uid, email: user.email, displayName: '' });
      }
    }

    req.user = user;
    next();
  } catch (err) {
    if (err instanceof ApiError) return next(err);
    next(new ApiError(401, 'Your session has expired. Please sign in again.'));
  }
}

/** Soft gate: attaches req.user when a token is present, never rejects. */
export async function optionalAuth(req, _res, next) {
  const token = bearerFrom(req);
  if (!token) return next();
  try {
    req.user = await verifyToken(token);
  } catch {
    // An invalid token on a public route is simply ignored.
  }
  next();
}
