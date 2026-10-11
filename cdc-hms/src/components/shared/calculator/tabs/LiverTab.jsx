import { NumField, Warn, ResultCard, SectionLabel, todayLabel } from '../calcUi';
import { round, toNumber, bandOf, fib4, fib4Bands } from '../../../../utils/clinicalCalc';

/** Liver — FIB-4 with the age ≥65 cut-off. */
export default function LiverTab({ state, set, source, derived, copy }) {
  const { age } = derived;
  const ast = toNumber(state.ast); const alt = toNumber(state.alt); const plt = toNumber(state.platelets);
  const value = age !== null ? fib4(age, ast, alt, plt) : null;
  const bands = fib4Bands(age || 0);
  const band = value === null ? null : bandOf(value, bands);
  const old = age !== null && age >= 65;
  const ref = old ? 'Age ≥65: low <2.0 · indeterminate 2.0–2.67 · high >2.67 (advanced fibrosis)' : 'Low <1.30 · indeterminate 1.30–2.67 · high >2.67 (advanced fibrosis)';
  const block = value === null ? null : {
    head: `FIB-4: ${round(value, 2).toFixed(2)} — ${band.label.toLowerCase()}`,
    lines: [`Age ${state.age} · AST ${state.ast} U/L · ALT ${state.alt} U/L · Platelets ${state.platelets} ×10⁹/L · ${todayLabel()}`, `Ref ${ref}`],
  };

  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-start">
      <div className="flex w-full flex-col gap-3 md:w-[292px] md:shrink-0">
        <div className="grid grid-cols-2 gap-2.5">
          <NumField label="Age" hint={source('age')} inputMode="numeric" value={state.age} onChange={(v) => set({ age: v })} />
          <NumField label="Platelets ×10⁹/L" value={state.platelets} onChange={(v) => set({ platelets: v })} />
          <NumField label="AST (U/L)" value={state.ast} onChange={(v) => set({ ast: v })} />
          <NumField label="ALT (U/L)" value={state.alt} onChange={(v) => set({ alt: v })} />
        </div>
        {age !== null && age < 35 && <Warn>FIB-4 is not validated under 35 — it performs poorly in younger patients.</Warn>}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <SectionLabel>RESULT</SectionLabel>
        {value === null
          ? <p className="text-sm text-gray-500">Enter age, AST, ALT and platelets to calculate.</p>
          : (
            <ResultCard title={`FIB-4 index${old ? ' · age ≥65 bands' : ''}`} value={round(value, 2).toFixed(2)} band={band}
              scale={{ bands: bands.map((b, k) => ({ ...b, label: ['Low', 'Indeterminate', 'High'][k] })), value, max: 4 }}
              note={ref} onCopy={() => copy([block])} copyLabel="Copy for notes" primaryCopy />
          )}
      </div>
    </div>
  );
}
