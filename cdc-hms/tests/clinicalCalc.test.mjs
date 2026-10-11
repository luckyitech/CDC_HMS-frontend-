// Consultation calculator — the published worked examples, run against
// src/utils/clinicalCalc.js. `node --test cdc-hms/tests/` from frontend/.
// Every expected value comes from the paper, its supplement, an official chart
// or an official package test — see constants/riskCoefficients.js for sources.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ckdEpi2021, mdrd, kdigoStage, homaIr, homaB, quicki, fib4, fib4Bands, bandOf,
  preventRisk, score2Family, framingham2008, whoCvdRisk, chadsVasc, chadsVa, hasBled,
  heartScore, heartAgePoints, graceInHospital, graceMortality, eddFromLmp, hba1cToMmol,
  CREATININE_UMOL_PER_MGDL, CHOLESTEROL_MGDL_PER_MMOL,
} from '../src/utils/clinicalCalc.js';
import { renalDrugRows } from '../src/constants/renalDrugDosing.js';

const close = (actual, expected, dp = 1) => assert.equal(Number(actual.toFixed(dp)), expected, `${actual} ≠ ${expected}`);
const mg = (umol) => umol / CREATININE_UMOL_PER_MGDL;
const mmol = (mgdl) => mgdl / CHOLESTEROL_MGDL_PER_MMOL;

test('eGFR — CKD-EPI 2021 and MDRD', () => {
  close(ckdEpi2021(mg(112), 54, true), 50, 0);
  close(ckdEpi2021(1.0, 60, false), 86, 0);
  close(mdrd(mg(112), 54, true), 44, 0);
  close(mdrd(1.0, 60, false), 76, 0);
  assert.equal(kdigoStage(50).code, 'G3a');
  assert.equal(kdigoStage(44).code, 'G3b');
  assert.equal(kdigoStage(14).code, 'G5');
  assert.equal(ckdEpi2021(0, 54, true), null);
});

test('HOMA-IR, HOMA-B, QUICKI (FPG 6.2 mmol/L, insulin 14 µIU/mL)', () => {
  close(homaIr(6.2, 14), 3.9);
  close(homaB(6.2, 14), 104, 0);
  close(quicki(6.2, 14), 0.313, 3);
  assert.equal(homaB(3.5, 14), null);
});

test('FIB-4 with the age ≥65 cut-off', () => {
  close(fib4(54, 42, 35, 190), 2.02, 2);
  close(fib4(67, 42, 35, 190), 2.5, 2);
  assert.equal(bandOf(1.5, fib4Bands(54)).label, 'Indeterminate');
  assert.equal(bandOf(1.5, fib4Bands(67)).label, 'Low risk');
  assert.equal(bandOf(2.67, fib4Bands(54)).label, 'Indeterminate');
  assert.equal(bandOf(2.68, fib4Bands(54)).label, 'High risk');
});

const preventExample = (female) => ({ female, age: 50, sbp: 160, bpTreated: true, tcMmol: 200 * 0.02586, hdlMmol: 45 * 0.02586, statin: false, diabetes: true, smoker: false, egfr: 90, bmi: 35 });
test('PREVENT — paper Table S25 example, both sexes', () => {
  close(preventRisk('CVD', preventExample(true)), 14.7);
  close(preventRisk('ASCVD', preventExample(true)), 9.2);
  close(preventRisk('HF', preventExample(true)), 8.1);
  close(preventRisk('CVD', preventExample(false)), 16.3);
  close(preventRisk('ASCVD', preventExample(false)), 10.2);
  close(preventRisk('HF', preventExample(false)), 10.6);
  assert.equal(preventRisk('CVD', { ...preventExample(true), age: 29 }), null);
});

