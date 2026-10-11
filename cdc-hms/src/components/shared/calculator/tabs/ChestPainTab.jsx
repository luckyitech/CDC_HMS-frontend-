import { useState } from 'react';
import { NumField, Check, ResultCard, SectionLabel, todayLabel } from '../calcUi';
import {
  toNumber, heartAgePoints, heartScore, heartBand, graceInHospital, graceMortality, graceBand, CREATININE_UMOL_PER_MGDL,
} from '../../../../utils/clinicalCalc';

const HEART_ROWS = [
  ['history', 'History', ['Slightly suspicious', 'Moderately', 'Highly suspicious']],
  ['ecg', 'ECG', ['Normal', 'Non-specific repolarisation', 'Significant ST depression']],
  ['age', 'Age — from the file', ['≤45', '46–64', '≥65']],
  ['riskFactors', 'Risk factors (diabetes, smoking, HTN, lipids, FHx, BMI >30)', ['None', '1–2', '≥3 or known atherosclerosis']],
  ['troponin', 'First troponin', ['≤ normal limit', '>1 to <3× limit', '≥3× limit']],
];
const KILLIP = ['I', 'II', 'III', 'IV'];

const OptionButtons = ({ options, value, onPick, locked }) => (
  <div className="flex gap-1">
    {options.map((label, i) => (
      <button key={label} type="button" disabled={locked} onClick={() => onPick(i)} aria-pressed={value === i}
        className={`min-h-[34px] flex-1 rounded-lg border px-1.5 text-[11.5px] font-semibold leading-tight ${value === i ? 'border-primary bg-primary text-white' : locked ? 'border-gray-100 bg-gray-50 text-gray-400' : 'border-gray-300 bg-white text-gray-700 hover:border-primary'}`}>
        {label} · {i}
      </button>
    ))}
  </div>
);

