/**
 * Thin API client.
 *
 * getToken is injected by AuthContext at startup rather than imported, which
 * keeps this module free of any dependency on which auth mode is active.
 */

const BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

let tokenProvider = async () => null;

export function setTokenProvider(fn) {
  tokenProvider = fn;
}

export class ApiError extends Error {
  constructor(message, { status, fields } = {}) {
    super(message);
    this.status = status;
    this.fields = fields || {};
  }
}

async function request(path, { method = 'GET', body, auth = false } = {}) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  if (auth) {
    const token = await tokenProvider();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let res;
  try {
    res = await fetch(`${BASE}/api${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(
      'Cannot reach the VitalQR server. Check that the backend is running.',
      { status: 0 }
    );
  }

  if (res.status === 204) return null;

  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    if (!res.ok) throw new ApiError(`Request failed (${res.status})`, { status: res.status });
    return res;
  }

  const data = await res.json();
  if (!res.ok) {
    throw new ApiError(data?.error?.message || `Request failed (${res.status})`, {
      status: res.status,
      fields: data?.error?.fields,
    });
  }
  return data;
}

export const api = {
  health: () => request('/health'),

  // --- auth (local mode only) ---
  signup: (payload) => request('/auth/signup', { method: 'POST', body: payload }),
  login: (payload) => request('/auth/login', { method: 'POST', body: payload }),
  me: () => request('/auth/me', { auth: true }),

  // --- owner ---
  getProfile: () => request('/profile', { auth: true }),
  saveEmergency: (payload) => request('/profile/emergency', { method: 'PUT', body: payload, auth: true }),
  savePrivate: (payload) => request('/profile/private', { method: 'PUT', body: payload, auth: true }),
  rotateQr: () => request('/profile/rotate-qr', { method: 'POST', auth: true }),
  getAudit: () => request('/profile/audit', { auth: true }),
  qrLink: () => request('/qr/link', { auth: true }),

  // --- public scan (no auth) ---
  scan: (publicId) => request(`/scan/${encodeURIComponent(publicId)}`),
  scanContacts: (publicId) => request(`/scan/${encodeURIComponent(publicId)}/contacts`),
  requestOtp: (publicId, payload) =>
    request(`/scan/${encodeURIComponent(publicId)}/otp/request`, { method: 'POST', body: payload }),
  verifyOtp: (publicId, payload) =>
    request(`/scan/${encodeURIComponent(publicId)}/otp/verify`, { method: 'POST', body: payload }),
};

/**
 * The QR download is an authenticated binary response, so it can't be a
 * plain <a href>. Fetch it with the token, then hand the browser a blob.
 */
export async function downloadQr(format = 'png') {
  const token = await tokenProvider();
  const res = await fetch(`${BASE}/api/qr/download.${format}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new ApiError('Could not download the QR code', { status: res.status });

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `vitalqr.${format}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