test('SCORE2 — supplementary example, four regions', () => {
  const man = { female: false, age: 50, smoker: true, sbp: 140, tcMmol: 6.3, hdlMmol: 1.4, diabetes: false };
  const woman = { ...man, female: true };
  assert.deepEqual(['low', 'mod', 'high', 'vhigh'].map((r) => Number(score2Family(man, r).risk.toFixed(1))), [6.3, 8.1, 8.8, 15.1]);
  assert.deepEqual(['low', 'mod', 'high', 'vhigh'].map((r) => Number(score2Family(woman, r).risk.toFixed(1))), [4.3, 5.2, 7.1, 14.1]);
  assert.equal(score2Family(man, 'low').model, 'SCORE2');
});

test('SCORE2-OP — supplementary example', () => {
  const man = { female: false, age: 75, smoker: true, sbp: 140, tcMmol: 5.5, hdlMmol: 1.3, diabetes: false };
  close(score2Family(man, 'low').risk, 18.6);
  close(score2Family({ ...man, female: true }, 'low').risk, 15.2);
  assert.equal(score2Family(man, 'low').model, 'SCORE2-OP');
});

test('SCORE2-Diabetes — graphical-abstract cases', () => {
  const c1 = { female: false, age: 60, smoker: false, sbp: 140, tcMmol: 5.5, hdlMmol: 1.3, diabetes: true, ageAtDiagnosis: 60, hba1cMmol: 50, egfr: 90 };
  assert.deepEqual(['low', 'mod', 'high', 'vhigh'].map((r) => Number(score2Family(c1, r).risk.toFixed(1))), [8.4, 11.0, 12.5, 20.3]);
  assert.deepEqual(['low', 'mod', 'high', 'vhigh'].map((r) => Number(score2Family({ ...c1, female: true }, r).risk.toFixed(1))), [6.1, 7.6, 11.1, 20.6]);
  const c2 = { ...c1, ageAtDiagnosis: 50, hba1cMmol: 70, egfr: 60 };
  assert.deepEqual(['low', 'mod', 'high', 'vhigh'].map((r) => Number(score2Family(c2, r).risk.toFixed(1))), [12.9, 17.2, 21.0, 31.2]);
  assert.equal(score2Family({ ...c1, egfr: null }, 'low').error, 'Needs age at diagnosis, HbA1c and eGFR');
  close(hba1cToMmol(7.9), 62.8);
});

test('Framingham 2008 — paper examples', () => {
  close(framingham2008({ female: true, age: 61, tcMmol: mmol(180), hdlMmol: mmol(47), sbp: 124, bpTreated: false, smoker: true, diabetes: false }), 10.5);
  close(framingham2008({ female: false, age: 53, tcMmol: mmol(161), hdlMmol: mmol(55), sbp: 125, bpTreated: true, smoker: false, diabetes: true }), 15.6);
  assert.equal(framingham2008({ female: false, age: 75, tcMmol: 5, hdlMmol: 1, sbp: 120 }), null);
});

test('WHO 2019 Eastern Sub-Saharan Africa chart — official cells', () => {
  assert.equal(whoCvdRisk({ female: false, age: 72, sbp: 150, tcMmol: 6.5, diabetes: false, smoker: false }), 20);
  assert.deepEqual([3.5, 4.5, 5.5, 6.5, 7.5].map((tc) => whoCvdRisk({ female: false, age: 72, sbp: 150, tcMmol: tc, diabetes: false, smoker: false })), [15, 17, 18, 20, 22]);
  assert.deepEqual([3.5, 4.5, 5.5, 6.5, 7.5].map((tc) => whoCvdRisk({ female: true, age: 72, sbp: 185, tcMmol: tc, diabetes: true, smoker: true })), [32, 33, 34, 36, 37]);
  assert.deepEqual([3.5, 4.5, 5.5, 6.5, 7.5].map((tc) => whoCvdRisk({ female: false, age: 42, sbp: 110, tcMmol: tc, diabetes: false, smoker: true })), [2, 3, 3, 4, 5]);
  assert.equal(whoCvdRisk({ female: true, age: 54, sbp: 138, tcMmol: 5.2, diabetes: true, smoker: false }), 6);
  assert.equal(whoCvdRisk({ female: true, age: 39, sbp: 138, tcMmol: 5.2, diabetes: true, smoker: false }), null);
  assert.equal(whoCvdRisk({ female: true, age: 75, sbp: 138, tcMmol: 5.2, diabetes: true, smoker: false }), null);
});

