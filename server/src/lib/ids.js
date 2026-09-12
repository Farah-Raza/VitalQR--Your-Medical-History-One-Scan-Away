import { customAlphabet } from 'nanoid';
import crypto from 'node:crypto';

// Unambiguous alphabet: no 0/O/1/I/l. A scanned QR may also be read aloud
// or typed by hand off a printed fallback card, so the id has to survive
// being transcribed by a stressed human.
const PUBLIC_ID_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

// 20 chars over a 31-symbol alphabet ~= 99 bits of entropy. A public scan
// URL is unauthenticated, so this id IS the only thing standing between a
// guesser and someone's emergency profile. It must not be enumerable.
export const newPublicId = customAlphabet(PUBLIC_ID_ALPHABET, 20);

export const newUid = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', 24);

export function newSessionId() {
  return crypto.randomBytes(24).toString('base64url');
}

/** 6-digit numeric OTP, generated with a CSPRNG (not Math.random). */
export function newOtpCode() {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
}

export function hashOtp(code, salt) {
  return crypto.createHash('sha256').update(`${salt}:${code}`).digest('hex');
}

/** Constant-time compare, so a wrong OTP can't be narrowed down by timing. */
export function safeEqual(a, b) {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}