/** Chest pain — HEART for undifferentiated chest pain, GRACE 1.0 for confirmed ACS. */
export default function ChestPainTab({ state, set, setIn, source, derived, copy }) {
  const [sub, setSub] = useState('heart');
  const { age, creatinineMg } = derived;
  const agePts = heartAgePoints(age || 0);

  const hs = heartScore({ ...state.heart, age: agePts });
  const hb = heartBand(hs);
  const heartBlock = { head: `HEART score: ${hs} — ${hb.label.toLowerCase()} (6-week MACE ${hb.mace})`,
    lines: [`History ${state.heart.history} · ECG ${state.heart.ecg} · Age ${agePts} · Risk factors ${state.heart.riskFactors} · Troponin ${state.heart.troponin} · ${todayLabel()}`, 'Ref Backus 2013: 0–3 low 1.7% · 4–6 moderate 16.6% · 7–10 high 50.1%'] };

  const g = state.grace;
  const hr = toNumber(g.heartRate); const gsbp = toNumber(g.sbp);
  const graceReady = age !== null && hr !== null && gsbp !== null && creatinineMg !== null;
  let grace = null;
  if (graceReady) {
    const score = graceInHospital({ age, heartRate: hr, sbp: gsbp, creatinineMg, killip: g.killip, cardiacArrest: g.cardiacArrest, stDeviation: g.stDeviation, raisedEnzymes: g.raisedEnzymes });
    const band = graceBand(score); const mort = graceMortality(score);
    grace = { score, band, mort, block: { head: `GRACE in-hospital (1.0 nomogram): ${score} — ${band.label.toLowerCase()}, ≈${mort.replace(/[≤≥]/g, '')} in-hospital death`,
      lines: [`Age ${state.age} · HR ${g.heartRate} · SBP ${g.sbp} · Cr ${state.creatinine} ${state.creatinineUnit === 'umol' ? 'µmol/L' : 'mg/dL'} · Killip ${KILLIP[g.killip]}${g.cardiacArrest ? ' · cardiac arrest' : ''}${g.stDeviation ? ' · ST deviation' : ''}${g.raisedEnzymes ? ' · raised enzymes' : ''} · ${todayLabel()}`, 'Ref ESC: ≤108 low · 109–140 intermediate · >140 high (early invasive <24 h)'] } };
  }

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex gap-1.5">
        {[['heart', 'HEART — chest pain'], ['grace', 'GRACE — confirmed ACS']].map(([k, label]) => (
          <button key={k} type="button" onClick={() => setSub(k)} aria-pressed={sub === k}
            className={`h-8 rounded-full border px-3 text-[12.5px] font-semibold ${sub === k ? 'border-blue-200 bg-blue-50 text-primary' : 'border-gray-300 bg-white text-gray-600'}`}>{label}</button>
        ))}
      </div>
      {sub === 'heart' ? (
        <div className="flex flex-col gap-4 md:flex-row md:items-start">
          <div className="flex w-full flex-col gap-2 md:w-[380px] md:shrink-0">
            {HEART_ROWS.map(([k, label, options]) => (
              <div key={k} className="flex flex-col gap-1">
                <div className="text-[11.5px] font-bold text-gray-700">{k === 'age' ? `Age ${state.age || '?'} — from the file` : label}</div>
                <OptionButtons options={options} value={k === 'age' ? agePts : state.heart[k]} locked={k === 'age'} onPick={(i) => setIn('heart', { [k]: i })} />
              </div>
            ))}
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <SectionLabel>RESULT</SectionLabel>
            <ResultCard title="HEART score" value={hs} band={hb} note={`6-week major adverse cardiac events ${hb.mace} (Backus 2013). 0–3 low · 4–6 moderate · 7–10 high.`}
              onCopy={() => copy([heartBlock])} copyLabel="Copy for notes" primaryCopy />
            <p className="text-[11px] text-gray-500">Validated with conventional, not high-sensitivity, troponin. Not for an obvious STEMI or a clear non-cardiac cause.</p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4 md:flex-row md:items-start">
          <div className="flex w-full flex-col gap-2 md:w-[380px] md:shrink-0">
            <div className="grid grid-cols-2 gap-x-2.5 gap-y-1.5">
              <NumField label="Heart rate" hint={source('heartRate')} inputMode="numeric" value={g.heartRate} onChange={(v) => setIn('grace', { heartRate: v })} />
              <NumField label="SBP (mmHg)" hint={source('graceSbp')} inputMode="numeric" value={g.sbp} onChange={(v) => setIn('grace', { sbp: v })} />
              <NumField label={`Creatinine (${state.creatinineUnit === 'umol' ? 'µmol/L' : 'mg/dL'})`} hint="Kidney tab" value={state.creatinine} onChange={(v) => set({ creatinine: v })} />
              <NumField label="Age" hint={source('age')} inputMode="numeric" value={state.age} onChange={(v) => set({ age: v })} />
            </div>
            <div className="text-[11.5px] font-bold text-gray-700">Killip class</div>
            <OptionButtons options={KILLIP.map((k) => `Killip ${k}`)} value={g.killip} onPick={(i) => setIn('grace', { killip: i })} />
            <Check on={g.cardiacArrest} onChange={(v) => setIn('grace', { cardiacArrest: v })}>Cardiac arrest at admission</Check>
            <Check on={g.stDeviation} onChange={(v) => setIn('grace', { stDeviation: v })}>ST-segment deviation</Check>
            <Check on={g.raisedEnzymes} onChange={(v) => setIn('grace', { raisedEnzymes: v })}>Raised cardiac enzymes / troponin</Check>
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <SectionLabel>RESULT</SectionLabel>
            {!grace
              ? <p className="text-sm text-gray-500">Enter age, heart rate, SBP and creatinine to calculate.</p>
              : (
                <ResultCard title="GRACE in-hospital death · 1.0 nomogram" value={grace.score} band={grace.band}
                  note={`About ${grace.mort} in-hospital death (Granger 2003). ≤108 low · 109–140 intermediate · >140 high — early invasive angiography within 24 h (ESC 2023).`}
                  onCopy={() => copy([grace.block])} copyLabel="Copy for notes" primaryCopy />
              )}
            <p className="text-[11px] text-gray-500">Creatinine µmol/L ÷ {CREATININE_UMOL_PER_MGDL} = mg/dL. GRACE 2.0's coefficients are not openly published; this is the 2003 point nomogram.</p>
          </div>
        </div>
      )}
    </div>
  );
}
