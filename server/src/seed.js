import bcrypt from 'bcryptjs';
import { initStore, getStore } from './store/index.js';
import { scanUrlFor } from './services/qrService.js';
import { buildDecisionCard } from './lib/decisionCard.js';

/**
 * Seeds one realistic demo profile.
 *
 * Worth having for the exhibition: it means the scan page can be shown on a
 * phone without anyone typing a profile in first, and the demo patient is
 * built to trigger several Decision Card rules at once (penicillin allergy,
 * diabetes on insulin, warfarin, Rh-negative blood) so the feature has
 * something to actually say.
 *
 * Run with:  npm run seed --prefix server
 */

const DEMO = {
  email: 'demo@vitalqr.app',
  password: 'demo12345',
  displayName: 'Aarav Sharma',
  emergency: {
    fullName: 'Aarav Sharma',
    bloodGroup: 'O-',
    dateOfBirth: '1991-04-17',
    organDonor: true,
    allergies: [
      { substance: 'Penicillin', reaction: 'Anaphylaxis', severity: 'life-threatening' },
      { substance: 'Peanuts', reaction: 'Swelling, breathlessness', severity: 'severe' },
    ],
    conditions: [
      { name: 'Type 1 diabetes', notes: 'Insulin dependent since 2009', diagnosedYear: 2009 },
      { name: 'Atrial fibrillation', notes: 'On long-term anticoagulation', diagnosedYear: 2019 },
    ],
    medications: [
      { name: 'Insulin glargine', dose: '18 units', frequency: 'At night' },
      { name: 'Warfarin', dose: '5 mg', frequency: 'Once daily' },
    ],
    emergencyContacts: [
      { name: 'Priya Sharma', relation: 'Wife', phone: '+91 98765 43210' },
      { name: 'Rohan Sharma', relation: 'Brother', phone: '+91 91234 56780' },
    ],
    notes: 'Carries an insulin pen and a glucose gel in his backpack.',
  },
  private: {
    medicalHistory: [
      {
        title: 'Diabetic ketoacidosis, admitted 4 days',
        year: 2018,
        details: 'Triggered by a viral illness. Recovered fully.',
      },
      { title: 'Atrial fibrillation diagnosed', year: 2019, details: 'Started on warfarin.' },
    ],
    pastSurgeries: [{ procedure: 'Appendectomy', year: 2012 }],
    insurance: { provider: 'Star Health', policyNumber: 'SH-4471-2290', validTill: '2027-03-31' },
    primaryPhysician: {
      name: 'Dr. Meera Iyer',
      hospital: 'City General Hospital, Bhopal',
      phone: '+91 75500 11220',
    },
    address: '12 Rose Villa, Kolar Road, Bhopal, MP 462042',
  },
};

async function main() {
  await initStore();
  const store = getStore();

  let user = await store.getUserByEmail(DEMO.email);
  if (user) {
    console.log(`Demo user already exists (${DEMO.email}). Refreshing the profile.`);
  } else {
    user = await store.createUser({
      email: DEMO.email,
      passwordHash: await bcrypt.hash(DEMO.password, 12),
      displayName: DEMO.displayName,
    });
    console.log(`Created demo user ${DEMO.email}`);
  }

  await store.saveProfile(user.uid, { emergency: DEMO.emergency });
  const doc = await store.saveProfile(user.uid, { private: DEMO.private });

  const prompts = buildDecisionCard(DEMO.emergency);

  console.log(`
  Demo profile ready
  -------------------------------------------------
  Sign in     ${DEMO.email} / ${DEMO.password}
  Scan URL    ${scanUrlFor(doc.publicId)}
  Public ID   ${doc.publicId}
  Prompts     ${prompts.length} decision-card rules triggered
  -------------------------------------------------
`);

  process.exit(0);
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
