import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, downloadQr } from '../lib/api.js';
import {
  Alert,
  Badge,
  Button,
  Card,
  PageLoader,
  SectionHeading,
  Spinner,
} from '../components/ui.jsx';

export default function QrPage() {
  const [qr, setQr] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [rotating, setRotating] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    api
      .getProfile()
      .then(({ qr: q }) => setQr(q))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  async function rotate() {
    if (
      !window.confirm(
        'Generate a new QR code?\n\nEvery printed sticker, card and saved image of your current code will stop working immediately. Use this if your code was lost or copied.'
      )
    ) {
      return;
    }

    setRotating(true);
    setError('');
    try {
      const { qr: q } = await api.rotateQr();
      setQr(q);
      setNotice('New QR generated. Reprint or re-save it, and discard the old one.');
    } catch (err) {
      setError(err.message);
    } finally {
      setRotating(false);
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(qr.scanUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Could not copy automatically. Select and copy the link manually.');
    }
  }

  if (loading) return <PageLoader label="Generating your QR code" />;

  if (!qr) {
    return (
      <Card className="p-8 text-center">
        <h2 className="text-lg font-bold text-slate-900">No QR code yet</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">
          Your QR is created as soon as you save your emergency profile.
        </p>
        <Button as={Link} to="/profile" className="mt-5">
          Fill in my emergency profile
        </Button>
      </Card>
    );
  }

  return (
    <div>
      <SectionHeading
        title="My QR code"
        description="Print it, wear it, or set it as your lock screen. Anyone who scans it sees your emergency profile."
      />

      {error && (
        <Alert tone="error" className="mb-4">
          {error}
        </Alert>
      )}
      {notice && (
        <Alert tone="success" className="mb-4">
          {notice}
        </Alert>
      )}

      <div className="grid gap-5 md:grid-cols-[auto_1fr]">
        <Card className="print-card flex flex-col items-center p-6">
          <img
            src={qr.dataUrl}
            alt="Your VitalQR emergency profile QR code"
            className="h-56 w-56 rounded-lg"
          />
          <p className="mt-3 text-center text-xs font-semibold uppercase tracking-widest text-slate-500">
            Scan for emergency medical info
          </p>
          <p className="mt-1 font-mono text-[11px] text-slate-400">{qr.publicId}</p>
        </Card>

        <div className="space-y-4">
          <Card className="p-5">
            <h3 className="font-bold text-slate-900">Download</h3>
            <p className="mt-1 text-sm text-slate-600">
              PNG for a phone lock screen or a quick print. SVG stays sharp at any size, so use it
              for stickers and printed cards.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button onClick={() => downloadQr('png')}>Download PNG</Button>
              <Button variant="secondary" onClick={() => downloadQr('svg')}>
                Download SVG
              </Button>
              <Button variant="secondary" onClick={() => window.print()}>
                Print
              </Button>
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="font-bold text-slate-900">Scan link</h3>
            <p className="mt-1 text-sm text-slate-600">
              This is the address encoded in your QR. Test it in a browser before you print anything.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <code className="min-w-0 flex-1 truncate rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-700">
                {qr.scanUrl}
              </code>
              <Button variant="secondary" size="sm" onClick={copyLink}>
                {copied ? 'Copied' : 'Copy'}
              </Button>
              <Button as="a" href={qr.scanUrl} target="_blank" rel="noreferrer" variant="secondary" size="sm">
                Open
              </Button>
            </div>

            {qr.scanUrl.includes('localhost') && (
              <Alert tone="warning" className="mt-3">
                This link points at localhost, so it will only open on this computer. A phone
                scanning the printed code will not reach it. Deploy the app and set{' '}
                <code className="font-mono">PUBLIC_APP_URL</code> in{' '}
                <code className="font-mono">server/.env</code> before printing anything for real
                use.
              </Alert>
            )}
          </Card>

          <Card className="p-5">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-slate-900">Lost or copied?</h3>
              <Badge tone="amber">Revoke</Badge>
            </div>
            <p className="mt-1 text-sm text-slate-600">
              Generating a new code immediately breaks every existing copy of the old one. Your
              medical data is untouched.
            </p>
            <Button variant="danger" onClick={rotate} disabled={rotating} className="mt-4">
              {rotating && <Spinner className="h-4 w-4" />}
              Generate a new QR code
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
}
