/**
 * Emergency Decision Card
 * ------------------------------------------------------------------
 * Turns stored medical facts into short, actionable prompts for whoever
 * is standing over the patient. This is the difference between a digital
 * ID card and an emergency support tool.
 *
 * Deliberate design constraints:
 *  - Every rule is a PROMPT or a CAUTION, never a prescription. We never
 *    tell anyone to administer a drug or a dose.
 *  - Matching is keyword-based and intentionally over-inclusive: a missed
 *    warning is far more costly here than a redundant one.
 *  - Rules are data, not code, so a clinician can review this list without
 *    reading JavaScript.
 */

const LEVEL_ORDER = { critical: 0, warning: 1, info: 2 };

const RULES = [
  // ---- Allergy-driven -------------------------------------------------
  {
    id: 'allergy-penicillin',
    level: 'critical',
    match: {
      allergies: ['penicillin', 'amoxicillin', 'ampicillin', 'augmentin', 'beta-lactam', 'betalactam'],
    },
    title: 'Penicillin-class allergy on file',
    action:
      'Avoid penicillin-class antibiotics (amoxicillin, ampicillin, co-amoxiclav). Flag possible cephalosporin cross-reactivity to the treating clinician.',
  },
  {
    id: 'allergy-sulfa',
    level: 'critical',
    match: { allergies: ['sulfa', 'sulphonamide', 'sulfonamide', 'cotrimoxazole', 'bactrim'] },
    title: 'Sulfa allergy on file',
    action:
      'Avoid sulfonamide antibiotics. Check any prepared medication against this allergy before administration.',
  },
  {
    id: 'allergy-nsaid',
    level: 'warning',
    match: { allergies: ['aspirin', 'nsaid', 'ibuprofen', 'diclofenac', 'naproxen'] },
    title: 'NSAID / aspirin allergy on file',
    action: 'Avoid NSAIDs and aspirin for pain relief. Note this before any analgesic is given.',
  },
  {
    id: 'allergy-latex',
    level: 'warning',
    match: { allergies: ['latex', 'rubber'] },
    title: 'Latex allergy on file',
    action: 'Use latex-free gloves, tourniquets, catheters and airway equipment.',
  },
  {
    id: 'allergy-contrast',
    level: 'critical',
    match: { allergies: ['contrast', 'iodine', 'iodinated', 'gadolinium'] },
    title: 'Contrast-media allergy on file',
    action:
      'Inform imaging before any contrast-enhanced CT or MRI. Premedication may be required.',
  },
  {
    id: 'allergy-anaphylaxis',
    level: 'critical',
    match: { allergies: ['peanut', 'nuts', 'shellfish', 'bee', 'wasp', 'anaphylaxis'] },
    title: 'History of severe allergic reaction',
    action:
      'Treat sudden collapse, wheeze, or facial/airway swelling as possible anaphylaxis. Check the patient for a carried adrenaline auto-injector.',
  },

  // ---- Condition-driven -----------------------------------------------
  {
    id: 'condition-diabetes',
    level: 'critical',
    match: { conditions: ['diabetes', 'diabetic', 't1dm', 't2dm'] },
    title: 'Diabetes on file',
    action:
      'Check capillary blood glucose early. Do not assume altered consciousness is head injury or intoxication until hypoglycaemia is excluded.',
  },
  {
    id: 'condition-epilepsy',
    level: 'critical',
    match: { conditions: ['epilepsy', 'seizure', 'convulsion'] },
    title: 'Seizure disorder on file',
    action:
      'Apply seizure precautions and protect the airway. Establish when the last anti-epileptic dose was taken; a missed dose is a common trigger.',
  },
  {
    id: 'condition-asthma',
    level: 'warning',
    match: { conditions: ['asthma', 'copd', 'bronchitis'] },
    title: 'Chronic respiratory condition on file',
    action:
      'Treat breathlessness or wheeze as a possible exacerbation. Look for a carried inhaler; avoid known respiratory irritants.',
  },
  {
    id: 'condition-cardiac',
    level: 'critical',
    match: {
      conditions: ['heart', 'cardiac', 'angina', 'myocardial', 'arrhythmia', 'pacemaker', 'stent', 'bypass'],
    },
    title: 'Cardiac history on file',
    action:
      'Obtain an early ECG. If a pacemaker or ICD is recorded, tell the team before defibrillation or MRI.',
  },
  {
    id: 'condition-ckd',
    level: 'warning',
    match: { conditions: ['kidney', 'renal', 'dialysis', 'ckd', 'nephro'] },
    title: 'Renal impairment on file',
    action:
      'Renally-cleared drugs and contrast may need dose adjustment. Flag dialysis dependence and last session to the treating team.',
  },
  {
    id: 'condition-hypertension',
    level: 'info',
    match: { conditions: ['hypertension', 'high blood pressure'] },
    title: 'Hypertension on file',
    action:
      'Interpret blood pressure readings against a raised baseline; a seemingly normal reading may represent relative hypotension.',
  },
  {
    id: 'condition-pregnancy',
    level: 'critical',
    match: { conditions: ['pregnan', 'gravid', 'trimester'] },
    title: 'Pregnancy recorded on profile',
    action:
      'Avoid teratogenic drugs and minimise radiation exposure. Involve obstetrics early. Confirm current status, as this field may be out of date.',
  },
  {
    id: 'condition-immuno',
    level: 'warning',
    match: {
      conditions: ['immunocompromised', 'hiv', 'transplant', 'chemotherapy', 'leukaemia', 'leukemia', 'lymphoma'],
    },
    title: 'Immunocompromise on file',
    action:
      'Low threshold for sepsis. Use strict aseptic technique; fever may be the only sign of serious infection.',
  },

  // ---- Medication-driven ----------------------------------------------
  {
    id: 'med-anticoagulant',
    level: 'critical',
    match: {
      medications: ['warfarin', 'heparin', 'apixaban', 'rivaroxaban', 'dabigatran', 'clopidogrel', 'acenocoumarol', 'blood thinner'],
    },
    title: 'On anticoagulant / antiplatelet therapy',
    action:
      'High bleeding risk from apparently minor trauma. Avoid intramuscular injections. Raise the threshold for suspecting intracranial bleed after head injury; reversal may be needed.',
  },
  {
    id: 'med-insulin',
    level: 'critical',
    match: { medications: ['insulin', 'metformin', 'gliclazide', 'glicazide', 'glimepiride'] },
    title: 'On glucose-lowering medication',
    action:
      'Hypoglycaemia is a leading cause of collapse in this patient group. Check blood glucose before other investigations.',
  },
  {
    id: 'med-steroid',
    level: 'warning',
    match: { medications: ['prednisolone', 'prednisone', 'steroid', 'hydrocortisone', 'dexamethasone'] },
    title: 'On long-term steroid therapy',
    action:
      'Risk of adrenal crisis under physiological stress. Steroid cover may be required; do not stop the medication abruptly.',
  },
  {
    id: 'med-betablocker',
    level: 'warning',
    match: { medications: ['metoprolol', 'atenolol', 'propranolol', 'bisoprolol', 'carvedilol'] },
    title: 'On beta-blocker therapy',
    action:
      'Heart rate may stay deceptively normal despite significant shock or blood loss. Do not rely on tachycardia as a warning sign.',
  },
  {
    id: 'med-opioid',
    level: 'warning',
    match: { medications: ['morphine', 'tramadol', 'fentanyl', 'oxycodone', 'codeine', 'buprenorphine'] },
    title: 'On opioid therapy',
    action:
      'Consider opioid effect in any reduced consciousness or respiratory depression. Established tolerance may alter analgesic requirements.',
  },
  {
    id: 'med-antiepileptic',
    level: 'warning',
    match: {
      medications: ['levetiracetam', 'phenytoin', 'valproate', 'carbamazepine', 'lamotrigine', 'keppra'],
    },
    title: 'On anti-epileptic medication',
    action:
      'A missed dose is a common seizure trigger. Establish the time of the last dose and maintain the regimen where possible.',
  },

  // ---- Blood group ----------------------------------------------------
  {
    id: 'blood-rh-negative',
    level: 'warning',
    match: { bloodGroup: ['A-', 'B-', 'AB-', 'O-'] },
    title: 'Rh-negative blood group recorded',
    action:
      'Rh-negative units may be in limited supply, so alert the blood bank early. The recorded group must still be confirmed by crossmatch.',
  },
  {
    id: 'blood-unknown',
    level: 'info',
    match: { bloodGroup: ['Unknown'] },
    title: 'Blood group not recorded',
    action: 'No blood group on file. Group and crossmatch will be required before transfusion.',
  },
];

