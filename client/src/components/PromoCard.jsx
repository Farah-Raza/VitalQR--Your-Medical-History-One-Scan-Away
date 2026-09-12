import { Link } from 'react-router-dom';
import { Button, Card, Logo } from './ui.jsx';
import InstallApp from './InstallApp.jsx';

/**
 * The acquisition pitch shown to whoever scanned someone else's code.
 *
 * Placed last on the page and marked no-print on purpose. Whoever is reading
 * a scan may be standing over a patient, so this never competes with the
 * medical facts: it sits below them, in quiet type, after the reader has had
 * everything they came for.
 */
export default function PromoCard({ ownerName }) {
  const first = (ownerName || '').trim().split(/\s+/)[0];

  return (
    <Card className="no-print overflow-hidden">
      <div className="border-b border-slate-200 bg-slate-50 px-5 py-3">
        <Logo className="text-sm text-slate-700" />
      </div>

      <div className="p-5">
        <h2 className="text-base font-bold text-slate-900">
          {first ? `${first} carries an emergency profile. You can too.` : 'Carry your own emergency profile'}
        </h2>
        <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
          If you were unconscious right now, a responder would have no way to learn your blood
          group, allergies or medications. VitalQR puts them one camera scan away &mdash; print it,
          wear it, or keep it on your lock screen.
        </p>

        <ul className="mt-3 grid gap-1.5 text-sm text-slate-700">
          {[
            'Free, and takes about two minutes to set up',
            'Works from any phone camera, with no app and no login for the responder',
            'Your full medical history stays locked behind a one-time code',
          ].map((line) => (
            <li key={line} className="flex items-start gap-2">
              <svg
                viewBox="0 0 24 24"
                className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M9.6 16.6 4.8 11.8l1.4-1.4 3.4 3.4 8-8 1.4 1.4-9.4 9.4Z" />
              </svg>
              {line}
            </li>
          ))}
        </ul>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button as={Link} to="/signup">
            Create my free card
          </Button>
          <InstallApp />
        </div>
      </div>
    </Card>
  );
}
