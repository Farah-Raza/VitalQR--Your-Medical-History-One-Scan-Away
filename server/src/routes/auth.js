import { Router } from 'express';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';
import { getStore } from '../store/index.js';
import { ApiError, asyncRoute } from '../middleware/errors.js';
import { requireAuth, signLocalToken } from '../middleware/auth.js';
import { signupSchema, loginSchema, fieldErrors } from '../lib/validate.js';

/**
 * Account routes for AUTH_MODE=local only. Under AUTH_MODE=firebase the
 * React client signs in against Firebase directly and these return 501,
 * so a misconfigured client fails loudly instead of silently creating a
 * second, parallel set of accounts.
 */

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { message: 'Too many attempts. Please wait a few minutes.' } },
});

function assertLocalMode() {
  if (env.authMode !== 'local') {
    throw new ApiError(
      501,
      'This server runs AUTH_MODE=firebase. Sign in through Firebase Auth in the client instead.'
    );
  }
}

router.post(
  '/signup',
  authLimiter,
  asyncRoute(async (req, res) => {
    assertLocalMode();

    const parsed = signupSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ApiError(400, 'Please correct the highlighted fields', fieldErrors(parsed.error));
    }

    const { email, password, displayName } = parsed.data;
    const store = getStore();

    if (await store.getUserByEmail(email)) {
      throw new ApiError(409, 'An account already exists for that email address', {
        email: 'This email is already registered',
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await store.createUser({ email, passwordHash, displayName });

    res.status(201).json({
      token: signLocalToken(user),
      user: { uid: user.uid, email: user.email, displayName: user.displayName },
    });
  })
);

router.post(
  '/login',
  authLimiter,
  asyncRoute(async (req, res) => {
    assertLocalMode();

    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ApiError(400, 'Please correct the highlighted fields', fieldErrors(parsed.error));
    }

    const { email, password } = parsed.data;
    const user = await getStore().getUserByEmail(email);

    // Same message and comparable timing whether the email exists or not,
    // so this endpoint can't be used to enumerate registered accounts.
    const ok = user
      ? await bcrypt.compare(password, user.passwordHash || '')
      : await bcrypt.compare(password, '$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinva');

    if (!user || !ok) throw new ApiError(401, 'Incorrect email or password');

    res.json({
      token: signLocalToken(user),
      user: { uid: user.uid, email: user.email, displayName: user.displayName },
    });
  })
);

router.get(
  '/me',
  requireAuth,
  asyncRoute(async (req, res) => {
    const user = await getStore().getUserById(req.user.uid);
    res.json({
      user: {
        uid: req.user.uid,
        email: user?.email || req.user.email,
        displayName: user?.displayName || '',
      },
    });
  })
);

export default router;