function haystack(list, keys) {
  return list
    .flatMap((item) =>
      typeof item === 'string' ? [item] : keys.map((k) => item?.[k]).filter(Boolean)
    )
    .join(' | ')
    .toLowerCase();
}

function matches(terms, text) {
  return terms.some((term) => text.includes(term.toLowerCase()));
}

/**
 * @param {object} profile an emergency-tier profile
 * @returns {{id:string,level:string,title:string,action:string}[]} most urgent first
 */
export function buildDecisionCard(profile = {}) {
  const allergyText = haystack(profile.allergies || [], ['substance', 'reaction']);
  const conditionText = haystack(profile.conditions || [], ['name', 'notes']);
  const medicationText = haystack(profile.medications || [], ['name']);
  const bloodGroup = profile.bloodGroup || 'Unknown';

  const hits = [];

  for (const rule of RULES) {
    const m = rule.match;
    const hit =
      (m.allergies && matches(m.allergies, allergyText)) ||
      (m.conditions && matches(m.conditions, conditionText)) ||
      (m.medications && matches(m.medications, medicationText)) ||
      (m.bloodGroup && m.bloodGroup.includes(bloodGroup));

    if (hit) {
      hits.push({ id: rule.id, level: rule.level, title: rule.title, action: rule.action });
    }
  }

  // A severe/life-threatening allergy always earns a top-level prompt, even
  // when the specific substance is not in our keyword table.
  const severe = (profile.allergies || []).filter((a) =>
    ['severe', 'life-threatening'].includes(a?.severity)
  );
  if (severe.length && !hits.some((h) => h.id === 'allergy-anaphylaxis')) {
    hits.unshift({
      id: 'allergy-severe-generic',
      level: 'critical',
      title: `Severe allergy on file: ${severe.map((a) => a.substance).join(', ')}`,
      action:
        'Patient has recorded a severe or life-threatening reaction to the above. Verify before administering any medication.',
    });
  }

  hits.sort((a, b) => LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level]);
  return hits;
}

export const DECISION_CARD_DISCLAIMER =
  'Decision prompts are generated from user-entered data and are a decision aid only. ' +
  'They are not a diagnosis and do not replace clinical assessment. ' +
  'Blood group must be confirmed by crossmatch before transfusion.';
