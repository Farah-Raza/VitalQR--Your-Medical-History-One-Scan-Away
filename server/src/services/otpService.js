import crypto from 'node:crypto';
import { env } from '../config/env.js';
import { getStore } from '../store/index.js';
import { ApiError } from '../middleware/errors.js';
import { newOtpCode, newSessionId, hashOtp, safeEqual } from '../lib/ids.js';
import { maskPhone } from '../lib/redact.js';

/**
 * OTP gate for the protected record tier.
 * ------------------------------------------------------------------
 * A responder who wants the full history triggers a code that is delivered
 * to the patient's own emergency contact, so consent stays with the family
 * rather than with whoever is holding the QR.
 *
 * Note on Firebase phone auth: it cannot express this flow. It signs IN the
 * person who owns the handset, whereas here a third party requests access
 * and a different person receives the code. So the challenge is issued and
 * verified here, and Firebase is used for owner login only.
 *
 * Defences: codes stored only as salted SHA-256, constant-time comparison,
 * short TTL, capped attempts, single-use, and every request and unlock
 * written to the owner's audit trail.
 */

export async function requestOtp({ publicId, contactIndex = 0, requestedBy = '' }) {
  const store = getStore();
  const profile = await store.getProfileByPublicId(publicId);
  if (!profile) throw new ApiError(404, 'No profile is linked to this code');

  const contacts = profile.emergency?.emergencyContacts || [];
  if (!contacts.length) {
    throw new ApiError(
      409,
      'This profile has no emergency contact registered, so the full record cannot be unlocked.'
    );
  }

  const contact = contacts[contactIndex];
  if (!contact) throw new ApiError(400, 'That contact does not exist on this profile');

  const code = newOtpCode();
  const salt = crypto.randomBytes(16).toString('hex');
  const now = Date.now();

  const session = {
    id: newSessionId(),
    publicId,
    uid: profile.uid,
    contactIndex,
    recipientMasked: maskPhone(contact.phone),
    recipientName: contact.name,
    codeHash: hashOtp(code, salt),
    salt,
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + env.otpTtlSeconds * 1000).toISOString(),
    attempts: 0,
    verified: false,
    consumedAt: null,
  };

  await store.createOtpSession(session);

  const patientName = profile.emergency?.fullName || 'a VitalQR user';
  const { sendSms } = await import('./notify.js');
  await sendSms({
    to: contact.phone,
    body:
      `VitalQR: someone scanned ${patientName}'s emergency QR and is requesting the full ` +
      `medical record. Share this code ONLY with a responder you trust: ${code}\n` +
      `It expires in ${Math.round(env.otpTtlSeconds / 60)} minutes. ` +
      `If this was not expected, ignore this message.`,
  });

  await store.appendAudit(profile.uid, {
    type: 'otp_requested',
    publicId,
    contact: session.recipientMasked,
    requestedBy: requestedBy || 'anonymous scan',
  });

  return {
    sessionId: session.id,
    recipientMasked: session.recipientMasked,
    recipientName: session.recipientName,
    expiresInSeconds: env.otpTtlSeconds,
    // Console transport has no inbox to check, so surface the code in the API
    // response to keep the demo usable. Never enabled with a real transport.
    devCode: env.otpTransport === 'console' && !env.isProd ? code : undefined,
  };
}

export async function verifyOtp({ publicId, sessionId, code }) {
  const store = getStore();
  const session = await store.getOtpSession(sessionId);

  if (!session || session.publicId !== publicId) {
    throw new ApiError(400, 'This verification request is no longer valid. Please start again.');
  }
  if (session.consumedAt) {
    throw new ApiError(400, 'This code has already been used. Please request a new one.');
  }
  if (Date.now() > new Date(session.expiresAt).getTime()) {
    throw new ApiError(400, 'This code has expired. Please request a new one.');
  }
  if (session.attempts >= env.otpMaxAttempts) {
    throw new ApiError(429, 'Too many incorrect attempts. Please request a new code.');
  }

  const supplied = hashOtp(String(code).trim(), session.salt);
  if (!safeEqual(supplied, session.codeHash)) {
    const attempts = session.attempts + 1;
    await store.updateOtpSession(sessionId, { attempts });

    const left = Math.max(env.otpMaxAttempts - attempts, 0);
    await store.appendAudit(session.uid, { type: 'otp_failed', publicId, attempts });

    throw new ApiError(
      401,
      left > 0
        ? `Incorrect code. ${left} attempt${left === 1 ? '' : 's'} remaining.`
        : 'Too many incorrect attempts. Please request a new code.'
    );
  }

  await store.updateOtpSession(sessionId, {
    verified: true,
    consumedAt: new Date().toISOString(),
  });

  await store.appendAudit(session.uid, {
    type: 'record_unlocked',
    publicId,
    contact: session.recipientMasked,
  });

  return store.getProfileByPublicId(publicId);
}
