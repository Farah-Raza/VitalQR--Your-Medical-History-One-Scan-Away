import { env } from '../config/env.js';

export class ApiError extends Error {
  constructor(status, message, fields = null) {
    super(message);
    this.status = status;
    this.fields = fields;
  }
}

export function notFound(_req, _res, next) {
  next(new ApiError(404, 'Endpoint not found'));
}

// eslint-disable-next-line no-unused-vars -- Express identifies error handlers by arity
export function errorHandler(err, _req, res, _next) {
  const status = err.status || 500;

  if (status >= 500) {
    console.error('[VitalQR] Unhandled error:', err);
  }

  res.status(status).json({
    error: {
      message:
        status >= 500 && env.isProd
          ? 'Something went wrong. Please try again.'
          : err.message,
      fields: err.fields || undefined,
    },
  });
}

/** Wraps an async route so a rejected promise reaches errorHandler. */
export function asyncRoute(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}
