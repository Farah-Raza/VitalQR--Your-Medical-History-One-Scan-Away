import { getFirestore } from 'firebase-admin/firestore';
import { getFirebaseApp } from '../config/firebase.js';
import { newPublicId } from '../lib/ids.js';

/**
 * Firestore-backed store (production path).
 * ------------------------------------------------------------------
 * All access goes through the Admin SDK on the server. The client never
 * talks to Firestore directly, and firestore.rules denies every client
 * read/write, so the public scan endpoint stays the only way in and the
 * redaction in lib/redact.js cannot be bypassed.
 *
 * Collections:
 *   users/{uid}               profile owner account metadata
 *   profiles/{uid}            { publicId, emergency:{...}, private:{...} }
 *   publicIndex/{publicId}    { uid }  - O(1) scan lookup, no query index
 *   otpSessions/{sessionId}   short-lived OTP challenges
 *   profiles/{uid}/audit/*    append-only change log
 */

let dbInstance = null;

function db() {
  if (!dbInstance) {
    dbInstance = getFirestore(getFirebaseApp());
  }
  return dbInstance;
}

export const firestoreStore = {
  name: 'firestore',

  async init() {
    db();
    return this;
  },

  // ---- users ---------------------------------------------------------
  async createUser({ email, passwordHash, displayName, uid }) {
    const ref = uid ? db().collection('users').doc(uid) : db().collection('users').doc();
    const user = {
      uid: ref.id,
      email: String(email).toLowerCase(),
      passwordHash: passwordHash || null,
      displayName: displayName || '',
      createdAt: new Date().toISOString(),
    };
    await ref.set(user);
    return user;
  },

  async getUserByEmail(email) {
    const snap = await db()
      .collection('users')
      .where('email', '==', String(email).toLowerCase())
      .limit(1)
      .get();
    return snap.empty ? null : snap.docs[0].data();
  },

  async getUserById(uid) {
    const snap = await db().collection('users').doc(uid).get();
    return snap.exists ? snap.data() : null;
  },

  // ---- profiles ------------------------------------------------------
  async getProfile(uid) {
    const snap = await db().collection('profiles').doc(uid).get();
    return snap.exists ? snap.data() : null;
  },

  async saveProfile(uid, { emergency, private: priv }) {
    const ref = db().collection('profiles').doc(uid);
    const now = new Date().toISOString();
    const snap = await ref.get();

    if (snap.exists) {
      const patch = { updatedAt: now };
      if (emergency !== undefined) patch.emergency = emergency;
      if (priv !== undefined) patch.private = priv;
      await ref.set(patch, { merge: true });
    } else {
      const publicId = newPublicId();
      await ref.set({
        uid,
        publicId,
        emergency: emergency || {},
        private: priv || {},
        createdAt: now,
        updatedAt: now,
      });
      await db().collection('publicIndex').doc(publicId).set({ uid, createdAt: now });
    }

    return (await ref.get()).data();
  },

  async getProfileByPublicId(publicId) {
    const idx = await db().collection('publicIndex').doc(publicId).get();
    if (!idx.exists) return null;
    const { uid } = idx.data();
    const snap = await db().collection('profiles').doc(uid).get();
    return snap.exists ? snap.data() : null;
  },

  async rotatePublicId(uid) {
    const ref = db().collection('profiles').doc(uid);
    const snap = await ref.get();
    if (!snap.exists) return null;

    const oldId = snap.data().publicId;
    const publicId = newPublicId();
    const now = new Date().toISOString();

    const batch = db().batch();
    batch.set(ref, { publicId, updatedAt: now }, { merge: true });
    batch.set(db().collection('publicIndex').doc(publicId), { uid, createdAt: now });
    if (oldId) batch.delete(db().collection('publicIndex').doc(oldId));
    await batch.commit();

    return publicId;
  },

  // ---- OTP sessions --------------------------------------------------
  async createOtpSession(session) {
    await db().collection('otpSessions').doc(session.id).set(session);
    return session;
  },

  async getOtpSession(id) {
    const snap = await db().collection('otpSessions').doc(id).get();
    return snap.exists ? snap.data() : null;
  },

  async updateOtpSession(id, patch) {
    const ref = db().collection('otpSessions').doc(id);
    await ref.set(patch, { merge: true });
    const snap = await ref.get();
    return snap.exists ? snap.data() : null;
  },

  // ---- audit ---------------------------------------------------------
  async appendAudit(uid, entry) {
    await db()
      .collection('profiles')
      .doc(uid)
      .collection('audit')
      .add({ ...entry, at: new Date().toISOString() });
  },

  async listAudit(uid, limit = 50) {
    const snap = await db()
      .collection('profiles')
      .doc(uid)
      .collection('audit')
      .orderBy('at', 'desc')
      .limit(limit)
      .get();
    return snap.docs.map((d) => d.data());
  },
};