test('CHA₂DS₂-VASc / VA and HAS-BLED', () => {
  const f = { heartFailure: false, hypertension: true, age: 72, diabetes: true, stroke: false, vascular: false, female: true };
  assert.equal(chadsVasc(f), 4);
  assert.equal(chadsVa(f), 3);
  assert.equal(chadsVasc({ ...f, age: 80, stroke: true, heartFailure: true, vascular: true }), 9);
  assert.equal(hasBled({ sbpOver160: false, renal: false, liver: false, stroke: false, bleeding: false, labileInr: false, age: 72, drugs: true, alcohol: false }), 2);
});

test('HEART and GRACE', () => {
  assert.equal(heartAgePoints(45), 0);
  assert.equal(heartAgePoints(46), 1);
  assert.equal(heartAgePoints(65), 2);
  assert.equal(heartScore({ history: 1, ecg: 0, age: heartAgePoints(54), riskFactors: 2, troponin: 0 }), 4);
  const g = graceInHospital({ age: 54, heartRate: 88, sbp: 138, creatinineMg: 1.1, killip: 0, cardiacArrest: false, stDeviation: true, raisedEnzymes: true });
  assert.equal(g, 133);
  assert.equal(graceMortality(133), '2.1%');
  assert.equal(graceMortality(60), '≤0.2%');
  assert.equal(graceMortality(260), '≥52%');
  assert.equal(graceInHospital({ age: 95, heartRate: 210, sbp: 70, creatinineMg: 4.5, killip: 3, cardiacArrest: true, stDeviation: true, raisedEnzymes: true }), 372);
});

test('EDD from LMP', () => {
  const today = Date.UTC(2026, 9, 11);
  const a = eddFromLmp('2026-03-01', 28, today);
  assert.equal(new Date(a.edd).toISOString().slice(0, 10), '2026-12-06');
  assert.equal(`${a.weeks}w ${a.days}d`, '32w 0d');
  const b = eddFromLmp('2026-04-10', 28, today);
  assert.equal(new Date(b.edd).toISOString().slice(0, 10), '2027-01-15');
  assert.equal(`${b.weeks}w ${b.days}d`, '26w 2d');
  assert.equal(b.trimester, '2nd trimester');
  const c = eddFromLmp('2026-03-01', 32, today);
  assert.equal(new Date(c.edd).toISOString().slice(0, 10), '2026-12-10');
  assert.equal(`${c.weeks}w ${c.days}d`, '31w 3d');
  assert.equal(c.rawGaDays, 224);
  assert.equal(eddFromLmp('nonsense', 28, today), null);
});

test('Diabetes medicines by eGFR — label thresholds', () => {
  const tag = (egfr, name) => renalDrugRows(egfr).find((r) => r.name === name).tag;
  assert.equal(tag(65, 'Metformin'), 'No change');
  assert.equal(tag(50, 'Metformin'), 'Max 2 g/day');
  assert.equal(tag(35, 'Metformin'), 'Max 1 g/day');
  assert.equal(tag(29, 'Metformin'), 'Stop');
  assert.equal(tag(24, 'Dapagliflozin'), "Don't start");
  assert.equal(tag(25, 'Dapagliflozin'), 'Organ benefit');
  assert.equal(tag(19, 'Empagliflozin'), "Don't start");
  assert.equal(tag(20, 'Empagliflozin'), 'Organ benefit');
  assert.equal(tag(29, 'Canagliflozin'), "Don't start");
  assert.equal(tag(44, 'Sitagliptin'), '50 mg');
  assert.equal(tag(29, 'Sitagliptin'), '25 mg');
  assert.equal(tag(49, 'Vildagliptin'), '50 mg od');
  assert.equal(tag(10, 'Linagliptin'), 'No change');
  assert.equal(tag(14, 'Semaglutide'), 'Not advised');
  assert.equal(tag(14, 'Tirzepatide'), 'Caution');
  assert.equal(renalDrugRows(50).length, 9);
});
