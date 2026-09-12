import { useEffect, useState } from 'react';
import {
  canPrompt,
  isInstalled,
  isIos,
  promptInstall,
  onInstallStateChange,
} from '../lib/pwa.js';
import { Button } from './ui.jsx';

/**
 * "Get the app" button.
 *
 * There is no app-store build, so this installs the web app. It renders
 * nothing at all when there is nothing to offer: already installed, or a
 * browser that supports neither the install prompt nor the iOS Share flow.
 * An install button that does nothing when tapped is worse than no button.
 */
export function useInstallState() {
  const [, bump] = useState(0);
  useEffect(() => onInstallStateChange(() => bump((n) => n + 1)), []);
  return {
    installed: isInstalled(),
    promptable: canPrompt(),
    ios: isIos(),
  };
}

export default function InstallApp({ variant = 'secondary', size = 'md', className = '' }) {
  const { installed, promptable, ios } = useInstallState();
  const [iosHelp, setIosHelp] = useState(false);
  const [busy, setBusy] = useState(false);

  if (installed) return null;
  if (!promptable && !ios) return null;

  async function handle() {
    if (ios && !promptable) {
      setIosHelp((v) => !v);
      return;
    }
    setBusy(true);
    await promptInstall();
    setBusy(false);
  }

  return (
    <span className={className}>
      <Button variant={variant} size={size} onClick={handle} disabled={busy}>
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
          <path d="M12 3v10.6l3.3-3.3 1.4 1.4L12 17.4l-4.7-4.7 1.4-1.4 3.3 3.3V3h2ZM5 19h14v2H5v-2Z" />
        </svg>
        Install the app
      </Button>

      {iosHelp && (
        <span className="mt-2 block text-xs leading-relaxed text-slate-600">
          In Safari, tap the Share button, then <strong>Add to Home Screen</strong>. VitalQR then
          opens like any other app on your phone.
        </span>
      )}
    </span>
  );
}
