import { NumField, Segmented, TogglePill, Warn, Chip, CopyButton, SectionLabel, todayLabel } from '../calcUi';
import {
  round, bandOf, preventRisk, PREVENT_BANDS, score2Family, score2Bands, framingham2008, FRAMINGHAM_BANDS, whoCvdRisk, whoBand,
} from '../../../../utils/clinicalCalc';
import { SCORE2_REGIONS } from '../../../../constants/riskCoefficients';

const KENYA = 'Calibrated for Kenya';
const NOT_KENYA = 'Not calibrated for Kenya';

/** CV risk — one set of inputs, every model; WHO (calibrated for Kenya) is the headline. */
export default function CvRiskTab({ state, set, source, derived, copy }) {
  const { cv, female, egfr } = derived;
  const ready = cv.age !== null && cv.sbp !== null && cv.tcMmol !== null && cv.hdlMmol !== null;
  const inputs = `Age ${state.age} · ${female ? 'Female' : 'Male'} · SBP ${state.sbp}${state.bpTreated ? ' (treated)' : ''} · TC ${state.tc} · HDL ${state.hdl} mmol/L · ${state.diabetes ? `diabetes (dx ${state.ageAtDx || '?'}, HbA1c ${state.hba1c || '?'})` : 'no diabetes'} · ${state.smoker ? 'smoker' : 'non-smoker'} · BMI ${state.bmi || '—'} · eGFR ${egfr === null ? '—' : round(egfr)}${state.statin ? ' · on statin' : ''} · ${todayLabel()}`;

  // Each row: { name, calibrated, value, band, desc, block } — value null = no result.
  const rows = [];
  if (ready) {
    const w = whoCvdRisk(cv);
    const wb = w === null ? null : whoBand(w);
    rows.push({ name: 'WHO CVD risk', calibrated: true, value: w === null ? null : `${w}%`, band: wb,
      desc: w === null ? 'Chart covers ages 40–74.' : 'Heart attack or stroke · WHO 2019 lab chart for Eastern Sub-Saharan Africa.',
      block: w === null ? null : { head: `WHO CVD risk, 10-year (2019 lab chart, Eastern Sub-Saharan Africa): ${w}% — ${wb.label}`, lines: [inputs, 'Ref WHO bands <5 · 5–<10 · 10–<20 · 20–<30 · ≥30%'] } });

    [['CVD', 'Heart attack, stroke or heart failure · AHA 2023.'], ['ASCVD', 'Heart attack or stroke · AHA 2023.'], ['HF', 'New heart failure · AHA 2023 · uses BMI and eGFR.']].forEach(([o, desc]) => {
      const v = preventRisk(o, cv);
      const b = v === null || o === 'HF' ? null : bandOf(v, PREVENT_BANDS);
      rows.push({ name: `PREVENT-${o}`, calibrated: false, value: v === null ? null : `${round(v, 1).toFixed(1)}%`, band: b,
        desc: v === null ? 'Outside PREVENT ranges (age 30–79, TC 3.4–8.3, HDL 0.5–2.6, SBP 90–200, BMI 18.5–39.9, eGFR 15–140).' : desc,
        block: v === null ? null : { head: `PREVENT-${o}, 10-year (AHA 2023; not calibrated for Kenya): ${round(v, 1).toFixed(1)}%${b ? ` — ${b.label.toLowerCase()}` : ''}`,
          lines: [inputs, o === 'HF' ? 'Ref No agreed bands' : 'Ref Proposed bands <5 low · 5–<7.5 borderline · 7.5–<20 intermediate · ≥20% high'] } });
    });

    const sc = score2Family(cv, state.region);
    const regionName = SCORE2_REGIONS[state.region].label.toLowerCase();
    if (sc.error) rows.push({ name: sc.model, calibrated: false, value: null, band: null, desc: `${sc.error}.`, block: null });
    else {
      const b = bandOf(sc.risk, score2Bands(sc.model, cv.age));
      rows.push({ name: sc.model, calibrated: false, value: `${round(sc.risk, 1).toFixed(1)}%`, band: b,
        desc: `Fatal and non-fatal CVD · ESC · ${regionName}-risk European region (your choice).`,
        block: { head: `${sc.model}, 10-year (ESC, ${regionName}-risk region; not calibrated for Kenya): ${round(sc.risk, 1).toFixed(1)}% — ${b.label.toLowerCase()}`,
          lines: [inputs, sc.model === 'SCORE2-Diabetes' ? 'Ref ESC 2023 <5 low · 5–<10 moderate · 10–<20 high · ≥20% very high' : 'Ref ESC 2021 age-specific bands'] } });
    }

    const f = framingham2008(cv);
    const fb = f === null ? null : bandOf(f, FRAMINGHAM_BANDS);
    rows.push({ name: 'Framingham 2008', calibrated: false, value: f === null ? null : `${round(f, 1).toFixed(1)}%`, band: fb,
      desc: f === null ? 'For ages 30–74.' : 'Coronary, cerebrovascular, peripheral arterial disease and heart failure · US.',
      block: f === null ? null : { head: `Framingham general CVD, 10-year (2008; not calibrated for Kenya): ${round(f, 1).toFixed(1)}% — ${fb.label.toLowerCase()}`, lines: [inputs, 'Ref <10 low · 10–20 intermediate · >20% high'] } });
  }
  const blocks = rows.map((r) => r.block).filter(Boolean);

  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-start">
      <div className="flex w-full flex-col gap-2.5 md:w-[270px] md:shrink-0">
        <div className="grid grid-cols-2 gap-x-2.5 gap-y-1.5">
          <NumField label="Age" hint={source('age')} inputMode="numeric" value={state.age} onChange={(v) => set({ age: v })} />
          <NumField label="SBP" hint={source('sbp')} inputMode="numeric" value={state.sbp} onChange={(v) => set({ sbp: v })} />
          <NumField label="Total chol (mmol/L)" value={state.tc} onChange={(v) => set({ tc: v })} />
          <NumField label="HDL (mmol/L)" value={state.hdl} onChange={(v) => set({ hdl: v })} />
          <NumField label="BMI" hint={source('bmi')} value={state.bmi} onChange={(v) => set({ bmi: v })} />
          <NumField label="HbA1c (mmol/mol)" hint={source('hba1c')} value={state.hba1c} onChange={(v) => set({ hba1c: v })} />
          <NumField label="Age at diabetes diagnosis" hint={source('ageAtDx')} inputMode="numeric" value={state.ageAtDx} onChange={(v) => set({ ageAtDx: v })} />
        </div>
        <div className="flex flex-wrap gap-1.5">
          <TogglePill on onChange={() => set({ sex: female ? 'M' : 'F' })}>{female ? 'Female' : 'Male'}</TogglePill>
          <TogglePill on={state.smoker} onChange={(v) => set({ smoker: v })}>Smoker</TogglePill>
          <TogglePill on={state.diabetes} onChange={(v) => set({ diabetes: v })}>Diabetes</TogglePill>
          <TogglePill on={state.bpTreated} onChange={(v) => set({ bpTreated: v })}>BP treatment</TogglePill>
          <TogglePill on={state.statin} onChange={(v) => set({ statin: v })}>On statin</TogglePill>
        </div>
        {state.fileNote && <p className="text-[11.5px] text-gray-500">From the file: {state.fileNote}. Edit any pill or field if the file is out of date.</p>}
        <p className="text-[11.5px] text-gray-700">{egfr === null ? 'eGFR — enter creatinine on the Kidney tab' : `eGFR ${round(egfr)} · from the Kidney tab (CKD-EPI 2021)`}</p>
        <Segmented small label="SCORE2 region — Kenya is not an ESC country" value={state.region}
          options={Object.entries(SCORE2_REGIONS).map(([k, r]) => [k, r.label])} onChange={(v) => set({ region: v })} />
        {!ready && <Warn>Enter age, SBP, total cholesterol and HDL to calculate.</Warn>}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <SectionLabel right={blocks.length > 0 && <CopyButton primary onClick={() => copy(blocks)}>Copy all</CopyButton>}>10-YEAR RISK</SectionLabel>
        {rows.map((r) => (
          <div key={r.name} className={`flex flex-col gap-0.5 rounded-xl border px-2.5 py-1.5 ${r.calibrated ? 'border-green-200 bg-green-50/60' : 'border-gray-200 bg-white'}`}>
            <div className="flex items-center gap-1.5">
              <span className="text-[12.5px] font-bold text-gray-900">{r.name}</span>
              <span className="ml-auto text-lg font-bold tabular-nums text-gray-900">{r.value ?? '—'}</span>
              <Chip small band={r.band} />
              {r.block && <CopyButton onClick={() => copy([r.block])} />}
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className={`whitespace-nowrap rounded px-1.5 py-px text-[10px] font-bold ${r.calibrated ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>{r.calibrated ? KENYA : NOT_KENYA}</span>
              <span className="text-[11px] leading-snug text-gray-600">{r.desc}</span>
            </div>
          </div>
        ))}
        {ready && (
          <div className="flex flex-col gap-0.5 rounded-xl border border-dashed border-gray-200 px-2.5 py-1.5">
            <span className="text-[12.5px] font-bold text-gray-900">QRISK3</span>
            <span className="text-[11px] text-gray-600">UK, about 20 factors. Not built — the licence and UK-only inputs need a decision first.</span>
          </div>
        )}
      </div>
    </div>
  );
}
