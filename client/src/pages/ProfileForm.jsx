import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';
import RepeatableList from '../components/RepeatableList.jsx';
import DecisionCard from '../components/DecisionCard.jsx';
import {
  Alert,
  Button,
  Card,
  Field,
  Input,
  PageLoader,
  SectionHeading,
  Select,
  Spinner,
  Textarea,
} from '../components/ui.jsx';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown'];
const SEVERITIES = ['mild', 'moderate', 'severe', 'life-threatening'];

const EMPTY_EMERGENCY = {
  fullName: '',
  bloodGroup: 'Unknown',
  dateOfBirth: '',
  organDonor: false,
  allergies: [],
  conditions: [],
  medications: [],
  emergencyContacts: [{ name: '', relation: '', phone: '' }],
  notes: '',
};

const EMPTY_PRIVATE = {
  medicalHistory: [],
  pastSurgeries: [],
  insurance: { provider: '', policyNumber: '', validTill: '' },
  primaryPhysician: { name: '', hospital: '', phone: '' },
  address: '',
};

/**
 * The profile editor, split along the same boundary the server enforces:
 * the "Emergency" tab is what a public scan reveals, the "Protected" tab is
 * what an OTP unlocks. Showing that split in the UI is the point - the user
 * should always know which tab they are typing into.
 */
