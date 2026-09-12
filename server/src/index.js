import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env, assertConfig } from './config/env.js';
import { initStore } from './store/index.js';
import { notFound, errorHandler } from './middleware/errors.js';
import authRoutes from './routes/auth.js';
import profileRoutes from './routes/profile.js';
import scanRoutes from './routes/scan.js';
import qrRoutes from './routes/qr.js';

assertConfig();

const app = express();

// Behind Vercel / Firebase Hosting the client IP arrives in X-Forwarded-For.
// express-rate-limit needs this or every request looks like one proxy IP.
app.set('trust proxy', 1);

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(
  cors({
    origin(origin, callback) {
      // No Origin header: curl, a native camera app opening the link, or a
      // same-origin request. None of those are the CSRF case CORS guards.
      if (!origin) return callback(null, true);
      if (env.corsOrigins.includes(origin)) return callback(null, true);
      callback(new Error(`Origin ${origin} is not allowed by CORS_ORIGINS`));
    },
    credentials: true,
  })
);
app.use(express.json({ limit: '256kb' }));
if (env.verboseLogs) app.use(morgan('dev'));

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'vitalqr-server',
    dataStore: env.dataStore,
    authMode: env.authMode,
    otpTransport: env.otpTransport,
    publicAppUrl: env.publicAppUrl,
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/scan', scanRoutes);
app.use('/api/qr', qrRoutes);

app.use(notFound);
app.use(errorHandler);

const banner = `
  VitalQR API
  -------------------------------------------------
  Port          ${env.port}
  Data store    ${env.dataStore}${env.dataStore === 'memory' ? '  (server/.data/db.json)' : ''}
  Auth mode     ${env.authMode}
  OTP transport ${env.otpTransport}${env.otpTransport === 'console' ? '  (codes print here)' : ''}
  QR points at  ${env.publicAppUrl}/s/<publicId>
  -------------------------------------------------`;

initStore()
  .then(() => {
    app.listen(env.port, () => console.log(`${banner}\n  Listening on http://localhost:${env.port}\n`));
  })
  .catch((err) => {
    console.error('[VitalQR] Failed to start:', err.message);
    process.exit(1);
  });
