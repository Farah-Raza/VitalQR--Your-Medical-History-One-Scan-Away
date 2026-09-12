import QRCode from 'qrcode';
import { env } from '../config/env.js';

/**
 * QR generation.
 * ------------------------------------------------------------------
 * The code encodes a URL, not medical data. That matters:
 *
 *  - Any stock phone camera opens a URL with no app and no decoding step,
 *    which is the whole "no app, no login" promise.
 *  - Data stays server-side, so a profile edit is reflected instantly by
 *    the same printed sticker. Encoding the data itself would freeze it at
 *    print time and leak it to anyone who photographed the code.
 *  - The URL carries only an opaque random publicId, so the code reveals
 *    nothing on its own and can be revoked by rotating that id.
 *
 * Error correction is set to 'H' (~30% recoverable) because these get
 * printed on helmets, wristbands and school bags, and end up scratched.
 */

export function scanUrlFor(publicId) {
  return `${env.publicAppUrl}/s/${publicId}`;
}

const BASE_OPTIONS = {
  errorCorrectionLevel: 'H',
  margin: 2,
  color: { dark: '#0f172a', light: '#ffffff' },
};

/** Data URL for on-screen display. */
export async function qrDataUrl(publicId, { width = 512 } = {}) {
  return QRCode.toDataURL(scanUrlFor(publicId), { ...BASE_OPTIONS, width });
}

/** PNG buffer for download. Large enough to stay sharp when printed. */
export async function qrPngBuffer(publicId, { width = 1024 } = {}) {
  return QRCode.toBuffer(scanUrlFor(publicId), {
    ...BASE_OPTIONS,
    type: 'png',
    width,
  });
}

/** Vector output, for print shops producing stickers or cards at any size. */
export async function qrSvgString(publicId) {
  return QRCode.toString(scanUrlFor(publicId), { ...BASE_OPTIONS, type: 'svg', width: 512 });
}