export default function ProfileForm() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('emergency');
  const [emergency, setEmergency] = useState(EMPTY_EMERGENCY);
  const [priv, setPriv] = useState(EMPTY_PRIVATE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState('');
  const [error, setError] = useState('');
  const [fields, setFields] = useState({});
  const [preview, setPreview] = useState([]);
  const [isNew, setIsNew] = useState(true);

  useEffect(() => {
    api
      .getProfile()
      .then(({ profile, decisionCard }) => {
        if (profile) {
          setIsNew(false);
          setEmergency({ ...EMPTY_EMERGENCY, ...profile.emergency });
          setPriv({
            ...EMPTY_PRIVATE,
            ...profile.private,
            insurance: { ...EMPTY_PRIVATE.insurance, ...(profile.private?.insurance || {}) },
            primaryPhysician: {
              ...EMPTY_PRIVATE.primaryPhysician,
              ...(profile.private?.primaryPhysician || {}),
            },
          });
          setPreview(decisionCard || []);
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const setE = (key, value) => {
    setEmergency((p) => ({ ...p, [key]: value }));
    setSaved('');
  };
  const setP = (key, value) => {
    setPriv((p) => ({ ...p, [key]: value }));
    setSaved('');
  };

  async function saveEmergency(e) {
    e.preventDefault();
    setError('');
    setFields({});
    setSaving(true);
    try {
      const { decisionCard } = await api.saveEmergency(emergency);
      setPreview(decisionCard || []);
      setSaved('Emergency profile saved.');
      if (isNew) {
        setIsNew(false);
        navigate('/qr');
      }
    } catch (err) {
      setError(err.message);
      setFields(err.fields || {});
    } finally {
      setSaving(false);
    }
  }

  async function savePrivate(e) {
    e.preventDefault();
    setError('');
    setFields({});
    setSaving(true);
    try {
      await api.savePrivate(priv);
      setSaved('Protected record saved.');
    } catch (err) {
      setError(err.message);
      setFields(err.fields || {});
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <PageLoader label="Loading your profile" />;

  return (
    <div>
      <SectionHeading
        title="Medical profile"
        description="Everything on the Emergency tab is visible to anyone who scans your QR. The Protected tab needs an OTP."
      />

      <div className="mb-5 inline-flex rounded-lg border border-slate-200 bg-white p-1">
        <TabButton active={tab === 'emergency'} onClick={() => setTab('emergency')}>
          Emergency (public)
        </TabButton>
        <TabButton active={tab === 'private'} onClick={() => setTab('private')} disabled={isNew}>
          Protected (OTP)
        </TabButton>
      </div>

      {error && (
        <Alert tone="error" className="mb-4">
          {error}
        </Alert>
      )}
      {saved && (
        <Alert tone="success" className="mb-4">
          {saved}
        </Alert>
      )}
      {isNew && tab === 'emergency' && (
        <Alert tone="info" className="mb-4">
          Save your emergency details first. Your QR code is generated the moment you do.
        </Alert>
      )}

      {tab === 'emergency' ? (
        <form onSubmit={saveEmergency} className="space-y-5" noValidate>
          <Card className="p-5">
            <h3 className="mb-4 font-bold text-slate-900">Identity and blood group</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Full name" required error={fields.fullName}>
                <Input
                  value={emergency.fullName}
                  onChange={(e) => setE('fullName', e.target.value)}
                  invalid={Boolean(fields.fullName)}
                  placeholder="As it should appear to a responder"
                />
              </Field>

              <Field label="Blood group" required error={fields.bloodGroup}>
                <Select
                  value={emergency.bloodGroup}
                  onChange={(e) => setE('bloodGroup', e.target.value)}
                >
                  {BLOOD_GROUPS.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field
                label="Date of birth"
                hint="Only your age is shown on a public scan, never the full date."
                error={fields.dateOfBirth}
              >
                <Input
                  type="date"
                  value={emergency.dateOfBirth}
                  onChange={(e) => setE('dateOfBirth', e.target.value)}
                />
              </Field>

              <div className="flex items-end pb-1">
                <label className="flex cursor-pointer items-center gap-2.5">
                  <input
                    type="checkbox"
                    checked={emergency.organDonor}
                    onChange={(e) => setE('organDonor', e.target.checked)}
                    className="h-4 w-4 accent-brand-600"
                  />
                  <span className="text-sm font-medium text-slate-700">
                    I am a registered organ donor
                  </span>
                </label>
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="mb-1 font-bold text-slate-900">Allergies</h3>
            <p className="mb-4 text-sm text-slate-500">
              The single most acted-on field in an emergency. Include drug, food and material
              allergies.
            </p>
            <RepeatableList
              items={emergency.allergies}
              onChange={(v) => setE('allergies', v)}
              newItem={{ substance: '', reaction: '', severity: 'moderate' }}
              addLabel="Add allergy"
              emptyLabel="No allergies added."
              errors={fields}
              fieldPrefix="allergies"
              renderRow={(item, update) => (
                <div className="grid gap-3 sm:grid-cols-3">
                  <Field label="Allergen" required>
                    <Input
                      value={item.substance}
                      onChange={(e) => update('substance', e.target.value)}
                      placeholder="e.g. Penicillin"
                    />
                  </Field>
                  <Field label="Reaction">
                    <Input
                      value={item.reaction}
                      onChange={(e) => update('reaction', e.target.value)}
                      placeholder="e.g. Anaphylaxis"
                    />
                  </Field>
                  <Field label="Severity">
                    <Select value={item.severity} onChange={(e) => update('severity', e.target.value)}>
                      {SEVERITIES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </Select>
                  </Field>
                </div>
              )}
            />
          </Card>

          <Card className="p-5">
            <h3 className="mb-4 font-bold text-slate-900">Chronic conditions</h3>
            <RepeatableList
              items={emergency.conditions}
              onChange={(v) => setE('conditions', v)}
              newItem={{ name: '', notes: '', diagnosedYear: '' }}
              addLabel="Add condition"
              emptyLabel="No chronic conditions added."
              errors={fields}
              fieldPrefix="conditions"
              renderRow={(item, update) => (
                <div className="grid gap-3 sm:grid-cols-3">
                  <Field label="Condition" required>
                    <Input
                      value={item.name}
                      onChange={(e) => update('name', e.target.value)}
                      placeholder="e.g. Type 1 diabetes"
                    />
                  </Field>
                  <Field label="Notes" className="sm:col-span-2">
                    <Input
                      value={item.notes}
                      onChange={(e) => update('notes', e.target.value)}
                      placeholder="Anything a responder should know"
                    />
                  </Field>
                </div>
              )}
            />
          </Card>

          <Card className="p-5">
            <h3 className="mb-4 font-bold text-slate-900">Current medications</h3>
            <RepeatableList
              items={emergency.medications}
              onChange={(v) => setE('medications', v)}
              newItem={{ name: '', dose: '', frequency: '' }}
              addLabel="Add medication"
              emptyLabel="No medications added."
              errors={fields}
              fieldPrefix="medications"
              renderRow={(item, update) => (
                <div className="grid gap-3 sm:grid-cols-3">
                  <Field label="Medication" required>
                    <Input
                      value={item.name}
                      onChange={(e) => update('name', e.target.value)}
                      placeholder="e.g. Warfarin"
                    />
                  </Field>
                  <Field label="Dose">
                    <Input
                      value={item.dose}
                      onChange={(e) => update('dose', e.target.value)}
                      placeholder="e.g. 5 mg"
                    />
                  </Field>
                  <Field label="Frequency">
                    <Input
                      value={item.frequency}
                      onChange={(e) => update('frequency', e.target.value)}
                      placeholder="e.g. Once daily"
                    />
                  </Field>
                </div>
              )}
            />
          </Card>

          <Card className="p-5">
            <h3 className="mb-1 font-bold text-slate-900">Emergency contacts</h3>
            <p className="mb-4 text-sm text-slate-500">
              Shown in full on a scan so a responder can call immediately. The first contact also
              receives OTP requests for your protected record.
            </p>
            <RepeatableList
              items={emergency.emergencyContacts}
              onChange={(v) => setE('emergencyContacts', v)}
              newItem={{ name: '', relation: '', phone: '' }}
              addLabel="Add contact"
              minItems={1}
              errors={fields}
              fieldPrefix="emergencyContacts"
              renderRow={(item, update) => (
                <div className="grid gap-3 sm:grid-cols-3">
                  <Field label="Name" required>
                    <Input value={item.name} onChange={(e) => update('name', e.target.value)} />
                  </Field>
                  <Field label="Relationship">
                    <Input
                      value={item.relation}
                      onChange={(e) => update('relation', e.target.value)}
                      placeholder="e.g. Mother"
                    />
                  </Field>
                  <Field label="Phone" required>
                    <Input
                      type="tel"
                      value={item.phone}
                      onChange={(e) => update('phone', e.target.value)}
                      placeholder="+91 98765 43210"
                    />
                  </Field>
                </div>
              )}
            />
            {fields.emergencyContacts && (
              <p className="mt-2 text-xs font-medium text-red-600">{fields.emergencyContacts}</p>
            )}
          </Card>

          <Card className="p-5">
            <Field
              label="Additional notes"
              hint="Anything else a responder should see. Keep it short."
            >
              <Textarea
                value={emergency.notes}
                onChange={(e) => setE('notes', e.target.value)}
                placeholder="e.g. Hearing impaired, communicates by writing"
              />
            </Field>
          </Card>

          {preview.length > 0 && (
            <Card className="p-5">
              <h3 className="mb-1 font-bold text-slate-900">
                Your Emergency Decision Card preview
              </h3>
              <p className="mb-4 text-sm text-slate-500">
                This is what responders will be prompted with, generated from the facts above.
              </p>
              <DecisionCard items={preview} compact />
            </Card>
          )}

          <div className="sticky bottom-0 -mx-4 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur">
            <Button type="submit" disabled={saving} size="lg">
              {saving && <Spinner className="h-4 w-4" />}
              {isNew ? 'Save and generate my QR' : 'Save emergency profile'}
            </Button>
          </div>
        </form>
      ) : (
        <form onSubmit={savePrivate} className="space-y-5" noValidate>
          <Alert tone="warning">
            Nothing on this tab appears on a public scan. It is released only after someone verifies
            a one-time code sent to your emergency contact.
          </Alert>

          <Card className="p-5">
            <h3 className="mb-4 font-bold text-slate-900">Medical history</h3>
            <RepeatableList
              items={priv.medicalHistory}
              onChange={(v) => setP('medicalHistory', v)}
              newItem={{ title: '', year: '', details: '' }}
              addLabel="Add entry"
              emptyLabel="No history added."
              errors={fields}
              fieldPrefix="medicalHistory"
              renderRow={(item, update) => (
                <div className="grid gap-3">
                  <div className="grid gap-3 sm:grid-cols-4">
                    <Field label="Title" required className="sm:col-span-3">
                      <Input
                        value={item.title}
                        onChange={(e) => update('title', e.target.value)}
                        placeholder="e.g. Myocardial infarction"
                      />
                    </Field>
                    <Field label="Year">
                      <Input value={item.year} onChange={(e) => update('year', e.target.value)} />
                    </Field>
                  </div>
                  <Field label="Details">
                    <Input value={item.details} onChange={(e) => update('details', e.target.value)} />
                  </Field>
                </div>
              )}
            />
          </Card>

          <Card className="p-5">
            <h3 className="mb-4 font-bold text-slate-900">Past surgeries</h3>
            <RepeatableList
              items={priv.pastSurgeries}
              onChange={(v) => setP('pastSurgeries', v)}
              newItem={{ procedure: '', year: '' }}
              addLabel="Add surgery"
              emptyLabel="No surgeries added."
              errors={fields}
              fieldPrefix="pastSurgeries"
              renderRow={(item, update) => (
                <div className="grid gap-3 sm:grid-cols-4">
                  <Field label="Procedure" required className="sm:col-span-3">
                    <Input
                      value={item.procedure}
                      onChange={(e) => update('procedure', e.target.value)}
                    />
                  </Field>
                  <Field label="Year">
                    <Input value={item.year} onChange={(e) => update('year', e.target.value)} />
                  </Field>
                </div>
              )}
            />
          </Card>

          <Card className="p-5">
            <h3 className="mb-4 font-bold text-slate-900">Primary physician</h3>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Name">
                <Input
                  value={priv.primaryPhysician.name}
                  onChange={(e) =>
                    setP('primaryPhysician', { ...priv.primaryPhysician, name: e.target.value })
                  }
                />
              </Field>
              <Field label="Hospital or clinic">
                <Input
                  value={priv.primaryPhysician.hospital}
                  onChange={(e) =>
                    setP('primaryPhysician', { ...priv.primaryPhysician, hospital: e.target.value })
                  }
                />
              </Field>
              <Field label="Phone">
                <Input
                  type="tel"
                  value={priv.primaryPhysician.phone}
                  onChange={(e) =>
                    setP('primaryPhysician', { ...priv.primaryPhysician, phone: e.target.value })
                  }
                />
              </Field>
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="mb-4 font-bold text-slate-900">Insurance</h3>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Provider">
                <Input
                  value={priv.insurance.provider}
                  onChange={(e) => setP('insurance', { ...priv.insurance, provider: e.target.value })}
                />
              </Field>
              <Field label="Policy number">
                <Input
                  value={priv.insurance.policyNumber}
                  onChange={(e) =>
                    setP('insurance', { ...priv.insurance, policyNumber: e.target.value })
                  }
                />
              </Field>
              <Field label="Valid till">
                <Input
                  value={priv.insurance.validTill}
                  onChange={(e) => setP('insurance', { ...priv.insurance, validTill: e.target.value })}
                />
              </Field>
            </div>
          </Card>

          <Card className="p-5">
            <Field label="Home address">
              <Textarea value={priv.address} onChange={(e) => setP('address', e.target.value)} />
            </Field>
          </Card>

          <div className="sticky bottom-0 -mx-4 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur">
            <Button type="submit" disabled={saving} size="lg">
              {saving && <Spinner className="h-4 w-4" />}
              Save protected record
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

function TabButton({ active, children, ...props }) {
  return (
    <button
      type="button"
      className={`rounded-md px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${
        active ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-100'
      }`}
      {...props}
    >
      {children}
    </button>
  );
}
