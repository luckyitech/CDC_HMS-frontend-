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
  'Thyroid Ultrasound',
  'ECG',
  'Insulin Shot',
];

export const PROCEDURE_OPTIONS = [
  'PNS',
  'ABI',
  'ANS',
  'Dressing Major',
  'Dressing Minor',
  'IV',
  'CGM',
  'Thyroid Nodule Radiofrequency Ablation (RFA)',
  'Thyroid Percutaneous Ethanol Injection (PEI)',
  'Ultrasound-Guided Thyroid Fine Needle Aspiration (FNA)',
  'Ultrasound-Guided Core Needle Biopsy (CNB)',
  'Foot Pressure Measurement',
];
