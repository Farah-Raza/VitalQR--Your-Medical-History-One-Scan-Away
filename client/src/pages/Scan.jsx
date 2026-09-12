import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../lib/api.js';
import DecisionCard from '../components/DecisionCard.jsx';
import PromoCard from '../components/PromoCard.jsx';
import { Alert, Badge, Button, Card, Input, PageLoader, Spinner } from '../components/ui.jsx';

/**
 * The emergency view.
 *
 * Design rules, all driven by who reads this and when:
 *  - No login and no nav. One page, one job.
 *  - The only promotional block sits dead last, after the OTP section and
 *    marked no-print, so it can never come between a responder and a fact.
 *  - Blood group is the single largest element on screen.
 *  - Allergies come before conditions before medications, which is the order
 *    a responder needs them in.
 *  - "Last updated" is always visible, because stale medical data is the
 *    main clinical risk this system introduces.
 *  - Phone numbers are tel: links, so calling family is one tap.
 */

function timeAgo(iso) {
  if (!iso) return 'unknown';
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days < 1) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months === 1 ? '' : 's'} ago`;
  const years = Math.floor(months / 12);
  return `${years} year${years === 1 ? '' : 's'} ago`;
}

function isStale(iso) {
  if (!iso) return true;
  return Date.now() - new Date(iso).getTime() > 365 * 86_400_000;
}

const SEVERITY_TONE = {
  'life-threatening': 'red',
  severe: 'red',
  moderate: 'amber',
  mild: 'slate',
};

export default function Scan() {
  const { publicId } = useParams();
  const [profile, setProfile] = useState(null);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    api
      .scan(publicId)
      .then(({ profile: p }) => {
        if (cancelled) return;
        setProfile(p);
        setStatus('ready');
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message);
        setStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, [publicId]);

  if (status === 'loading') return <PageLoader label="Opening emergency profile" />;

  if (status === 'error') {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center p-5">
        <Card className="p-6 text-center">
          <h1 className="text-xl font-bold text-slate-900">Profile unavailable</h1>
          <p className="mt-2 text-sm text-slate-600">{error}</p>
          <p className="mt-4 text-xs text-slate-500">
            This code may have been revoked by its owner, or it may not be a VitalQR code. In an
            emergency, call your local emergency number now.
          </p>
        </Card>
      </div>
    );
  }

  const stale = isStale(profile.lastUpdated);

  return (
    <div className="min-h-screen bg-slate-100 pb-12">
      <header className="bg-brand-700 px-4 py-3 text-white no-print">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <span className="text-sm font-bold tracking-tight">VitalQR Emergency Profile</span>
          <span className="rounded bg-white/15 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider">
            Read only
          </span>
        </div>
      </header>

      <div className="mx-auto max-w-2xl space-y-4 p-4">
        <Card className="print-card overflow-hidden">
          <div className="flex flex-wrap items-center gap-4 border-b border-slate-200 p-5">
            <div className="flex h-24 w-24 shrink-0 flex-col items-center justify-center rounded-xl bg-brand-600 text-white shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-widest opacity-80">
                Blood
              </span>
              <span className="text-3xl font-black leading-none">{profile.bloodGroup}</span>
            </div>

            <div className="min-w-0 flex-1">
              <h1 className="truncate text-2xl font-extrabold text-slate-900">
                {profile.fullName || 'Unnamed profile'}
              </h1>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                {profile.age !== null && profile.age !== undefined && (
                  <Badge>{profile.age} years</Badge>
                )}
                {profile.organDonor && <Badge tone="emerald">Organ donor</Badge>}
                <Badge tone={stale ? 'red' : 'slate'}>Updated {timeAgo(profile.lastUpdated)}</Badge>
              </div>
            </div>
          </div>

          {stale && (
            <div className="border-b border-amber-200 bg-amber-50 px-5 py-3 text-sm text-amber-900">
              <strong className="font-semibold">This profile has not been updated in over a year.</strong>{' '}
              Treat the details below as unverified and confirm clinically where possible.
            </div>
          )}

          <div className="divide-y divide-slate-200">
            <FactSection
              title="Allergies"
              empty="No allergies recorded"
              count={profile.allergies.length}
              urgent
            >
              {profile.allergies.map((a, i) => (
                <li key={i} className="flex flex-wrap items-center gap-2 py-1.5">
                  <span className="text-[15px] font-bold text-slate-900">{a.substance}</span>
                  <Badge tone={SEVERITY_TONE[a.severity] || 'slate'}>{a.severity}</Badge>
                  {a.reaction && <span className="text-sm text-slate-600">{a.reaction}</span>}
                </li>
              ))}
            </FactSection>

            <FactSection
              title="Chronic conditions"
              empty="No chronic conditions recorded"
              count={profile.conditions.length}
            >
              {profile.conditions.map((c, i) => (
                <li key={i} className="py-1.5">
                  <span className="text-[15px] font-semibold text-slate-900">{c.name}</span>
                  {c.notes && <span className="ml-2 text-sm text-slate-600">{c.notes}</span>}
                </li>
              ))}
            </FactSection>

            <FactSection
              title="Current medications"
              empty="No medications recorded"
              count={profile.medications.length}
            >
              {profile.medications.map((m, i) => (
                <li key={i} className="py-1.5">
                  <span className="text-[15px] font-semibold text-slate-900">{m.name}</span>
                  {(m.dose || m.frequency) && (
                    <span className="ml-2 text-sm text-slate-600">
                      {[m.dose, m.frequency].filter(Boolean).join(' - ')}
                    </span>
                  )}
                </li>
              ))}
            </FactSection>

            {profile.notes && (
              <div className="p-5">
                <SectionLabel>Additional notes</SectionLabel>
                <p className="mt-2 text-[15px] leading-relaxed text-slate-800">{profile.notes}</p>
              </div>
            )}
          </div>
        </Card>

        <Card className="print-card p-5">
          <SectionLabel>Emergency contacts</SectionLabel>
          <ul className="mt-3 space-y-2">
            {profile.emergencyContacts.map((c, i) => (
              <li
                key={i}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900">{c.name}</p>
                  {c.relation && <p className="text-xs text-slate-500">{c.relation}</p>}
                </div>
                <a
                  href={`tel:${c.phone.replace(/\s/g, '')}`}
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3.5 py-2 text-sm font-bold text-white transition hover:bg-emerald-700"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
                    <path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.6.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.6a1 1 0 0 1-.25 1l-2.22 2.2Z" />
                  </svg>
                  {c.phone}
                </a>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="print-card p-5">
          <SectionLabel>Emergency Decision Card</SectionLabel>
          <p className="mb-3 mt-1 text-sm text-slate-500">
            Generated from the facts above. Prompts only, not instructions to treat.
          </p>
          <DecisionCard items={profile.decisionCard} disclaimer={profile.disclaimer} />
        </Card>

        <ProtectedRecord publicId={publicId} available={profile.hasProtectedRecord} />

        <PromoCard ownerName={profile.fullName} />

        <div className="no-print flex flex-wrap items-center justify-between gap-3 px-1 pt-2">
          <p className="text-xs text-slate-500">
            Profile ID {publicId}
          </p>
          <Button variant="secondary" size="sm" onClick={() => window.print()}>
            Print fallback card
          </Button>
        </div>
      </div>
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500">{children}</h2>
  );
}

function FactSection({ title, children, count, empty, urgent = false }) {
  return (
    <div className={`p-5 ${urgent && count > 0 ? 'bg-red-50/40' : ''}`}>
      <div className="flex items-center gap-2">
        <SectionLabel>{title}</SectionLabel>
        {count > 0 && (
          <span className="rounded-full bg-slate-200 px-1.5 text-[11px] font-bold text-slate-700">
            {count}
          </span>
        )}
      </div>
      {count === 0 ? (
        <p className="mt-2 text-sm text-slate-500">{empty}</p>
      ) : (
        <ul className="mt-2 divide-y divide-slate-100">{children}</ul>
      )}
    </div>
  );
}

/**
 * The OTP gate.
 *
 * The code goes to the patient's registered emergency contact, not to the
 * person scanning, so consent to release the full history stays with the
 * family. Critical fields above remain readable throughout, which is the
 * "emergency contact unavailable" failure mode from the safety plan.
 */
function ProtectedRecord({ publicId, available }) {
  const [stage, setStage] = useState('idle');
  const [contacts, setContacts] = useState([]);
  const [contactIndex, setContactIndex] = useState(0);
  const [session, setSession] = useState(null);
  const [code, setCode] = useState('');
  const [full, setFull] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const openPicker = useCallback(async () => {
    setError('');
    setBusy(true);
    try {
      const { contacts: list } = await api.scanContacts(publicId);
      setContacts(list);
      setStage('choose');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }, [publicId]);

  async function sendCode() {
    setError('');
    setBusy(true);
    try {
      const result = await api.requestOtp(publicId, { contactIndex });
      setSession(result);
      setStage('verify');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function submitCode(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const { profile } = await api.verifyOtp(publicId, { sessionId: session.sessionId, code });
      setFull(profile);
      setStage('unlocked');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (!available && stage === 'idle') {
    return (
      <Card className="no-print p-5">
        <SectionLabel>Full medical record</SectionLabel>
        <p className="mt-2 text-sm text-slate-600">
          This profile has no additional protected record on file. Everything the owner recorded is
          shown above.
        </p>
      </Card>
    );
  }

  if (stage === 'unlocked' && full) {
    return (
      <Card className="p-5">
        <div className="flex items-center gap-2">
          <SectionLabel>Full medical record</SectionLabel>
          <Badge tone="emerald">Unlocked</Badge>
        </div>

        <div className="mt-4 space-y-5">
          {full.dateOfBirth && <KeyValue label="Date of birth" value={full.dateOfBirth} />}
          {full.address && <KeyValue label="Address" value={full.address} />}

          {full.primaryPhysician?.name && (
            <div>
              <SectionLabel>Primary physician</SectionLabel>
              <p className="mt-1.5 text-[15px] text-slate-800">
                {full.primaryPhysician.name}
                {full.primaryPhysician.hospital ? `, ${full.primaryPhysician.hospital}` : ''}
              </p>
              {full.primaryPhysician.phone && (
                <a
                  href={`tel:${full.primaryPhysician.phone.replace(/\s/g, '')}`}
                  className="text-sm font-semibold text-brand-700 underline"
                >
                  {full.primaryPhysician.phone}
                </a>
              )}
            </div>
          )}

          {full.medicalHistory?.length > 0 && (
            <div>
              <SectionLabel>Medical history</SectionLabel>
              <ul className="mt-2 space-y-2">
                {full.medicalHistory.map((h, i) => (
                  <li key={i} className="rounded-lg border border-slate-200 p-3">
                    <p className="font-semibold text-slate-900">
                      {h.title} {h.year ? <span className="text-slate-500">({h.year})</span> : null}
                    </p>
                    {h.details && <p className="mt-1 text-sm text-slate-600">{h.details}</p>}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {full.pastSurgeries?.length > 0 && (
            <div>
              <SectionLabel>Past surgeries</SectionLabel>
              <ul className="mt-2 list-inside list-disc text-[15px] text-slate-800">
                {full.pastSurgeries.map((s, i) => (
                  <li key={i}>
                    {s.procedure} {s.year ? `(${s.year})` : ''}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {full.insurance?.provider && (
            <div>
              <SectionLabel>Insurance</SectionLabel>
              <p className="mt-1.5 text-[15px] text-slate-800">
                {full.insurance.provider}
                {full.insurance.policyNumber ? ` - ${full.insurance.policyNumber}` : ''}
                {full.insurance.validTill ? ` (valid till ${full.insurance.validTill})` : ''}
              </p>
            </div>
          )}
        </div>

        <p className="mt-5 text-xs text-slate-500">
          This access has been recorded in the profile owner&apos;s audit log.
        </p>
      </Card>
    );
  }

  return (
    <Card className="no-print p-5">
      <div className="flex items-center gap-2">
        <svg viewBox="0 0 24 24" className="h-4 w-4 text-slate-500" fill="currentColor" aria-hidden="true">
          <path d="M12 1a5 5 0 0 1 5 5v3h1a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V11a2 2 0 0 1 2-2h1V6a5 5 0 0 1 5-5Zm3 8V6a3 3 0 1 0-6 0v3h6Z" />
        </svg>
        <SectionLabel>Full medical record</SectionLabel>
      </div>

      {stage === 'idle' && (
        <>
          <p className="mt-2 text-sm text-slate-600">
            Medical history, past surgeries and insurance details are protected. Unlocking sends a
            6-digit code to this patient&apos;s registered emergency contact.
          </p>
          <Button onClick={openPicker} disabled={busy} className="mt-4" variant="dark">
            {busy && <Spinner className="h-4 w-4" />}
            Request access
          </Button>
        </>
      )}

      {stage === 'choose' && (
        <>
          <p className="mt-2 text-sm text-slate-600">
            Choose who should receive the verification code.
          </p>
          <div className="mt-3 space-y-2">
            {contacts.map((c) => (
              <label
                key={c.index}
                className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition ${
                  contactIndex === c.index
                    ? 'border-brand-400 bg-brand-50'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="otp-contact"
                  checked={contactIndex === c.index}
                  onChange={() => setContactIndex(c.index)}
                  className="accent-brand-600"
                />
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-slate-900">{c.name}</span>
                  <span className="block text-xs text-slate-500">
                    {[c.relation, c.phoneMasked].filter(Boolean).join(' - ')}
                  </span>
                </span>
              </label>
            ))}
          </div>
          <div className="mt-4 flex gap-2">
            <Button onClick={sendCode} disabled={busy || !contacts.length}>
              {busy && <Spinner className="h-4 w-4" />}
              Send code
            </Button>
            <Button variant="ghost" onClick={() => setStage('idle')} disabled={busy}>
              Cancel
            </Button>
          </div>
        </>
      )}

      {stage === 'verify' && session && (
        <form onSubmit={submitCode} className="mt-2">
          <p className="text-sm text-slate-600">
            A 6-digit code was sent to {session.recipientName} at{' '}
            <span className="font-semibold">{session.recipientMasked}</span>. It expires in{' '}
            {Math.round(session.expiresInSeconds / 60)} minutes.
          </p>

          {session.devCode && (
            <Alert tone="info" className="mt-3">
              Demo mode: SMS delivery is off, so the code is shown here and printed in the server
              terminal. Code <strong className="font-mono text-base">{session.devCode}</strong>
            </Alert>
          )}

          <Input
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="000000"
            aria-label="6-digit verification code"
            className="mt-3 text-center font-mono text-2xl tracking-[0.4em]"
          />

          <div className="mt-4 flex gap-2">
            <Button type="submit" disabled={busy || code.length !== 6}>
              {busy && <Spinner className="h-4 w-4" />}
              Unlock record
            </Button>
            <Button type="button" variant="ghost" onClick={() => setStage('choose')} disabled={busy}>
              Back
            </Button>
          </div>
        </form>
      )}

      {error && (
        <Alert tone="error" className="mt-4">
          {error}
        </Alert>
      )}
    </Card>
  );
}

function KeyValue({ label, value }) {
  return (
    <div>
      <SectionLabel>{label}</SectionLabel>
      <p className="mt-1 text-[15px] text-slate-800">{value}</p>
    </div>
  );
}
