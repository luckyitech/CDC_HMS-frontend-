import { useMemo, useState } from 'react';
import { numericVital, bpVital } from '../../../utils/vitalsValues';
import {
  toNumber, ckdEpi2021, mdrd, bmiFrom, hba1cToMmol, CREATININE_UMOL_PER_MGDL, GLUCOSE_MGDL_PER_MMOL, INSULIN_PMOL_PER_UIU,
} from '../../../utils/clinicalCalc';

/**
 * Consultation calculator — the inputs, shared by every tab (11 Oct 2026).
 *
 * Pre-filled from the patient file (age, sex, diabetes and its date,
 * hypertension) and the LATEST vitals record (SBP, heart rate, BMI, HbA1c),
 * each field remembering where its value came from — "vitals 11 Oct" or
 * "file" — until the doctor edits it, when it reads "edited". Nothing is
 * saved anywhere; the component is keyed on the patient, so a change of
 * patient starts afresh.
 */
const has = (text, re) => re.test(String(text || ''));
const yearsBetween = (from, to) => (from && to ? (new Date(to) - new Date(from)) / 31557600000 : null);
const shortDate = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', ...(d.getFullYear() === new Date().getFullYear() ? {} : { year: 'numeric' }) });
};
const computeAge = (dob) => {
  if (!dob) return null;
  const d = new Date(dob); const t = new Date();
  let a = t.getFullYear() - d.getFullYear();
  if (t.getMonth() < d.getMonth() || (t.getMonth() === d.getMonth() && t.getDate() < d.getDate())) a -= 1;
  return a;
};

export const initialCalcState = (patient = {}) => {
  const v = patient.vitals || {};
  const vitalsLabel = v.recordedAt ? `vitals ${shortDate(v.recordedAt)}` : 'vitals';
  const comorbid = (Array.isArray(patient.comorbidities) ? patient.comorbidities : []).join(' ');
  const diabetes = has(patient.diagnosis, /diabet/i) || has(comorbid, /diabet/i);
  const hypertension = has(comorbid, /hypertens/i) || has(patient.diagnosis, /hypertens/i);
  const hba1cPct = numericVital(v.hba1c);
  const ageAtDx = diabetes && patient.diagnosisDate && patient.dateOfBirth ? yearsBetween(patient.dateOfBirth, patient.diagnosisDate) : null;
  const bmi = numericVital(v.bmi) || bmiFrom(numericVital(v.weight) || 0, numericVital(v.height) || 0);
  const sbp = (bpVital(v.bp) || '').split('/')[0] || '';
  const age = patient.age ?? computeAge(patient.dateOfBirth);
  const sources = {};
  const from = (key, value, label) => { if (value !== '' && value !== null && value !== undefined) sources[key] = label; return value ?? ''; };
  return {
    age: from('age', age, 'file'),
    sex: has(patient.gender, /^f/i) ? 'F' : 'M',
    sexFromFile: !!patient.gender,
    creatinine: '', creatinineUnit: 'umol',
    glucose: '', glucoseUnit: 'mmol', insulin: '', insulinUnit: 'uiu', onInsulin: false,
    ast: '', alt: '', platelets: '',
    sbp: from('sbp', sbp, vitalsLabel),
    tc: '', hdl: '',
    bmi: from('bmi', bmi ? Number(bmi).toFixed(1) : '', vitalsLabel),
    hba1c: from('hba1c', hba1cPct ? hba1cToMmol(hba1cPct).toFixed(0) : '', `${vitalsLabel} · ${hba1cPct}%`),
    ageAtDx: from('ageAtDx', ageAtDx ? String(Math.round(ageAtDx)) : '', `file · dx ${shortDate(patient.diagnosisDate)}`),
    diabetes, smoker: false, bpTreated: hypertension, statin: false, region: 'mod',
    fileNote: [diabetes && `diabetes (${patient.diagnosis})`, hypertension && 'hypertension'].filter(Boolean).join(' · '),
    af: { heartFailure: false, hypertension, stroke: false, vascular: false },
    hb: { sbpOver160: false, renal: false, liver: false, bleeding: false, labileInr: false, drugs: false, alcohol: false },
    heart: { history: 0, ecg: 0, riskFactors: 0, troponin: 0 },
    grace: { heartRate: from('heartRate', numericVital(v.heartRate) || '', vitalsLabel), sbp: from('graceSbp', sbp, vitalsLabel), killip: 0, cardiacArrest: false, stDeviation: false, raisedEnzymes: false },
    lmp: '', cycle: '28', pregnancyAnyway: false,
    basic: { display: '0', acc: null, op: null, fresh: true, line: '', lastExpr: '' },
    sources,
  };
};

export default function useCalcState(patient) {
  const [state, setState] = useState(() => initialCalcState(patient));
  // Editing a pre-filled field marks it "edited" so the hint no longer claims the vitals' date.
  const edited = (s, keys) => keys.reduce((src, k) => (src[k] ? { ...src, [k]: 'edited' } : src), s.sources);
  const set = (patch) => setState((s) => {
    const p = typeof patch === 'function' ? patch(s) : patch;
    return { ...s, ...p, sources: edited(s, Object.keys(p)) };
  });
  const setIn = (key, patch) => setState((s) => ({ ...s, [key]: { ...s[key], ...patch }, sources: edited(s, key === 'grace' ? Object.keys(patch).map((k) => (k === 'sbp' ? 'graceSbp' : k)) : []) }));
  /** The hint shown beside a field: where its value came from. */
  const source = (key) => state.sources[key] || '';

  // Values every tab reads, worked out once.
  const derived = useMemo(() => {
    const age = toNumber(state.age);
    const female = state.sex === 'F';
    const crIn = toNumber(state.creatinine);
    const creatinineMg = crIn === null ? null : state.creatinineUnit === 'umol' ? crIn / CREATININE_UMOL_PER_MGDL : crIn;
    const egfr = age !== null && age >= 18 && creatinineMg !== null ? ckdEpi2021(creatinineMg, age, female) : null;
    const egfrMdrd = age !== null && age >= 18 && creatinineMg !== null ? mdrd(creatinineMg, age, female) : null;
    const gIn = toNumber(state.glucose);
    const glucoseMmol = gIn === null ? null : state.glucoseUnit === 'mmol' ? gIn : gIn / GLUCOSE_MGDL_PER_MMOL;
    const iIn = toNumber(state.insulin);
    const insulinUiu = iIn === null ? null : state.insulinUnit === 'uiu' ? iIn : iIn / INSULIN_PMOL_PER_UIU;
    const cv = {
      female, age, sbp: toNumber(state.sbp), tcMmol: toNumber(state.tc), hdlMmol: toNumber(state.hdl), bmi: toNumber(state.bmi),
      hba1cMmol: toNumber(state.hba1c), ageAtDiagnosis: toNumber(state.ageAtDx), egfr,
      diabetes: state.diabetes, smoker: state.smoker, bpTreated: state.bpTreated, statin: state.statin,
    };
    return { age, female, creatinineMg, egfr, egfrMdrd, glucoseMmol, insulinUiu, cv };
  }, [state]);

  return { state, set, setIn, source, derived };
}
