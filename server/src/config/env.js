import 'dotenv/config';

function bool(value, fallback = false) {
  if (value === undefined) return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
}

function int(value, fallback) {
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) ? n : fallback;
}

export const env = {
  port: int(process.env.PORT, 5000),
  nodeEnv: process.env.NODE_ENV || 'development',
  isProd: process.env.NODE_ENV === 'production',

  publicAppUrl: (process.env.PUBLIC_APP_URL || 'http://localhost:5173').replace(/\/$/, ''),
  corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),

  dataStore: (process.env.DATA_STORE || 'memory').toLowerCase(),
  authMode: (process.env.AUTH_MODE || 'local').toLowerCase(),

  jwtSecret: process.env.JWT_SECRET || 'dev-only-insecure-secret',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',

  firebaseProjectId: process.env.FIREBASE_PROJECT_ID || '',
  googleCredentials: process.env.GOOGLE_APPLICATION_CREDENTIALS || '',
  // Hosts like Render and Vercel have no writable place to keep a key file,
  // so the whole service-account JSON can arrive as one env var instead
  // (raw JSON, or base64 if the dashboard mangles newlines).
  firebaseServiceAccountJson: process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '',

  otpTransport: (process.env.OTP_TRANSPORT || 'console').toLowerCase(),
  otpTtlSeconds: int(process.env.OTP_TTL_SECONDS, 300),
  otpMaxAttempts: int(process.env.OTP_MAX_ATTEMPTS, 5),

  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID || '',
    authToken: process.env.TWILIO_AUTH_TOKEN || '',
    fromNumber: process.env.TWILIO_FROM_NUMBER || '',
  },

  verboseLogs: bool(process.env.VERBOSE_LOGS, true),
};

export function assertConfig() {
  const problems = [];

  if (!['memory', 'firestore'].includes(env.dataStore)) {
    problems.push(`DATA_STORE must be "memory" or "firestore" (got "${env.dataStore}")`);
  }
  if (!['local', 'firebase'].includes(env.authMode)) {
    problems.push(`AUTH_MODE must be "local" or "firebase" (got "${env.authMode}")`);
  }
  if (env.isProd && env.jwtSecret === 'dev-only-insecure-secret' && env.authMode === 'local') {
    problems.push('JWT_SECRET must be set to a real secret in production');
  }
  if (env.isProd && !env.publicAppUrl.startsWith('https://')) {
    problems.push('PUBLIC_APP_URL must be an https:// URL in production (QR codes embed it)');
  }

  if (problems.length) {
    throw new Error(`Invalid configuration:\n  - ${problems.join('\n  - ')}`);
  }
}
