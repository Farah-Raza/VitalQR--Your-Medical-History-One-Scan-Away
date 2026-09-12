import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import DecisionCard from '../components/DecisionCard.jsx';
import { Alert, Badge, Button, Card, PageLoader, SectionHeading } from '../components/ui.jsx';

const AUDIT_LABELS = {
  emergency_profile_created: 'Emergency profile created',
  emergency_profile_updated: 'Emergency profile updated',
  private_record_updated: 'Protected record updated',
  qr_rotated: 'QR code regenerated',
  emergency_view_opened: 'Someone opened your emergency profile',
  otp_requested: 'Full-record access requested',
  otp_failed: 'Incorrect verification code entered',
  record_unlocked: 'Full record unlocked',
};

const AUDIT_TONE = {
  record_unlocked: 'red',
  otp_failed: 'amber',
  otp_requested: 'amber',
  emergency_view_opened: 'slate',
};

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [audit, setAudit] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([api.getProfile(), api.getAudit().catch(() => ({ entries: [] }))])
      .then(([profile, auditRes]) => {
        setData(profile);
        setAudit(auditRes.entries || []);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <PageLoader label="Loading your dashboard" />;

  const firstName = (user?.displayName || '').split(' ')[0];
  const profile = data?.profile;
  const e = profile?.emergency;

  if (!profile) {
    return (
      <div>
        <SectionHeading title={firstName ? `Welcome, ${firstName}` : 'Welcome'} />
        <Card className="p-8 text-center">
          <h2 className="text-lg font-bold text-slate-900">Your profile is empty</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-600">
            Add your blood group, allergies, conditions, medications and emergency contacts. Your QR
            code is generated the moment you save.
          </p>
          <Button as={Link} to="/profile" size="lg" className="mt-5">
            Create my emergency profile
          </Button>
        </Card>
      </div>
    );
  }

  const completeness = [
    Boolean(e.fullName),
    e.bloodGroup && e.bloodGroup !== 'Unknown',
    e.allergies?.length > 0,
    e.conditions?.length > 0 || e.medications?.length > 0,
    e.emergencyContacts?.length > 0,
  ];
  const filled = completeness.filter(Boolean).length;

  return (
    <div className="space-y-5">
      <SectionHeading
        title={firstName ? `Welcome back, ${firstName}` : 'Dashboard'}
        description={`Profile last updated ${new Date(profile.updatedAt).toLocaleDateString()}`}
        action={
          <Button as={Link} to="/profile" variant="secondary" size="sm">
            Edit profile
          </Button>
        }
      />

      {error && <Alert tone="error">{error}</Alert>}

      <div className="grid gap-5 sm:grid-cols-3">
        <Card className="p-5">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Blood group</p>
          <p className="mt-1 text-3xl font-black text-brand-600">{e.bloodGroup}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Allergies</p>
          <p className="mt-1 text-3xl font-black text-slate-900">{e.allergies?.length || 0}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Medications</p>
          <p className="mt-1 text-3xl font-black text-slate-900">{e.medications?.length || 0}</p>
        </Card>
      </div>

      {filled < 5 && (
        <Alert tone="info" title={`Profile ${filled} of 5 sections complete`}>
          A fuller profile gives responders more to work with.{' '}
          <Link to="/profile" className="font-semibold underline">
            Finish it now
          </Link>
          .
        </Alert>
      )}

      <div className="grid gap-5 md:grid-cols-[auto_1fr]">
        {data.qr && (
          <Card className="flex flex-col items-center p-5">
            <img src={data.qr.dataUrl} alt="Your QR code" className="h-36 w-36 rounded-lg" />
            <Button as={Link} to="/qr" variant="secondary" size="sm" className="mt-3">
              Download or print
            </Button>
          </Card>
        )}

        <Card className="p-5">
          <h3 className="font-bold text-slate-900">Your Emergency Decision Card</h3>
          <p className="mb-4 mt-1 text-sm text-slate-500">
            What a responder is prompted with when they scan your code.
          </p>
          <DecisionCard items={data.decisionCard || []} compact />
        </Card>
      </div>

      <Card className="p-5">
        <h3 className="font-bold text-slate-900">Access log</h3>
        <p className="mb-4 mt-1 text-sm text-slate-500">
          Every scan, unlock request and profile change, newest first.
        </p>

        {audit.length === 0 ? (
          <p className="text-sm text-slate-500">No activity recorded yet.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {audit.slice(0, 25).map((entry, i) => (
              <li key={i} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                <span className="flex items-center gap-2 text-sm text-slate-800">
                  <Badge tone={AUDIT_TONE[entry.type] || 'slate'}>
                    {entry.type === 'record_unlocked' ? 'Unlocked' : 'Event'}
                  </Badge>
                  {AUDIT_LABELS[entry.type] || entry.type}
                </span>
                <span className="text-xs text-slate-500">
                  {new Date(entry.at).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
