/**
 * Billing options shared across the consultation and referral flows.
 *
 * CHARGE_OPTIONS    — services billed per visit
 * PROCEDURE_OPTIONS — clinical procedures performed during the visit
 *
 * Both are used in:
 *   - Consultation.jsx       (Complete Consultation modal)
 *   - ReferPatientModal.jsx  (Step 2 — before referring)
 */

export const CHARGE_OPTIONS = [
  'Consultation Fee',
  'Free Review',
  'No Charge',
  'Random Blood Sugar',
  'Ketones',
  'HbA1c',
  'ECG',
];

// Thyroid Ultrasound and Insulin Shot live here rather than under charges —
// both are things done to the patient, not flat visit fees.
export const PROCEDURE_OPTIONS = [
  'PNS',
  'ABI',
  'ANS',
  'Dressing Major',
  'Dressing Minor',
  'IV',
  'CGM',
  'Insulin Shot',
  'Thyroid Ultrasound',
  'Thyroid Nodule Radiofrequency Ablation (RFA)',
  'Thyroid Percutaneous Ethanol Injection (PEI)',
  'Ultrasound-Guided Thyroid Fine Needle Aspiration (FNA)',
  'Ultrasound-Guided Core Needle Biopsy (CNB)',
  'Foot Pressure Measurement',
];

/**
 * What a nurse can bill on an injection-only visit — a subset of the lists
 * above, not a separate vocabulary. Same strings, so the reception desk sees
 * one merged bill and the price list needs no new entries.
 *
 * Anything a doctor must order (ECG, thyroid work, biopsies) is deliberately
 * absent. Add to these arrays, not new ones, if the clinic's scope changes.
 */
export const NURSE_CHARGE_OPTIONS = CHARGE_OPTIONS.filter(item =>
  ['No Charge', 'Random Blood Sugar', 'Ketones', 'HbA1c'].includes(item)
);

export const NURSE_PROCEDURE_OPTIONS = PROCEDURE_OPTIONS.filter(item =>
  ['Insulin Shot', 'Dressing Major', 'Dressing Minor', 'IV', 'CGM', 'Foot Pressure Measurement'].includes(item)
);
