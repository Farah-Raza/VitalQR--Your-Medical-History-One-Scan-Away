/**
 * Install + service-worker plumbing.
 *
 * VitalQR has no app-store build, so "get the app" means installing the web
 * app: Chrome and Edge fire `beforeinstallprompt` and we can show a real
 * install button; iOS Safari fires nothing and the user must go through the
 * Share menu, so we detect that and show the instruction instead of a button
 * that would do nothing.
 */

let deferredPrompt = null;
const listeners = new Set();

function emit() {
  listeners.forEach((fn) => fn());
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    // Chrome shows its own mini-infobar unless this is prevented; we want the
    // prompt to fire from our own button, in context.
    e.preventDefault();
    deferredPrompt = e;
    emit();
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    emit();
  });
}

export function canPrompt() {
  return deferredPrompt !== null;
}

/** Already launched from the home screen: never advertise installing again. */
export function isInstalled() {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: minimal-ui)').matches ||
    window.navigator.standalone === true
  );
}

export function isIos() {
  if (typeof navigator === 'undefined') return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

export async function promptInstall() {
  if (!deferredPrompt) return 'unavailable';
  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  // The event is single-use; Chrome re-fires it on a later visit if declined.
  deferredPrompt = null;
  emit();
  return outcome;
}

export function onInstallStateChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/**
 * Registers the worker. Only over HTTPS or on localhost, which is all the
 * browser allows anyway, and only in a production build so the dev server's
 * hot reload is never served from a cache.
 */
export function registerServiceWorker() {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
  if (!import.meta.env.PROD) return;

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // An unregistrable worker costs the app nothing; it just is not installable.
    });
  });
}
