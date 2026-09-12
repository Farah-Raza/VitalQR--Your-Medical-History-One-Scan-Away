import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { getStore } from '../store/index.js';
import { ApiError, asyncRoute } from '../middleware/errors.js';
import { toPublicView, toFullView } from '../lib/redact.js';
import { requestOtp, verifyOtp } from '../services/otpService.js';

/**
 * The responder-facing surface. No authentication anywhere in this file:
 * an unconscious patient's paramedic cannot be asked to log in.
 *
 * Everything that leaves here goes through toPublicView(), which whitelists
 * the emergency tier. The protected tier is released by /otp/verify only.
 */

const router = Router();

// A public id is ~99 bits of entropy, so brute force is not the threat.
// This cap is about stopping bulk harvesting if a batch of ids ever leaks.
const scanLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { message: 'Too many scans from this network. Please wait a moment.' } },
});

// Deliberately tight: each request sends a real SMS to a real family member,
// so this caps both cost and the potential for harassing a patient's contacts.
const otpRequestLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: { message: 'Too many verification requests. Please wait before trying again.' },
  },
});

// Verification gets its own, looser budget. Sharing one limiter with /request
// meant a responder who requested a code and then mistyped it could be locked
// out mid-emergency by their own earlier requests. Guessing is already capped
// per session by OTP_MAX_ATTEMPTS, which invalidates the code rather than
// throttling the network, so this limit only needs to stop bulk abuse.
const otpVerifyLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: { message: 'Too many attempts from this network. Please wait before trying again.' },
  },
});

router.get(
  '/:publicId',
  scanLimiter,
  asyncRoute(async (req, res) => {
    const doc = await getStore().getProfileByPublicId(req.params.publicId);

    // Same response for a malformed id and an unknown one, so this endpoint
    // never confirms whether a given code is registered.
    if (!doc) throw new ApiError(404, 'No emergency profile is linked to this code');

    await getStore().appendAudit(doc.uid, { type: 'emergency_view_opened', publicId: doc.publicId });

    res.set('Cache-Control', 'no-store');
    res.json({ profile: toPublicView(doc) });
  })
);

/** Masked contact list, so the responder can pick who receives the code. */
router.get(
  '/:publicId/contacts',
  scanLimiter,
  asyncRoute(async (req, res) => {
    const doc = await getStore().getProfileByPublicId(req.params.publicId);
    if (!doc) throw new ApiError(404, 'No emergency profile is linked to this code');

    const { maskPhone } = await import('../lib/redact.js');
    res.json({
      contacts: (doc.emergency?.emergencyContacts || []).map((c, index) => ({
        index,
        name: c.name,
        relation: c.relation || '',
        phoneMasked: maskPhone(c.phone),
      })),
    });
  })
);

router.post(
  '/:publicId/otp/request',
  otpRequestLimiter,
  asyncRoute(async (req, res) => {
    const contactIndex = Number.parseInt(req.body?.contactIndex, 10) || 0;
    const result = await requestOtp({
      publicId: req.params.publicId,
      contactIndex,
      requestedBy: String(req.body?.requestedBy || '').slice(0, 120),
    });
    res.json(result);
  })
);

router.post(
  '/:publicId/otp/verify',
  otpVerifyLimiter,
  asyncRoute(async (req, res) => {
    const { sessionId, code } = req.body || {};
    if (!sessionId || !code) throw new ApiError(400, 'Enter the 6-digit code you received');

    const doc = await verifyOtp({ publicId: req.params.publicId, sessionId, code });

    res.set('Cache-Control', 'no-store');
    res.json({ profile: toFullView(doc) });
  })
);

export default router;
