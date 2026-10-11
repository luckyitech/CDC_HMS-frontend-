// Consultation calculator — the maths (11 Oct 2026). Pure functions, no React:
// every formula the calculator shows lives here and nowhere else, and
// tests/clinicalCalc.test.mjs runs each one against its published example.
// Inputs are numbers in the units named; a function returns null when it has
// nothing valid to say. Bands come back as { label, level } where level is one
// of ok · mild · mod · high · severe (the colour scale in LEVELS).
import {
  PREVENT, PREVENT_RANGES, SCORE2, SCORE2_DIABETES, SCORE2_OP, SCORE2_REGIONS,
  FRAMINGHAM_2008, GRACE_POINTS, GRACE_MORTALITY, FRIBERG_STROKE_RATE, HEART_MACE,
} from '../constants/riskCoefficients.js';
import { WHO_ESSA_LAB_CHART, WHO_AGE_BANDS, WHO_SBP_BANDS, WHO_CHOL_BANDS, WHO_RISK_BANDS } from '../constants/whoCvdChart.js';

// ---------------------------------------------------------------------------
// Units and helpers
// ---------------------------------------------------------------------------
export const CREATININE_UMOL_PER_MGDL = 88.4;
export const GLUCOSE_MGDL_PER_MMOL = 18;
export const INSULIN_PMOL_PER_UIU = 6;       // WHO standard; the older factor was 6.945
export const CHOLESTEROL_MGDL_PER_MMOL = 38.67;

