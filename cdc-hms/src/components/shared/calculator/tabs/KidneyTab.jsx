import { NumField, Segmented, Warn, ResultCard, CopyButton, SectionLabel, Chip, todayLabel } from '../calcUi';
import { round, kdigoStage, KDIGO_G, KDIGO_TEXT, LEVELS } from '../../../../utils/clinicalCalc';
import { renalDrugRows } from '../../../../constants/renalDrugDosing';
import { GUIDELINES_CHECKED } from '../../../../constants/clinicalCalculators';

const KDIGO_SCALE = { bands: [...KDIGO_G].map((g) => ({ ...g, label: g.code })), max: 120 };

/** Kidney — CKD-EPI 2021 and MDRD from one creatinine, plus diabetes medicines at that eGFR. */
export default function KidneyTab({ state, set, source, derived, copy }) {
  const { age, female, creatinineMg, egfr, egfrMdrd } = derived;
  const warnings = [];
  if (age !== null && age < 18) warnings.push('Under 18 — adult equations do not apply. Use a paediatric equation (bedside Schwartz).');
  if (creatinineMg !== null && (creatinineMg < 0.2 || creatinineMg > 25)) warnings.push('Creatinine is outside the expected range — check the value and the unit.');

  const crText = state.creatinineUnit === 'umol' ? `${state.creatinine} µmol/L` : `${state.creatinine} mg/dL`;
  const inputs = `Creatinine ${crText} · Age ${state.age} · ${female ? 'Female' : 'Male'} · ${todayLabel()}`;
  const blocks = egfr === null ? [] : [
    { head: `eGFR (CKD-EPI 2021, race-free): ${round(egfr)} mL/min/1.73 m² — ${kdigoStage(egfr).code} (${kdigoStage(egfr).term})`, lines: [inputs, `Ref ${KDIGO_TEXT}`] },
    { head: `eGFR (MDRD, IDMS 175, no race factor): ${round(egfrMdrd)} mL/min/1.73 m² — ${kdigoStage(egfrMdrd).code} (${kdigoStage(egfrMdrd).term})${egfrMdrd > 60 ? ' — MDRD imprecise >60' : ''}`, lines: [inputs, `Ref ${KDIGO_TEXT}`] },
  ];
  const stageChip = (v) => { const s = kdigoStage(v); return { label: `${s.code} · ${s.term}`, level: s.level }; };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-4 md:flex-row md:items-start">
        <div className="flex w-full flex-col gap-3 md:w-[292px] md:shrink-0">
          <div className="grid grid-cols-2 gap-2.5">
            <NumField label="Creatinine" value={state.creatinine} onChange={(v) => set({ creatinine: v })} />
            <Segmented label="Unit" value={state.creatinineUnit} options={[['umol', 'µmol/L'], ['mg', 'mg/dL']]} onChange={(v) => set({ creatinineUnit: v })} />
            <NumField label="Age" hint={source('age')} inputMode="numeric" value={state.age} onChange={(v) => set({ age: v })} />
            <Segmented label={`Sex${state.sexFromFile ? ' · file' : ''}`} value={state.sex} options={[['F', 'F'], ['M', 'M']]} onChange={(v) => set({ sex: v })} />
          </div>
          {warnings.map((w) => <Warn key={w}>{w}</Warn>)}
          <p className="text-xs leading-relaxed text-gray-500">Not valid in AKI, pregnancy, under 18, or extremes of muscle mass (amputation, cachexia, bodybuilders).</p>
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <SectionLabel right={blocks.length > 0 && <CopyButton primary onClick={() => copy(blocks)}>Copy both</CopyButton>}>RESULTS · KDIGO COLOURS</SectionLabel>
          {egfr === null
            ? <p className="text-sm text-gray-500">Enter creatinine and age to calculate.</p>
            : (
              <>
                <ResultCard title="CKD-EPI 2021 · creatinine · race-free" value={round(egfr)} unit="mL/min/1.73 m²" band={stageChip(egfr)}
                  scale={{ ...KDIGO_SCALE, value: egfr }} onCopy={() => copy([blocks[0]])} />
                <ResultCard title={`MDRD · IDMS 175 · no race factor${egfrMdrd > 60 ? ' · imprecise >60' : ''}`} value={round(egfrMdrd)} unit="mL/min/1.73 m²" band={stageChip(egfrMdrd)}
                  scale={{ ...KDIGO_SCALE, value: egfrMdrd }} onCopy={() => copy([blocks[1]])} />
              </>
            )}
        </div>
      </div>

      <div className="flex flex-col gap-1.5 border-t border-gray-100 pt-2.5">
        <div className="flex flex-wrap items-baseline gap-2">
          <span className="text-[13px] font-bold text-gray-900">{egfr === null ? 'Diabetes medicines — enter creatinine and age' : `Diabetes medicines at eGFR ${round(egfr)} (CKD-EPI)`}</span>
          <span className="text-[11px] text-gray-500">green no change · amber adjust / reduced effect · red don't start or stop</span>
        </div>
        {egfr !== null && (
          <div className="grid grid-cols-1 gap-x-3 gap-y-1.5 md:grid-cols-2">
            {renalDrugRows(egfr).map((d) => (
              <div key={d.name} className="flex flex-col gap-px rounded-lg px-2.5 py-1.5" style={{ background: LEVELS[d.level].row }}>
                <div className="flex items-center gap-1.5">
                  <span className="text-[12.5px] font-bold text-gray-900">{d.name}</span>
                  {d.cls && <span className="text-[11px] text-gray-500">{d.cls}</span>}
                  <span className="ml-auto"><Chip small band={{ label: d.tag, level: d.level }} /></span>
                </div>
                <div className="text-[11.5px] leading-snug text-gray-700">{d.text}</div>
              </div>
            ))}
          </div>
        )}
        <p className="text-[10.5px] text-gray-500">Label thresholds — EU/UK SmPC, US label where stated; checked {GUIDELINES_CHECKED.on}. Verify against the current label before acting.</p>
      </div>
    </div>
  );
}
