import { buildDecisionCard, DECISION_CARD_DISCLAIMER } from './decisionCard.js';

/**
 * Privacy tiering.
 * ------------------------------------------------------------------
 * This is the single place where "what a stranger may see" is decided.
 * Every public-facing response is built by `toPublicView`, and it works by
 * WHITELIST: it names the fields it copies out, rather than deleting the
 * sensitive ones. A blacklist would silently start leaking the moment
 * someone adds a new field to the profile schema.
 *
 * Rule of thumb applied below: a field is public only if a paramedic
 * treating an unconscious patient would act differently for knowing it.
 */

/** Age is clinically useful; an exact date of birth is identity-theft fuel. */
export function ageFromDob(dob) {
  if (!dob) return null;
  const then = new Date(dob);
  if (Number.isNaN(then.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - then.getFullYear();
  const m = now.getMonth() - then.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < then.getDate())) age -= 1;
  return age >= 0 && age < 130 ? age : null;
}

/** Keeps the country code and last 2 digits: "+91 98765 43210" -> "+91 XXXXX XX10". */
export function maskPhone(phone) {
  if (!phone) return '';
  const digits = String(phone).replace(/\D/g, '');
  if (digits.length < 4) return 'XXXX';
  const tail = digits.slice(-2);
  const head = String(phone).trim().startsWith('+') ? `+${digits.slice(0, 2)} ` : '';
  return `${head}${'X'.repeat(Math.max(digits.length - (head ? 4 : 2), 3))}${tail}`;
}

/**
 * The emergency view. Returned with NO authentication, to anyone holding
 * the QR. Contact phone numbers are shown in full and on purpose: a
 * responder who cannot actually call the family has learned nothing.
 */
export function toPublicView(doc) {
  if (!doc) return null;
  const e = doc.emergency || {};

  return {
    publicId: doc.publicId,
    fullName: e.fullName || '',
    age: ageFromDob(e.dateOfBirth),
    bloodGroup: e.bloodGroup || 'Unknown',
    organDonor: Boolean(e.organDonor),
    allergies: (e.allergies || []).map((a) => ({
      substance: a.substance,
      reaction: a.reaction || '',
      severity: a.severity || 'moderate',
    })),
    conditions: (e.conditions || []).map((c) => ({
      name: c.name,
      notes: c.notes || '',
    })),
    medications: (e.medications || []).map((m) => ({
      name: m.name,
      dose: m.dose || '',
      frequency: m.frequency || '',
    })),
    emergencyContacts: (e.emergencyContacts || []).map((c) => ({
      name: c.name,
      relation: c.relation || '',
      phone: c.phone,
    })),
    notes: e.notes || '',
    lastUpdated: doc.updatedAt || doc.createdAt || null,
    decisionCard: buildDecisionCard(e),
    disclaimer: DECISION_CARD_DISCLAIMER,
    // Tells the scan page an OTP-gated tier exists, without revealing any of it.
    hasProtectedRecord: hasAnyPrivateData(doc.private),
  };
}

/** The OTP-unlocked view: the public tier plus everything held back. */
export function toFullView(doc) {
  if (!doc) return null;
  const base = toPublicView(doc);
  const p = doc.private || {};
  const e = doc.emergency || {};

  return {
    ...base,
    dateOfBirth: e.dateOfBirth || '',
    medicalHistory: p.medicalHistory || [],
    pastSurgeries: p.pastSurgeries || [],
    insurance: p.insurance || {},
    primaryPhysician: p.primaryPhysician || {},
    address: p.address || '',
  };
}

/** The owner's own editing view. Never reached without a session token. */
export function toOwnerView(doc) {
  if (!doc) return null;
  return {
    publicId: doc.publicId,
    emergency: doc.emergency || {},
    private: doc.private || {},
    createdAt: doc.createdAt || null,
    updatedAt: doc.updatedAt || null,
  };
}

function hasAnyPrivateData(p) {
  if (!p) return false;
  return Boolean(
    p.medicalHistory?.length ||
      p.pastSurgeries?.length ||
      p.address ||
      p.insurance?.provider ||
      p.insurance?.policyNumber ||
      p.primaryPhysician?.name ||
      p.primaryPhysician?.hospital
  );
}