/** "6,2" / " 6.2 " → 6.2 ; anything else → null */
export const toNumber = (v) => {
  if (v === null || v === undefined || v === '') return null;
  const n = parseFloat(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};
export const round = (v, dp = 0) => {
  const f = 10 ** dp;
  return Math.round(v * f) / f;
};
/** The band a value falls in: bands = [{ below, ...rest }] ascending. */
export const bandOf = (value, bands) => bands.find((b) => value < b.below) || bands[bands.length - 1];
/** HbA1c % (DCCT) → mmol/mol (IFCC) */
export const hba1cToMmol = (pct) => (pct - 2.15) * 10.929;
export const bmiFrom = (weightKg, heightCm) => (weightKg > 0 && heightCm > 0 ? weightKg / ((heightCm / 100) ** 2) : null);

// ---------------------------------------------------------------------------
// Kidney — eGFR (creatinine in mg/dL; convert µmol/L ÷ 88.4 first)
// ---------------------------------------------------------------------------
/** CKD-EPI 2021, creatinine only, race-free (Inker LA et al. N Engl J Med 2021). */
export const ckdEpi2021 = (crMg, age, female) => {
  if (!(crMg > 0) || !(age > 0)) return null;
  const k = female ? 0.7 : 0.9;
  const a = female ? -0.241 : -0.302;
  const q = crMg / k;
  return 142 * Math.min(q, 1) ** a * Math.max(q, 1) ** -1.2 * 0.9938 ** age * (female ? 1.012 : 1);
};
/** MDRD 4-variable, IDMS-traceable (175), no race factor (Levey AS et al. 2006). */
export const mdrd = (crMg, age, female) => {
  if (!(crMg > 0) || !(age > 0)) return null;
  return 175 * crMg ** -1.154 * age ** -0.203 * (female ? 0.742 : 1);
};
export const KDIGO_G = [
  { below: 15, code: 'G5', term: 'kidney failure', level: 'severe', colour: '#7A1F1F' },
  { below: 30, code: 'G4', term: 'severely decreased', level: 'high', colour: '#D14343' },
  { below: 45, code: 'G3b', term: 'moderately to severely decreased', level: 'mod', colour: '#E8833A' },
  { below: 60, code: 'G3a', term: 'mildly to moderately decreased', level: 'mild', colour: '#EBC33F' },
  { below: 90, code: 'G2', term: 'mildly decreased', level: 'ok', colour: '#7CC796' },
  { below: Infinity, code: 'G1', term: 'normal or high', level: 'ok', colour: '#2F8F57' },
];
export const kdigoStage = (egfr) => bandOf(egfr, KDIGO_G);
export const KDIGO_TEXT = 'KDIGO: G1 ≥90 · G2 60–89 · G3a 45–59 · G3b 30–44 · G4 15–29 · G5 <15';

// ---------------------------------------------------------------------------
// Insulin indices (HOMA1, Matthews DR et al. Diabetologia 1985; QUICKI, Katz A et al. JCEM 2000)
// glucose mmol/L, insulin µIU/mL
// ---------------------------------------------------------------------------
export const homaIr = (glucoseMmol, insulinUiu) => (glucoseMmol > 0 && insulinUiu > 0 ? (glucoseMmol * insulinUiu) / 22.5 : null);
/** % of a healthy reference; not calculable at or below 3.5 mmol/L */
export const homaB = (glucoseMmol, insulinUiu) => (glucoseMmol > 3.5 && insulinUiu > 0 ? (20 * insulinUiu) / (glucoseMmol - 3.5) : null);
export const quicki = (glucoseMmol, insulinUiu) => (glucoseMmol > 0 && insulinUiu > 0
  ? 1 / (Math.log10(insulinUiu) + Math.log10(glucoseMmol * GLUCOSE_MGDL_PER_MMOL)) : null);
// Clinic bands — there is no international guideline cut-off for HOMA-IR.
export const HOMA_IR_BANDS = [
  { below: 2.0, label: 'Normal', level: 'ok' },
  { below: 2.5, label: 'Mildly elevated', level: 'mild' },
  { below: Infinity, label: 'Elevated', level: 'high' },
];

// ---------------------------------------------------------------------------
// Liver — FIB-4 (Sterling RK et al. Hepatology 2006; age ≥65 cut-off McPherson S et al. 2017)
// ---------------------------------------------------------------------------
export const fib4 = (age, ast, alt, platelets) => (age > 0 && ast > 0 && alt > 0 && platelets > 0
  ? (age * ast) / (platelets * Math.sqrt(alt)) : null);
export const fib4Bands = (age) => [
  { below: age >= 65 ? 2.0 : 1.3, label: 'Low risk', level: 'ok' },
  { below: 2.67 + 1e-9, label: 'Indeterminate', level: 'mod' },
  { below: Infinity, label: 'High risk', level: 'high' },
];

// ---------------------------------------------------------------------------
// Cardiovascular risk — all take one patient object:
// { female, age, sbp, tcMmol, hdlMmol, diabetes, smoker, bpTreated, statin, bmi, egfr, hba1cMmol, ageAtDiagnosis }
// and return a 10-year risk in PERCENT.
// ---------------------------------------------------------------------------
const logistic = (x) => 100 / (1 + Math.exp(-x));
const n01 = (b) => (b ? 1 : 0);

/** PREVENT base model: outcome 'CVD' | 'ASCVD' | 'HF'. Null outside the AHA ranges. */
export const preventRisk = (outcome, p) => {
  const inRange = (v, [lo, hi]) => v !== null && v !== undefined && v >= lo && v <= hi;
  if (!inRange(p.age, PREVENT_RANGES.age) || !inRange(p.tcMmol, PREVENT_RANGES.tcMmol) || !inRange(p.hdlMmol, PREVENT_RANGES.hdlMmol)
    || !inRange(p.sbp, PREVENT_RANGES.sbp) || !inRange(p.bmi, PREVENT_RANGES.bmi) || !inRange(p.egfr, PREVENT_RANGES.egfr)) return null;
  const c = PREVENT[`${p.female ? 'F' : 'M'}_${outcome}`];
  const a = (p.age - 55) / 10;
  const nh = (p.tcMmol - p.hdlMmol) - 3.5;
  const h = (p.hdlMmol - 1.3) / 0.3;
  const s1 = (Math.min(p.sbp, 110) - 110) / 20;
  const s2 = (Math.max(p.sbp, 110) - 130) / 20;
  const b1 = (Math.min(p.bmi, 30) - 25) / 5;
  const b2 = (Math.max(p.bmi, 30) - 30) / 5;
  const e1 = (Math.min(p.egfr, 60) - 60) / -15;
  const e2 = (Math.max(p.egfr, 60) - 90) / -15;
  const dm = n01(p.diabetes); const sm = n01(p.smoker); const tx = n01(p.bpTreated); const st = n01(p.statin);
  const terms = [a, nh, h, s1, s2, dm, sm, b1, b2, e1, e2, tx, st, tx * s2, st * nh, a * nh, a * h, a * s2, a * dm, a * sm, a * b2, a * e1, 1];
  return logistic(terms.reduce((sum, t, i) => sum + c[i] * t, 0));
};
export const PREVENT_BANDS = [            // the ACC/AHA categories written for the Pooled Cohort Equations — provisional
  { below: 5, label: 'Low', level: 'ok' },
  { below: 7.5, label: 'Borderline', level: 'mild' },
  { below: 20, label: 'Intermediate', level: 'mod' },
  { below: Infinity, label: 'High', level: 'high' },
];

const recalibrate = (uncalibrated, [s1, s2]) => 100 * (1 - Math.exp(-Math.exp(s1 + s2 * Math.log(-Math.log(1 - uncalibrated)))));

/**
 * SCORE2 family — picks SCORE2-OP from 70, SCORE2-Diabetes for diabetes aged
 * 40–69, otherwise SCORE2. region: 'low' | 'mod' | 'high' | 'vhigh'.
 * Returns { model, risk } or { model, error }.
 */
export const score2Family = (p, region) => {
  const S = p.female ? 'F' : 'M';
  const reg = SCORE2_REGIONS[region] || SCORE2_REGIONS.mod;
  if (!(p.age >= 40)) return { model: 'SCORE2', error: 'For ages 40 and over' };
  const sm = n01(p.smoker); const dm = n01(p.diabetes);
  if (p.age >= 70) {
    const { c, s0, meanLp } = SCORE2_OP[S];
    const ca = p.age - 73; const cs = p.sbp - 150; const ct = p.tcMmol - 6; const ch = p.hdlMmol - 1.4;
    const lp = c[0] * ca + c[1] * dm + c[2] * sm + c[3] * cs + c[4] * ct + c[5] * ch
      + c[6] * ca * dm + c[7] * ca * sm + c[8] * ca * cs + c[9] * ca * ct + c[10] * ca * ch;
    return { model: 'SCORE2-OP', risk: recalibrate(1 - s0 ** Math.exp(lp - meanLp), reg[`${S}O`]) };
  }
  const ca = (p.age - 60) / 5; const cs = (p.sbp - 120) / 20; const ct = p.tcMmol - 6; const ch = (p.hdlMmol - 1.3) / 0.5;
  if (dm) {
    if (!(p.egfr > 0) || !(p.ageAtDiagnosis > 0) || !(p.hba1cMmol > 0)) return { model: 'SCORE2-Diabetes', error: 'Needs age at diagnosis, HbA1c and eGFR' };
    const { c, s0 } = SCORE2_DIABETES[S];
    const cd = (p.ageAtDiagnosis - 50) / 5; const cA = (p.hba1cMmol - 31) / 9.34; const ce = (Math.log(p.egfr) - 4.5) / 0.15;
    const lp = c[0] * ca + c[1] * sm + c[2] * cs + c[3] + c[4] * ct + c[5] * ch + c[6] * ca * sm + c[7] * ca * cs
      + c[8] * ca + c[9] * ca * ct + c[10] * ca * ch + c[11] * cd + c[12] * cA + c[13] * ce + c[14] * ce * ce + c[15] * cA * ca + c[16] * ce * ca;
    return { model: 'SCORE2-Diabetes', risk: recalibrate(1 - s0 ** Math.exp(lp), reg[S]) };
  }
  const { c, s0 } = SCORE2[S];
  const lp = c[0] * ca + c[1] * sm + c[2] * cs + c[4] * ct + c[5] * ch + c[6] * ca * sm + c[7] * ca * cs + c[8] * ca * ct + c[9] * ca * ch;
  return { model: 'SCORE2', risk: recalibrate(1 - s0 ** Math.exp(lp), reg[S]) };
};
/** ESC bands: 2021 prevention guideline by age; 2023 diabetes guideline for SCORE2-Diabetes. */
export const score2Bands = (model, age) => {
  if (model === 'SCORE2-Diabetes') {
    return [{ below: 5, label: 'Low', level: 'ok' }, { below: 10, label: 'Moderate', level: 'mild' }, { below: 20, label: 'High', level: 'mod' }, { below: Infinity, label: 'Very high', level: 'high' }];
  }
  const [a, b] = age < 50 ? [2.5, 7.5] : age < 70 ? [5, 10] : [7.5, 15];
  return [{ below: a, label: 'Low to moderate', level: 'ok' }, { below: b, label: 'High', level: 'mod' }, { below: Infinity, label: 'Very high', level: 'high' }];
};

/** Framingham 2008 general CVD, lipid model. Null outside ages 30–74. */
export const framingham2008 = (p) => {
  if (!(p.age >= 30 && p.age <= 74) || !(p.tcMmol > 0) || !(p.hdlMmol > 0) || !(p.sbp > 0)) return null;
  const W = FRAMINGHAM_2008[p.female ? 'F' : 'M'];
  const x = W[0] * Math.log(p.age) + W[1] * Math.log(p.tcMmol * CHOLESTEROL_MGDL_PER_MMOL) + W[2] * Math.log(p.hdlMmol * CHOLESTEROL_MGDL_PER_MMOL)
    + (p.bpTreated ? W[4] : W[3]) * Math.log(p.sbp) + W[5] * n01(p.smoker) + W[6] * n01(p.diabetes);
  return 100 * (1 - W[8] ** Math.exp(x - W[7]));
};
export const FRAMINGHAM_BANDS = [{ below: 10, label: 'Low', level: 'ok' }, { below: 20 + 1e-9, label: 'Intermediate', level: 'mod' }, { below: Infinity, label: 'High', level: 'high' }];

/** WHO 2019 lab chart lookup (Eastern Sub-Saharan Africa) — whole-number %, or null outside 40–74. */
export const whoCvdRisk = (p) => {
  if (!(p.age >= 40 && p.age < 75) || !(p.sbp > 0) || !(p.tcMmol > 0)) return null;
  const idx = (v, cuts) => cuts.filter((c) => v >= c).length;
  const ai = Math.min(WHO_AGE_BANDS.length - 1, Math.floor((p.age - 40) / 5));
  const cells = WHO_ESSA_LAB_CHART[`${p.female ? 'F' : 'M'}${n01(p.diabetes)}${n01(p.smoker)}`].split(',');
  return Number(cells[ai * 25 + idx(p.sbp, WHO_SBP_BANDS) * 5 + idx(p.tcMmol, WHO_CHOL_BANDS)]);
};
export const whoBand = (risk) => bandOf(risk, WHO_RISK_BANDS);

// ---------------------------------------------------------------------------
// Atrial fibrillation
// ---------------------------------------------------------------------------
/** Shared items: { heartFailure, hypertension, age, diabetes, stroke, vascular, female } */
export const chadsVa = (f) => n01(f.heartFailure) + n01(f.hypertension) + (f.age >= 75 ? 2 : f.age >= 65 ? 1 : 0)
  + n01(f.diabetes) + (f.stroke ? 2 : 0) + n01(f.vascular);
export const chadsVasc = (f) => chadsVa(f) + n01(f.female);
/** ACC/AHA 2023 reading of CHA₂DS₂-VASc (the sex point does not count towards the threshold). */
export const chadsVascAdvice = (score, female) => {
  const s = score - n01(female);
  return s <= 0 ? { label: 'No anticoagulation', level: 'ok' } : s === 1 ? { label: 'Anticoagulation reasonable', level: 'mild' } : { label: 'Anticoagulation recommended', level: 'high' };
};
/** ESC 2024 reading of CHA₂DS₂-VA. */
export const chadsVaAdvice = (score) => (score === 0 ? { label: 'No anticoagulation', level: 'ok' } : score === 1 ? { label: 'Consider anticoagulation', level: 'mild' } : { label: 'Anticoagulation recommended', level: 'high' });
export const strokeRatePerYear = (score) => FRIBERG_STROKE_RATE[Math.min(score, FRIBERG_STROKE_RATE.length - 1)];
/** HAS-BLED (Pisters R et al. Chest 2010): { sbpOver160, renal, liver, stroke, bleeding, labileInr, age, drugs, alcohol } */
export const hasBled = (f) => n01(f.sbpOver160) + n01(f.renal) + n01(f.liver) + n01(f.stroke) + n01(f.bleeding) + n01(f.labileInr) + (f.age > 65 ? 1 : 0) + n01(f.drugs) + n01(f.alcohol);
export const hasBledAdvice = (score) => (score >= 3 ? { label: 'High bleeding risk', level: 'high' } : { label: 'Lower bleeding risk', level: 'ok' });

// ---------------------------------------------------------------------------
// Chest pain and ACS
// ---------------------------------------------------------------------------
/** HEART age points — Backus 2013: ≤45 → 0, 46–64 → 1, ≥65 → 2 */
export const heartAgePoints = (age) => (age >= 65 ? 2 : age > 45 ? 1 : 0);
/** { history, ecg, age, riskFactors, troponin } each 0–2 (age as points) */
export const heartScore = (f) => f.history + f.ecg + f.age + f.riskFactors + f.troponin;
export const heartBand = (score) => (score <= 3 ? { label: 'Low', level: 'ok', mace: HEART_MACE.low }
  : score <= 6 ? { label: 'Moderate', level: 'mod', mace: HEART_MACE.moderate } : { label: 'High', level: 'high', mace: HEART_MACE.high });

const points = (v, table) => table.find(([upper]) => v < upper)[1];
/** GRACE 1.0 in-hospital: { age, heartRate, sbp, creatinineMg, killip (0–3), cardiacArrest, stDeviation, raisedEnzymes } */
export const graceInHospital = (f) => points(f.age, GRACE_POINTS.age) + points(f.heartRate, GRACE_POINTS.heartRate) + points(f.sbp, GRACE_POINTS.sbp)
  + points(f.creatinineMg, GRACE_POINTS.creatinineMg) + GRACE_POINTS.killip[f.killip] + (f.cardiacArrest ? GRACE_POINTS.cardiacArrest : 0)
  + (f.stDeviation ? GRACE_POINTS.stDeviation : 0) + (f.raisedEnzymes ? GRACE_POINTS.raisedEnzymes : 0);
export const graceMortality = (score) => GRACE_MORTALITY.reduce((acc, [from, text]) => (score >= from ? text : acc), GRACE_MORTALITY[0][1]);
/** ESC NSTE-ACS categories */
export const graceBand = (score) => (score <= 108 ? { label: 'Low', level: 'ok' } : score <= 140 ? { label: 'Intermediate', level: 'mod' } : { label: 'High', level: 'high' });

// ---------------------------------------------------------------------------
// Pregnancy — EDD from the LMP (Naegele's rule, adjusted for cycle length)
// ---------------------------------------------------------------------------
const DAY = 86400000;
const utcDate = (iso) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || ''));
  return m ? Date.UTC(+m[1], +m[2] - 1, +m[3]) : null;
};
export const ANTENATAL_DATES = [     // weeks of gestation; `by` = a deadline, otherwise a window
  { label: 'First antenatal visit', from: 0, to: 12, by: true, note: 'by 12 w' },
  { label: 'Dating / nuchal scan', from: 11, to: 13 + 6 / 7, note: '11⁺⁰–13⁺⁶ w' },
  { label: 'Low-dose aspirin if high pre-eclampsia risk (incl. type 1/2 diabetes)', from: 12, to: 16, note: 'start 12–16 w' },
  { label: 'Anatomy scan', from: 18, to: 22, note: '18–22 w' },
  { label: 'OGTT for gestational diabetes (no pre-existing diabetes)', from: 24, to: 28, note: '24–28 w' },
  { label: 'Term from', from: 37, to: 37, note: '37 w' },
  { label: 'Planned birth if type 1/2 diabetes', from: 37, to: 38 + 6 / 7, note: '37⁺⁰–38⁺⁶ w' },
  { label: 'EDD', from: 40, to: 40, note: '40 w' },
  { label: 'Post-dates review', from: 41, to: 41, note: '41 w' },
];
/**
 * lmp 'YYYY-MM-DD', cycleDays (28 = no adjustment), today = a UTC ms timestamp.
 * Returns { edd, adjustedLmp, gaDays, rawGaDays, weeks, days, trimester, weekDate(w) } or null.
 */
