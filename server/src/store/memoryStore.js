import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { newPublicId, newUid } from '../lib/ids.js';

/**
 * File-backed development store.
 * ------------------------------------------------------------------
 * Exists so the whole app runs end to end with zero cloud setup: clone,
 * npm install, npm run dev, scan a QR. Swap DATA_STORE=firestore when the
 * Firebase project is ready. Writes to server/.data/db.json (gitignored),
 * so demo data survives a restart.
 *
 * Not for production: no concurrency control, no encryption at rest.
 */

const here = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.resolve(here, '../../.data/db.json');

const empty = { users: {}, profiles: {}, publicIndex: {}, otpSessions: {}, audit: {} };

let db = structuredClone(empty);
let writeQueue = Promise.resolve();

async function persist() {
  // Serialise writes so two concurrent requests can't interleave a
  // read-modify-write and lose one of them.
  writeQueue = writeQueue.then(async () => {
    await fs.mkdir(path.dirname(DB_PATH), { recursive: true });
    await fs.writeFile(DB_PATH, JSON.stringify(db, null, 2), 'utf8');
  });
  return writeQueue;
}

export const memoryStore = {
  name: 'memory',

  async init() {
    try {
      const raw = await fs.readFile(DB_PATH, 'utf8');
      db = { ...structuredClone(empty), ...JSON.parse(raw) };
    } catch {
      db = structuredClone(empty);
      await persist();
    }
    return this;
  },

  // ---- users ---------------------------------------------------------
  // `uid` is supplied when the account already exists in Firebase Auth and we
  // are only mirroring it locally; otherwise we mint one.
  async createUser({ email, passwordHash, displayName, uid = newUid() }) {
    const user = {
      uid,
      email: email.toLowerCase(),
      passwordHash,
      displayName: displayName || '',
      createdAt: new Date().toISOString(),
    };
    db.users[uid] = user;
    await persist();
    return user;
  },

  async getUserByEmail(email) {
    const target = String(email).toLowerCase();
    return Object.values(db.users).find((u) => u.email === target) || null;
  },

  async getUserById(uid) {
    return db.users[uid] || null;
  },

  // ---- profiles ------------------------------------------------------
  async getProfile(uid) {
    return db.profiles[uid] || null;
  },

  async saveProfile(uid, { emergency, private: priv }) {
    const now = new Date().toISOString();
    const existing = db.profiles[uid];

    if (existing) {
      existing.emergency = emergency ?? existing.emergency;
      existing.private = priv ?? existing.private;
      existing.updatedAt = now;
    } else {
      const publicId = newPublicId();
      db.profiles[uid] = {
        uid,
        publicId,
        emergency: emergency || {},
        private: priv || {},
        createdAt: now,
        updatedAt: now,
      };
      db.publicIndex[publicId] = uid;
    }

    await persist();
    return db.profiles[uid];
  },

  async getProfileByPublicId(publicId) {
    const uid = db.publicIndex[publicId];
    return uid ? db.profiles[uid] || null : null;
  },

  async rotatePublicId(uid) {
    const profile = db.profiles[uid];
    if (!profile) return null;
    delete db.publicIndex[profile.publicId];
    profile.publicId = newPublicId();
    profile.updatedAt = new Date().toISOString();
    db.publicIndex[profile.publicId] = uid;
    await persist();
    return profile.publicId;
  },

  // ---- OTP sessions --------------------------------------------------
  async createOtpSession(session) {
    db.otpSessions[session.id] = session;
    await persist();
    return session;
  },

  async getOtpSession(id) {
    return db.otpSessions[id] || null;
  },

  async updateOtpSession(id, patch) {
    if (!db.otpSessions[id]) return null;
    Object.assign(db.otpSessions[id], patch);
    await persist();
    return db.otpSessions[id];
  },

  // ---- audit ---------------------------------------------------------
  async appendAudit(uid, entry) {
    db.audit[uid] = db.audit[uid] || [];
    db.audit[uid].unshift({ ...entry, at: new Date().toISOString() });
    db.audit[uid] = db.audit[uid].slice(0, 200);
    await persist();
  },

  async listAudit(uid, limit = 50) {
    return (db.audit[uid] || []).slice(0, limit);
  },
};
