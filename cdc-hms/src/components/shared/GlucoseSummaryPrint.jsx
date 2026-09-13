import usePrint from '../../hooks/usePrint';
import PrintLetterhead from './PrintLetterhead';
import { BAND, makeVal } from './gmc/gmcShared';

// GlucoseSummaryPrint — the printable / PDF one-page glucose summary on the
// clinic letterhead (DRY: PrintLetterhead + usePrint, the same pattern as
// LabRequestPrint and the neuropathy report). Renders the SAME server-computed
// metrics the Glucose Management Centre shows on screen (constants/glucose.js),
// so the printout and the screen can never disagree. No charts library — the
// TIR bar is plain coloured blocks so it prints cleanly.
//
// Props: { data (the /glucose/summary payload), patient, unit ('mmol'|'mgdl'), onClose }

const fmtWhen = (naive) => { if (!naive) return '—'; const [d, t] = naive.split(' '); const [y, m, dd] = d.split('-'); return `${dd}/${m}/${y} ${(t || '').slice(0, 5)}`; };
const fmtDay = (d) => (d ? new Date(`${d}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '');

const GlucoseSummaryPrint = ({ data, patient, unit = 'mmol', onClose }) => {
  const { printRef, handlePrint } = usePrint();
  if (!data) return null;
  const m = data.metrics;
  const t = data.targets?.targets || {};
  const unitLabel = unit === 'mmol' ? 'mmol/L' : 'mg/dL';
  const val = makeVal(unit);
  const win = data.window || {};

  const bands = [
    ['Very low', 'veryLowPct', BAND.veryLow, `< ${val(t.tbrLevel2Mgdl)}`],
    ['Low', 'lowPct', BAND.low, `${val(t.tbrLevel2Mgdl)}–${val(t.tirLowMgdl)}`],
    ['In range', 'inRangePct', BAND.inRange, `${val(t.tirLowMgdl)}–${val(t.tirHighMgdl)}`],
    ['High', 'highPct', BAND.high, `${val(t.tirHighMgdl)}–${val(t.tarLevel2Mgdl)}`],
    ['Very high', 'veryHighPct', BAND.veryHigh, `> ${val(t.tarLevel2Mgdl)}`],
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="print:hidden sticky top-0 bg-white border-b-2 border-gray-200 p-4 flex justify-between items-center">
          <h3 className="text-xl font-bold text-gray-800">Glucose Summary</h3>
          <div className="flex gap-3">
            <button onClick={handlePrint} className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-blue-700 font-semibold transition flex items-center gap-2">🖨️ Print / Save PDF</button>
            <button onClick={onClose} className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-semibold transition">Done</button>
          </div>
        </div>

        <div ref={printRef} className="p-8">
          <PrintLetterhead show />

          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-xl font-bold text-gray-800">Glucose Summary</h2>
              <p className="text-sm text-gray-600 mt-0.5">{patient?.name}{patient?.uhid ? ` · ${patient.uhid}` : ''}</p>
            </div>
            <div className="text-right text-xs text-gray-500">
              <p>Window: {fmtDay(win.from)} – {fmtDay(win.to)}</p>
              <p>Generated {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
            </div>
          </div>

          <p className="text-xs text-gray-600 mb-4">
            Targets: {data.targets?.individualised
              ? `individualised${data.targets.meta?.setByName ? ` — set by ${data.targets.meta.setByName}` : ''}${data.targets.meta?.rationale ? ` (“${data.targets.meta.rationale}”)` : ''}`
              : 'International Consensus (adults, type 1 / type 2)'}
            {data.hba1c ? ` · HbA1c ${data.hba1c.value} %${data.hba1c.at ? ` (${fmtWhen(data.hba1c.at).slice(0, 10)})` : ''}` : ''}
          </p>

          {/* TIR bar */}
          <div className="mb-1">
            <div className="flex h-6 rounded overflow-hidden gap-0.5 bg-gray-200">
              {bands.map(([, k, c]) => <div key={k} style={{ width: `${m.tir[k]}%`, background: c }} />)}
            </div>
          </div>
          <table className="w-full text-xs mb-5 mt-2">
            <thead><tr className="text-gray-500 text-left"><th className="py-1">Band</th><th>Range ({unitLabel})</th><th className="text-right">%</th></tr></thead>
            <tbody>
              {bands.map(([label, k, c, range]) => (
                <tr key={k} className="border-t border-gray-100">
                  <td className="py-1"><span className="inline-block w-2.5 h-2.5 rounded-sm mr-1.5 align-middle" style={{ background: c }} />{label}</td>
                  <td>{range}</td>
                  <td className="text-right font-semibold" style={{ color: c }}>{m.tir[k]} %</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* metrics grid */}
          <div className="grid grid-cols-3 gap-3 text-sm mb-5">
            {[
              ['Mean glucose', m.meanMgdl === null ? '—' : `${val(m.meanMgdl)} ${unitLabel}`, `SD ${val(m.sdMgdl) ?? '—'}`],
              ['Estimated GMI (SMBG)', m.gmiPct === null ? '—' : `${m.gmiPct} %`, m.sufficient ? 'from mean glucose' : 'too little data to quote'],
              ['Variability (CV)', m.cvPct === null ? '—' : `${m.cvPct} %`, `target ≤ ${t.cvTargetPct} %`],
              ['Time in range', `${m.tir.inRangePct} %`, `goal > ${t.tirGoalPct} %`],
              ['Time below range', `${m.tir.belowPct} %`, `goal < ${t.tbrGoalPct} % · ${m.hypoCount} hypo${m.hypoCount === 1 ? '' : 's'}`],
              ['Time above range', `${m.tir.abovePct} %`, `goal < ${t.tarGoalPct} %`],
              ['Pre-meal average', m.mealTags?.pre?.meanMgdl == null ? '—' : `${val(m.mealTags.pre.meanMgdl)} ${unitLabel}`, `n = ${m.mealTags?.pre?.n ?? 0}`],
              ['Post-meal average', m.mealTags?.post?.meanMgdl == null ? '—' : `${val(m.mealTags.post.meanMgdl)} ${unitLabel}`, `n = ${m.mealTags?.post?.n ?? 0}`],
              ['Fasting in band', m.fasting?.inBandPct == null ? '—' : `${m.fasting.inBandPct} %`, `${val(t.fastingLowMgdl)}–${val(t.fastingHighMgdl)} · n = ${m.fasting?.n ?? 0}`],
            ].map(([label, big, note]) => (
              <div key={label} className="p-2.5 rounded-lg border border-gray-200">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">{label}</p>
                <p className="text-lg font-bold text-gray-800 leading-tight">{big}</p>
                <p className="text-[11px] text-gray-500">{note}</p>
              </div>
            ))}
          </div>

          <p className="text-xs text-gray-600">
            Based on <strong>{m.readings}</strong> readings over <strong>{m.days}</strong> days ({m.readingsPerDay}/day).
            {' '}{m.sufficient
              ? 'This meets the ≥ 14-day, ≥ 3-a-day sufficiency threshold for Time-in-Range and estimated GMI.'
              : 'This is below the 14-day / 3-a-day threshold, so Time-in-Range and estimated GMI are indicative only and should not be read as an HbA1c.'}
            {' '}GMI is a CGM-derived formula applied to fingerstick readings and is an estimate. Meter readings are shown at the meter’s own clock time.
          </p>

          <div className="mt-8">
            <p className="text-xs text-gray-500">This is a computer-generated document</p>
            <p className="text-xs text-gray-500">Comprehensive Diabetes Centre · Nairobi, Kenya</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GlucoseSummaryPrint;
