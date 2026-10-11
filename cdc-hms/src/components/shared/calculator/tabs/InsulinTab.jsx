import { NumField, Segmented, Check, Warn, ResultCard, CopyButton, SectionLabel, todayLabel } from '../calcUi';
import { round, bandOf, homaIr, homaB, quicki, HOMA_IR_BANDS } from '../../../../utils/clinicalCalc';

const IR_REF = 'Clinic bands (no international guideline): normal <2.0 · mildly elevated 2.0–2.5 · elevated >2.5. Healthy ≈ 1.0 (Matthews 1985).';
const B_REF = 'Healthy reference = 100% (Matthews 1985). β-cell function relative to the prevailing glucose.';
const Q_REF = 'Katz 2000: non-obese 0.366 ± 0.029 · obese 0.331 ± 0.010 · T2DM 0.304 ± 0.007. Lower = more resistant.';

/** Insulin — HOMA-IR, HOMA-B and QUICKI from one fasting glucose and insulin. */
export default function InsulinTab({ state, set, derived, copy }) {
  const { glucoseMmol: g, insulinUiu: i } = derived;
  const ready = g !== null && i !== null && g > 0 && i > 0;
  const warnings = [];
  if (state.onInsulin) warnings.push('Exogenous insulin is measured with endogenous insulin — HOMA-IR, HOMA-B and QUICKI are not valid. Shown for reference only.');
  if (g !== null && (g < 2.5 || g > 30)) warnings.push('Fasting glucose is outside the expected range — check the value and the unit.');

  let results = null;
  if (ready) {
    const ir = homaIr(g, i); const b = homaB(g, i); const q = quicki(g, i);
    const irBand = bandOf(ir, HOMA_IR_BANDS);
    const inputs = `FPG ${round(g, 1)} mmol/L · Fasting insulin ${round(i, 1)} µIU/mL${state.insulinUnit === 'pmol' ? ` (${state.insulin} pmol/L ÷ 6)` : ''} · ${todayLabel()}${state.onInsulin ? ' · ON INSULIN — not valid' : ''}`;
    const blocks = {
      ir: { head: `HOMA-IR: ${round(ir, 1)} — ${irBand.label.toLowerCase()}`, lines: [inputs, `Ref ${IR_REF}`] },
      b: b === null ? { head: 'HOMA-B: not calculable (FPG ≤ 3.5 mmol/L)', lines: [inputs] } : { head: `HOMA-B: ${round(b)}%`, lines: [inputs, `Ref ${B_REF}`] },
      q: { head: `QUICKI: ${round(q, 3).toFixed(3)}`, lines: [inputs, `Ref ${Q_REF}`] },
    };
    results = { ir, b, q, irBand, blocks };
  }

  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-start">
      <div className="flex w-full flex-col gap-3 md:w-[292px] md:shrink-0">
        <p className="text-xs text-gray-600">Same fasting sample — one entry gives all three.</p>
        <div className="grid grid-cols-2 gap-2.5">
          <NumField label="Fasting glucose" value={state.glucose} onChange={(v) => set({ glucose: v })} />
          <Segmented label="Unit" value={state.glucoseUnit} options={[['mmol', 'mmol/L'], ['mg', 'mg/dL']]} onChange={(v) => set({ glucoseUnit: v })} />
          <NumField label="Fasting insulin" value={state.insulin} onChange={(v) => set({ insulin: v })} />
          <Segmented label="Unit" value={state.insulinUnit} options={[['uiu', 'µIU/mL'], ['pmol', 'pmol/L']]} onChange={(v) => set({ insulinUnit: v })} />
        </div>
        <Check on={state.onInsulin} onChange={(v) => set({ onInsulin: v })}>Patient is on insulin therapy</Check>
        {warnings.map((w) => <Warn key={w}>{w}</Warn>)}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <SectionLabel right={results && <CopyButton primary onClick={() => copy([results.blocks.ir, results.blocks.b, results.blocks.q])}>Copy all three</CopyButton>}>RESULTS</SectionLabel>
        {!results
          ? <p className="text-sm text-gray-500">Enter fasting glucose and insulin to calculate.</p>
          : (
            <>
              <ResultCard size="md" title="HOMA-IR (HOMA1)" value={round(results.ir, 1).toFixed(1)} band={results.irBand}
                scale={{ bands: HOMA_IR_BANDS.map((b, k) => ({ ...b, label: ['Normal', 'Mild', 'Elevated'][k] })), value: results.ir, max: 4 }}
                note={IR_REF} onCopy={() => copy([results.blocks.ir])} />
              <ResultCard size="md" title="HOMA-B (HOMA1) · no guideline bands" value={results.b === null ? '—' : round(results.b)} unit={results.b === null ? '' : '%'}
                note={results.b === null ? 'Not calculable when fasting glucose ≤ 3.5 mmol/L.' : B_REF} onCopy={() => copy([results.blocks.b])} />
              <ResultCard size="md" title="QUICKI · no guideline bands" value={round(results.q, 3).toFixed(3)} note={Q_REF} onCopy={() => copy([results.blocks.q])} />
            </>
          )}
      </div>
    </div>
  );
}
