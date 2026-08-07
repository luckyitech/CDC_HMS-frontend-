// Shared drug-schedule source (frontend).
//
// SINGLE SOURCE for every drug dropdown — outpatient prescriptions AND the
// inpatient MAR. Mirror of backend/constants/drugSchedules.js — keep in sync.
// Each schedule has a human `label` (prescription dropdown) and its round
// `times` (inpatient MAR). Clinic rounds: 06:00 / 12:00 / 22:00 / 00:00 + PRN.

export const DRUG_SCHEDULES = [
  { code: 'OD',    label: 'Once daily',        times: ['06:00'] },
  { code: 'BD',    label: 'Twice daily',       times: ['06:00', '22:00'] },
  { code: 'TDS',   label: 'Three times daily', times: ['06:00', '12:00', '22:00'] },
  { code: 'QDS',   label: 'Four times daily',  times: ['06:00', '12:00', '22:00', '00:00'] },
  { code: 'Q8H',   label: 'Every 8 hours',     times: ['06:00', '12:00', '22:00'] },
  { code: 'Q12H',  label: 'Every 12 hours',    times: ['06:00', '22:00'] },
  { code: 'NOCTE', label: 'At night',          times: ['22:00'] },
  { code: 'PRN',   label: 'As required',       times: [] },
];

export const DRUG_ROUNDS = ['06:00', '12:00', '22:00', '00:00'];

// Labels for the outpatient prescription frequency dropdown (DRY: derived here).
export const FREQUENCY_LABELS = DRUG_SCHEDULES.map((s) => s.label);

export const scheduleByCode = (code) => DRUG_SCHEDULES.find((s) => s.code === code) || null;
export const scheduleByLabel = (label) => DRUG_SCHEDULES.find((s) => s.label === label) || null;
