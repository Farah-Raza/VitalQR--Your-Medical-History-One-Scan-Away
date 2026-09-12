import { Router } from 'express';
import { getStore } from '../store/index.js';
import { requireAuth } from '../middleware/auth.js';
import { ApiError, asyncRoute } from '../middleware/errors.js';
import { emergencyProfileSchema, privateProfileSchema, fieldErrors } from '../lib/validate.js';
import { toOwnerView } from '../lib/redact.js';
import { buildDecisionCard } from '../lib/decisionCard.js';
import { scanUrlFor, qrDataUrl } from '../services/qrService.js';

/** Owner-only routes. Every handler is scoped to req.user.uid. */

const router = Router();
router.use(requireAuth);

router.get(
  '/',
  asyncRoute(async (req, res) => {
    const doc = await getStore().getProfile(req.user.uid);
    if (!doc) return res.json({ profile: null, qr: null });

    res.json({
      profile: toOwnerView(doc),
      qr: {
        publicId: doc.publicId,
        scanUrl: scanUrlFor(doc.publicId),
        dataUrl: await qrDataUrl(doc.publicId),
      },
      decisionCard: buildDecisionCard(doc.emergency || {}),
    });
  })
);

/** Emergency tier: the fields a public scan exposes. */
router.put(
  '/emergency',
  asyncRoute(async (req, res) => {
    const parsed = emergencyProfileSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ApiError(400, 'Please correct the highlighted fields', fieldErrors(parsed.error));
    }

    const store = getStore();
    const existed = Boolean(await store.getProfile(req.user.uid));
    const doc = await store.saveProfile(req.user.uid, { emergency: parsed.data });

    await store.appendAudit(req.user.uid, {
      type: existed ? 'emergency_profile_updated' : 'emergency_profile_created',
    });

    res.json({
      profile: toOwnerView(doc),
      qr: {
        publicId: doc.publicId,
        scanUrl: scanUrlFor(doc.publicId),
        dataUrl: await qrDataUrl(doc.publicId),
      },
      decisionCard: buildDecisionCard(doc.emergency || {}),
    });
  })
);

/** Protected tier: only ever released after OTP verification. */
router.put(
  '/private',
  asyncRoute(async (req, res) => {
    const parsed = privateProfileSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ApiError(400, 'Please correct the highlighted fields', fieldErrors(parsed.error));
    }

    const store = getStore();
    if (!(await store.getProfile(req.user.uid))) {
      throw new ApiError(409, 'Create your emergency profile before adding medical history');
    }

    const doc = await store.saveProfile(req.user.uid, { private: parsed.data });
    await store.appendAudit(req.user.uid, { type: 'private_record_updated' });

    res.json({ profile: toOwnerView(doc) });
  })
);

/**
 * Revokes the current QR and issues a new one. The answer to a lost wallet
 * card or a sticker photographed by a stranger: old printed codes stop
 * resolving immediately.
 */
router.post(
  '/rotate-qr',
  asyncRoute(async (req, res) => {
    const store = getStore();
    const publicId = await store.rotatePublicId(req.user.uid);
    if (!publicId) throw new ApiError(404, 'No profile to rotate yet');

    await store.appendAudit(req.user.uid, { type: 'qr_rotated' });

    res.json({
      qr: { publicId, scanUrl: scanUrlFor(publicId), dataUrl: await qrDataUrl(publicId) },
    });
  })
);

/** Who has requested or unlocked this record, newest first. */
router.get(
  '/audit',
  asyncRoute(async (req, res) => {
    res.json({ entries: await getStore().listAudit(req.user.uid, 100) });
  })
);

export default router;
