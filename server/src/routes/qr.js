import { Router } from 'express';
import { getStore } from '../store/index.js';
import { requireAuth } from '../middleware/auth.js';
import { ApiError, asyncRoute } from '../middleware/errors.js';
import { qrPngBuffer, qrSvgString, scanUrlFor } from '../services/qrService.js';

/**
 * QR downloads. Owner-only: the file is served from the signed-in user's own
 * profile rather than from a publicId in the URL, so nobody can mint a
 * printable code for someone else's profile.
 */

const router = Router();
router.use(requireAuth);

async function ownPublicId(uid) {
  const doc = await getStore().getProfile(uid);
  if (!doc) throw new ApiError(404, 'Create your emergency profile first');
  return doc.publicId;
}

/** PNG, for a lock-screen image or a quick print. */
router.get(
  '/download.png',
  asyncRoute(async (req, res) => {
    const publicId = await ownPublicId(req.user.uid);
    const size = Math.min(Math.max(Number.parseInt(req.query.size, 10) || 1024, 256), 2048);
    const png = await qrPngBuffer(publicId, { width: size });

    res.set({
      'Content-Type': 'image/png',
      'Content-Disposition': `attachment; filename="vitalqr-${publicId}.png"`,
      'Cache-Control': 'no-store',
    });
    res.send(png);
  })
);

/** SVG, for stickers and cards that need to scale without blurring. */
router.get(
  '/download.svg',
  asyncRoute(async (req, res) => {
    const publicId = await ownPublicId(req.user.uid);
    const svg = await qrSvgString(publicId);

    res.set({
      'Content-Type': 'image/svg+xml',
      'Content-Disposition': `attachment; filename="vitalqr-${publicId}.svg"`,
      'Cache-Control': 'no-store',
    });
    res.send(svg);
  })
);

router.get(
  '/link',
  asyncRoute(async (req, res) => {
    const publicId = await ownPublicId(req.user.uid);
    res.json({ publicId, scanUrl: scanUrlFor(publicId) });
  })
);

export default router;
