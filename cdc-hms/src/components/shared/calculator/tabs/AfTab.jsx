import { Check, ResultCard, CopyButton, SectionLabel, todayLabel } from '../calcUi';
import { chadsVasc, chadsVa, chadsVascAdvice, chadsVaAdvice, strokeRatePerYear, hasBled, hasBledAdvice } from '../../../../utils/clinicalCalc';

const AF_ITEMS = [
  ['heartFailure', 'Heart failure / LVEF ≤40%'], ['hypertension', 'Hypertension'],
  ['stroke', 'Prior stroke / TIA / thromboembolism'], ['vascular', 'Vascular disease (MI, PAD, aortic plaque)'],
];
const HB_ITEMS = [
  ['sbpOver160', 'Uncontrolled hypertension, SBP >160'], ['renal', 'Abnormal renal function (dialysis, transplant, Cr ≥200 µmol/L)'],
  ['liver', 'Abnormal liver function (cirrhosis; bilirubin >2×, enzymes >3× ULN)'], ['bleeding', 'Bleeding history or predisposition'],
  ['labileInr', 'Labile INR (on warfarin, TTR <60%)'], ['drugs', 'Antiplatelet or NSAID'], ['alcohol', 'Alcohol excess'],
];

/** AF — CHA₂DS₂-VASc, CHA₂DS₂-VA and HAS-BLED from one set of ticks. */
export default function AfTab({ state, set, setIn, derived, copy }) {
  const { age, female } = derived;
  const factors = { ...state.af, age: age || 0, diabetes: state.diabetes, female };
  const vasc = chadsVasc(factors); const va = chadsVa(factors);
  const hb = hasBled({ ...state.hb, stroke: state.af.stroke, age: age || 0 });
  const vascAdvice = chadsVascAdvice(vasc, female); const vaAdvice = chadsVaAdvice(va); const hbAdvice = hasBledAdvice(hb);
  const named = [state.af.heartFailure && 'heart failure', state.af.hypertension && 'hypertension', state.diabetes && 'diabetes', state.af.stroke && 'prior stroke/TIA', state.af.vascular && 'vascular disease']
    .filter(Boolean).join(', ') || 'no other risk factors';
  const line = `${named} · Age ${state.age} · ${female ? 'Female' : 'Male'} · ${todayLabel()}`;
  const blocks = [
    { head: `CHA₂DS₂-VASc: ${vasc} — ${vascAdvice.label.toLowerCase()} (ACC/AHA 2023)`, lines: [line, `Ref ≈${strokeRatePerYear(vasc)}% stroke/year (Friberg 2012) · recommended ≥2 men / ≥3 women`] },
    { head: `CHA₂DS₂-VA: ${va} — ${vaAdvice.label.toLowerCase()} (ESC 2024)`, lines: [line, 'Ref ESC 2024: recommended ≥2 · consider at 1'] },
    { head: `HAS-BLED: ${hb} — ${hbAdvice.label.toLowerCase()}`, lines: [todayLabel(), 'Ref ≥3 high — correct modifiable factors; not a reason on its own to withhold anticoagulation'] },
  ];

  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-start">
      <div className="flex w-full flex-col gap-2.5 md:w-[300px] md:shrink-0">
        <p className="text-xs text-gray-700">Age <b>{state.age || '?'}</b> and sex <b>{female ? 'female' : 'male'}</b> from the file{state.fileNote ? ` · ${state.fileNote} from the file` : ''} · tick what applies</p>
        <SectionLabel>STROKE RISK</SectionLabel>
        {AF_ITEMS.map(([k, label]) => <Check key={k} on={state.af[k]} onChange={(v) => setIn('af', { [k]: v })}>{label}</Check>)}
        <Check on={state.diabetes} onChange={(v) => set({ diabetes: v })}>Diabetes (shared with CV risk)</Check>
        <SectionLabel>BLEEDING RISK (also uses age and prior stroke)</SectionLabel>
        {HB_ITEMS.map(([k, label]) => <Check key={k} on={state.hb[k]} onChange={(v) => setIn('hb', { [k]: v })}>{label}</Check>)}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <SectionLabel right={<CopyButton primary onClick={() => copy(blocks)}>Copy all three</CopyButton>}>RESULTS</SectionLabel>
        <ResultCard title="CHA₂DS₂-VASc · ACC/AHA 2023" value={vasc} band={vascAdvice}
          note={`About ${strokeRatePerYear(vasc)}% stroke per year (Friberg 2012). Recommended at ≥2 in men, ≥3 in women.`} onCopy={() => copy([blocks[0]])} />
        <ResultCard title="CHA₂DS₂-VA · ESC 2024 (no sex point)" value={va} band={vaAdvice} note="Recommended at ≥2; consider at 1." onCopy={() => copy([blocks[1]])} />
        <ResultCard title="HAS-BLED" value={hb} band={hbAdvice}
          note="≥3: review more often and correct BP, labile INR, antiplatelets/NSAIDs, alcohol. Not a reason on its own to withhold anticoagulation." onCopy={() => copy([blocks[2]])} />
      </div>
    </div>
  );
}