export const eddFromLmp = (lmp, cycleDays = 28, today = Date.now()) => {
  const lmpT = utcDate(lmp);
  if (lmpT === null) return null;
  const cycle = cycleDays > 0 ? cycleDays : 28;
  const adjustedLmp = lmpT + (cycle - 28) * DAY;
  const gaDays = Math.round((today - adjustedLmp) / DAY);
  const wk = gaDays / 7;
  return {
    edd: adjustedLmp + 280 * DAY,
    lmp: lmpT,
    adjustedLmp,
    gaDays,
    rawGaDays: Math.round((today - lmpT) / DAY),
    weeks: Math.floor(gaDays / 7),
    days: ((gaDays % 7) + 7) % 7,
    trimester: wk < 14 ? '1st trimester' : wk < 28 ? '2nd trimester' : '3rd trimester',
    weekDate: (w) => adjustedLmp + Math.round(w * 7) * DAY,
  };
};

// ---------------------------------------------------------------------------
// Basic calculator — a pocket calculator: left to right, no precedence.
// ---------------------------------------------------------------------------
export const applyOp = (a, b, op) => {
  if (op === '+') return a + b;
  if (op === '−') return a - b;
  if (op === '×') return a * b;
  if (op === '÷') return b === 0 ? NaN : a / b;
  return b;
};
export const formatCalc = (n) => (Number.isFinite(n) ? String(parseFloat(n.toPrecision(12))) : 'Error');

// Colour scale shared by every band (chips, bars, medicine rows).
export const LEVELS = {
  ok:     { bg: '#ECFDF3', fg: '#067647', bar: '#2F8F57', row: '#F3FBF6' },
  mild:   { bg: '#FEF7C3', fg: '#854A0E', bar: '#EBC33F', row: '#FFFCEB' },
  mod:    { bg: '#FFEDD5', fg: '#9A3412', bar: '#E8833A', row: '#FFF6EE' },
  high:   { bg: '#FEE4E2', fg: '#B42318', bar: '#D14343', row: '#FEF3F2' },
  severe: { bg: '#7A1F1F', fg: '#FFFFFF', bar: '#7A1F1F', row: '#FEF3F2' },
};
