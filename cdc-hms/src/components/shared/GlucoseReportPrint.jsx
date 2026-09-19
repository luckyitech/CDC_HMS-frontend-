import { useMemo } from 'react';
import usePrint from '../../hooks/usePrint';
import PrintLetterhead from './PrintLetterhead';
import {
  BAND, BAND_BG, SOURCE_META, DIARY_META, makeVal, bandOf,
  TIME_COLUMNS, columnForReading, minutesOfDay, OVERLAY_COLORS, OVERLAY_MAX,
  fmtWhen, fmtTime, dayHeading, diaryDetailBits,
} from './gmc/gmcShared';

/**
 * GlucoseReportPrint — the printable / PDF glucose report the doctor (or a
 * patient, saving their own) assembles from the Print chooser: any of the five
 * Glucose Management Centre sections on one clinic-letterhead document, each on
 * its own page, with INDICES ALWAYS FIRST.
 *
 * Everything is drawn print-clean — plain coloured blocks, tables and a single
 * hand-built inline <svg> — NOT the Recharts library the on-screen tabs use.
 * That is deliberate: the charts library needs a measured on-screen container
 * and does not print reliably (and iOS/iPadOS Safari, which the clinic tablets
 * run, cannot print an iframe — see usePrint). Because the report reuses the
 * SAME server-computed metrics (constants/glucose.js via /glucose/summary) and
 * the SAME shared classifiers (gmcShared), the printout can never disagree with
 * what the screen shows.
 *
 * Props: { data (the /glucose/summary payload), patient, unit ('mmol'|'mgdl'),
 *          sections (ids to include; 'indices' is forced in), onClose }
 */

const SECTION_LABELS = { indices: 'Indices', daily: 'Daily graph', chart: 'Sugar chart', hypos: 'Hypos', logbook: 'Logbook' };
const PRINT_ORDER = ['indices', 'daily', 'chart', 'hypos', 'logbook']; // Indices always first

const fmtDay = (d) => (d ? new Date(`${d}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '');

const GlucoseReportPrint = ({ data, patient, unit = 'mmol', sections = [], onClose }) => {
  const { printRef, handlePrint } = usePrint();

  const val = makeVal(unit);
  const unitLabel = unit === 'mmol' ? 'mmol/L' : 'mg/dL';
  const m = data?.metrics;
  const t = data?.targets?.targets || {};
  const win = data?.window || {};

  // Indices is always included and always first; the rest follow tab order.
  const chosen = useMemo(() => new Set(['indices', ...sections]), [sections]);
  const ordered = PRINT_ORDER.filter((id) => chosen.has(id));

  if (!data || !m) return null;

  const ctx = { data, m, t, val, unitLabel, unit };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full my-4">
        {/* controls — never printed */}
        <div className="print:hidden sticky top-0 bg-white border-b-2 border-gray-200 p-4 flex justify-between items-center rounded-t-lg z-10">
          <div>
            <h3 className="text-xl font-bold text-gray-800">Glucose report</h3>
            <p className="text-xs text-gray-500">{ordered.length === 1 ? '1 section' : `${ordered.length} sections · Indices first`} · {ordered.map((id) => SECTION_LABELS[id]).join(' · ')}</p>
          </div>
          <div className="flex gap-3">
            <button onClick={handlePrint} className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-blue-700 font-semibold transition flex items-center gap-2">🖨️ Print / Save PDF</button>
            <button onClick={onClose} className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-semibold transition">Done</button>
          </div>
        </div>

        {/* the document itself */}
        <div ref={printRef} className="p-8">
          <PrintLetterhead show />

          <div className="flex justify-between items-start mb-5">
            <div>
              <h2 className="text-xl font-bold text-gray-800">Glucose Report</h2>
              <p className="text-sm text-gray-600 mt-0.5">{patient?.name}{patient?.uhid ? ` · ${patient.uhid}` : ''}</p>
            </div>
            <div className="text-right text-xs text-gray-500">
              <p>Window: {fmtDay(win.from)} – {fmtDay(win.to)} ({win.days} days)</p>
              <p>Generated {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
            </div>
          </div>

          {ordered.map((id, i) => (
            <section key={id} className={i > 0 ? 'break-before-page pt-2' : ''}>
              <div className="flex items-baseline justify-between gap-3 mb-2 border-b border-gray-200 pb-1">
                <h3 className="text-base font-bold text-blue-900">{SECTION_LABELS[id]}</h3>
                <span className="text-[10px] text-gray-400 uppercase tracking-wider">{patient?.uhid || ''} · page {i + 1}</span>
              </div>
              {id === 'indices' && <IndicesSection {...ctx} data={data} />}
              {id === 'daily' && <DailyOverlaySection {...ctx} />}
              {id === 'chart' && <SugarChartSection {...ctx} />}
              {id === 'hypos' && <HyposSection {...ctx} />}
              {id === 'logbook' && <LogbookSection {...ctx} />}
            </section>
          ))}

          <div className="mt-8">
            <p className="text-xs text-gray-500">This is a computer-generated document</p>
            <p className="text-xs text-gray-500">Comprehensive Diabetes Centre · Nairobi, Kenya</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Indices — the consensus glycaemic summary (the former Glucose Summary page):
// TIR bar + band table + the metrics grid, all plain blocks so it prints clean.
// ---------------------------------------------------------------------------
const IndicesSection = ({ data, m, t, val, unitLabel }) => {
  const bands = [
    ['Very low', 'veryLowPct', BAND.veryLow, `< ${val(t.tbrLevel2Mgdl)}`],
    ['Low', 'lowPct', BAND.low, `${val(t.tbrLevel2Mgdl)}–${val(t.tirLowMgdl)}`],
    ['In range', 'inRangePct', BAND.inRange, `${val(t.tirLowMgdl)}–${val(t.tirHighMgdl)}`],
    ['High', 'highPct', BAND.high, `${val(t.tirHighMgdl)}–${val(t.tarLevel2Mgdl)}`],
    ['Very high', 'veryHighPct', BAND.veryHigh, `> ${val(t.tarLevel2Mgdl)}`],
  ];
  return (
    <div>
      <p className="text-xs text-gray-600 mb-3">
        Targets: {data.targets?.individualised
          ? `individualised${data.targets.meta?.setByName ? ` — set by ${data.targets.meta.setByName}` : ''}${data.targets.meta?.rationale ? ` (“${data.targets.meta.rationale}”)` : ''}`
          : 'International Consensus (adults, type 1 / type 2) · clinic default 4–10 mmol/L'}
        {data.hba1c ? ` · HbA1c ${data.hba1c.value} %${data.hba1c.at ? ` (${fmtWhen(data.hba1c.at).slice(0, 8)})` : ''}` : ''}
      </p>

      <div className="flex h-6 rounded overflow-hidden gap-0.5 bg-gray-200 mb-2">
        {bands.map(([, k, c]) => <div key={k} style={{ width: `${m.tir[k]}%`, background: c }} />)}
      </div>
      <table className="w-full text-xs mb-5">
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

      <div className="grid grid-cols-3 gap-3 text-sm mb-4">
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
          <div key={label} className="p-2.5 rounded-lg border border-gray-200 break-inside-avoid">
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
    </div>
  );
};

// ---------------------------------------------------------------------------
// Daily graph — the "modal day": every day in the window overlaid on one
// 24-hour clock, each day its own colour, drawn as a single hand-built <svg>
// (no charts library) so it prints identically on desktop and tablet.
// ---------------------------------------------------------------------------
const HOUR_TICKS = [0, 360, 720, 1080, 1440];
const fmtHour = (v) => (v >= 1440 ? '00:00' : `${String(Math.floor(v / 60)).padStart(2, '0')}:00`);

const DailyOverlaySection = ({ data, t, val, unitLabel, unit }) => {
  const { series, capped } = useMemo(() => {
    const set = new Set((data.readings || []).filter((r) => r.mgdl !== null).map((r) => r.at.slice(0, 10)));
    let daysAsc = [...set].sort();
    const wasCapped = daysAsc.length > OVERLAY_MAX;
    if (wasCapped) daysAsc = daysAsc.slice(-OVERLAY_MAX);
    const s = daysAsc.map((d, i) => {
      const color = OVERLAY_COLORS[i % OVERLAY_COLORS.length];
      const pts = (data.readings || [])
        .filter((r) => r.at.slice(0, 10) === d && r.mgdl !== null && !r.excluded)
        .map((r) => ({ x: minutesOfDay(r.at), y: val(r.mgdl) }))
        .sort((a, b) => a.x - b.x);
      return { date: d, color, label: dayHeading(`${d} 00:00:00`), pts };
    }).filter((x) => x.pts.length);
    return { series: s, capped: wasCapped };
  }, [data, val]);

  if (series.length === 0) return <p className="text-sm text-gray-400 py-6 text-center">No readings to plot in this window.</p>;

  // geometry
  const W = 720, H = 300, PADL = 40, PADR = 14, PADT = 10, PADB = 28;
  const PW = W - PADL - PADR, PH = H - PADT - PADB;
  const yMax = unit === 'mmol' ? 22 : 400;
  const yTicks = unit === 'mmol' ? [0, 4, 8, 12, 16, 20] : [0, 100, 200, 300, 400];
  const x = (min) => PADL + (min / 1440) * PW;
  const y = (v) => PADT + (1 - v / yMax) * PH;
  const bandTop = y(val(t.tirHighMgdl));
  const bandBottom = y(val(t.tirLowMgdl));

  return (
    <div>
      <p className="text-xs text-gray-600 mb-2">
        Every day in the window on one 24-hour clock · shaded band = target {val(t.tirLowMgdl)}–{val(t.tirHighMgdl)} {unitLabel} · colour = the day.
        {capped ? ` Showing the ${OVERLAY_MAX} most recent days with readings.` : ''}
      </p>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Daily glucose overlay">
        <rect x={PADL} y={PADT} width={PW} height={PH} fill="#fff" />
        <rect x={PADL} y={bandTop} width={PW} height={bandBottom - bandTop} fill="#dbe8f7" opacity="0.6" />
        <line x1={PADL} y1={y(val(t.tbrLevel2Mgdl))} x2={W - PADR} y2={y(val(t.tbrLevel2Mgdl))} stroke={BAND.veryLow} strokeDasharray="4 4" strokeWidth="1" />
        {yTicks.map((v) => (
          <g key={v}>
            <line x1={PADL} y1={y(v)} x2={W - PADR} y2={y(v)} stroke="#eef2f7" />
            <text x={PADL - 5} y={y(v) + 3} fontSize="10" fill="#94a3b8" textAnchor="end">{v}</text>
          </g>
        ))}
        {HOUR_TICKS.map((hh) => (
          <g key={hh}>
            <line x1={x(hh)} y1={PADT} x2={x(hh)} y2={PADT + PH} stroke="#f1f5f9" />
            <text x={x(hh)} y={H - 9} fontSize="10" fill="#94a3b8" textAnchor="middle">{fmtHour(hh)}</text>
          </g>
        ))}
        {series.map((s) => (
          <g key={s.date}>
            {s.pts.length > 1 && <path d={s.pts.map((p, i) => `${i ? 'L' : 'M'} ${x(p.x).toFixed(1)} ${y(p.y).toFixed(1)}`).join(' ')} fill="none" stroke={s.color} strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" opacity="0.9" />}
            {s.pts.map((p, i) => <circle key={i} cx={x(p.x).toFixed(1)} cy={y(p.y).toFixed(1)} r="2.4" fill={s.color} />)}
          </g>
        ))}
      </svg>
      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-[11px] text-gray-600">
        {series.map((s) => (
          <span key={s.date} className="inline-flex items-center gap-1.5 break-inside-avoid">
            <span className="inline-block w-4 h-1 rounded-sm" style={{ background: s.color }} />{s.label}
          </span>
        ))}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Sugar chart — the SMBG logbook grid (days × the seven clinic slots), each
// cell coloured by band, a per-slot average footer. A plain table, prints clean.
// ---------------------------------------------------------------------------
const dm = (iso) => { const [, mo, d] = iso.split('-'); return `${Number(d)}/${Number(mo)}`; };
const weekday = (iso) => { const [y, mo, d] = iso.split('-').map(Number); return new Date(y, mo - 1, d).toLocaleDateString('en-GB', { weekday: 'short' }); };

const SugarChartSection = ({ data, t, val, unitLabel }) => {
  const { rows, colMeans, total } = useMemo(() => {
    const byDay = new Map();
    const colBuckets = Object.fromEntries(TIME_COLUMNS.map((c) => [c.key, []]));
    let tot = 0;
    for (const r of (data.readings || [])) {
      if (r.mgdl === null || r.excluded) continue;
      tot += 1;
      const day = r.at.slice(0, 10);
      const col = columnForReading(r);
      if (!byDay.has(day)) byDay.set(day, Object.fromEntries(TIME_COLUMNS.map((c) => [c.key, []])));
      byDay.get(day)[col].push(r);
      if (r.countable) colBuckets[col].push(r.mgdl);
    }
    const rws = [...byDay.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1));
    const means = Object.fromEntries(TIME_COLUMNS.map((c) => {
      const xs = colBuckets[c.key];
      return [c.key, xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null];
    }));
    return { rows: rws, colMeans: means, total: tot };
  }, [data]);

  if (total === 0) return <p className="text-sm text-gray-400 py-6 text-center">No readings in this window.</p>;

  const cellFor = (readings) => {
    if (!readings.length) return { text: '·', color: '#d1d5db', bg: 'transparent', count: 0 };
    const counted = readings.filter((r) => r.countable);
    const mgs = (counted.length ? counted : readings).map((r) => r.mgdl);
    const mean = mgs.reduce((a, b) => a + b, 0) / mgs.length;
    const band = bandOf(mean, t);
    return { text: val(mean), color: BAND[band], bg: BAND_BG[band], count: readings.length };
  };

  return (
    <div>
      <p className="text-xs text-gray-600 mb-2">Every reading in its meal slot, coloured by band; a cell with more than one reading shows the average and its count. Footer = per-slot average over the window.</p>
      <table className="w-full text-[11px] border border-gray-300 border-collapse">
        <thead>
          <tr>
            <th className="border border-gray-300 bg-gray-50 px-2 py-1 text-left text-[10px] font-semibold uppercase text-gray-500">Day</th>
            {TIME_COLUMNS.map((c) => (
              <th key={c.key} className="border border-gray-300 bg-gray-50 px-1 py-1 text-center text-[10px] font-semibold text-gray-600">
                <div>{c.label}</div><div className="text-[8px] font-normal text-gray-400 uppercase">{c.sub}</div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(([day, cols]) => (
            <tr key={day} className="break-inside-avoid">
              <th className="border border-gray-200 px-2 py-0.5 text-left whitespace-nowrap">
                <div className="text-[11px] font-bold text-gray-700">{dm(day)}</div>
                <div className="text-[8px] text-gray-400 uppercase">{weekday(day)}</div>
              </th>
              {TIME_COLUMNS.map((c) => {
                const cell = cellFor(cols[c.key]);
                return (
                  <td key={c.key} className="border border-gray-200 px-1 py-0.5 text-center" style={{ background: cell.bg }}>
                    <span className="font-extrabold" style={{ color: cell.color }}>{cell.text}</span>
                    {cell.count > 1 && <span className="block text-[8px] font-semibold text-gray-500">avg · {cell.count}</span>}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <th className="border border-gray-300 bg-blue-50 px-2 py-1 text-left text-[10px] font-semibold uppercase text-gray-500">Avg</th>
            {TIME_COLUMNS.map((c) => {
              const mean = colMeans[c.key];
              const band = mean === null ? null : bandOf(mean, t);
              return (
                <td key={c.key} className="border border-gray-200 bg-blue-50 px-1 py-1 text-center">
                  {mean === null ? <span className="text-gray-300">—</span> : <span className="font-extrabold" style={{ color: BAND[band] }}>{val(mean)}</span>}
                </td>
              );
            })}
          </tr>
        </tfoot>
      </table>
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-gray-600 mt-2">
        {[['veryLow', `< ${val(t.tbrLevel2Mgdl)} very low`], ['low', `${val(t.tbrLevel2Mgdl)}–${val(t.tirLowMgdl)} low`], ['inRange', `${val(t.tirLowMgdl)}–${val(t.tirHighMgdl)} in range`], ['high', `${val(t.tirHighMgdl)}–${val(t.tarLevel2Mgdl)} high`], ['veryHigh', `> ${val(t.tarLevel2Mgdl)} very high`]].map(([b, lbl]) => (
          <span key={b} className="inline-flex items-center gap-1"><i className="inline-block w-2.5 h-2.5 rounded" style={{ background: BAND_BG[b], border: `1px solid ${BAND[b]}` }} /> {lbl} {unitLabel}</span>
        ))}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Hypos — the low-glucose picture: a stat strip, a plain-block bar of events by
// 3-hour bin, and every event listed. Fed from the server's hypo list.
// ---------------------------------------------------------------------------
const HYPO_BINS = ['12a', '3a', '6a', '9a', '12p', '3p', '6p', '9p'];

const HyposSection = ({ m, t, val, unitLabel }) => {
  const hypos = useMemo(() => m.hypos || [], [m]);
  const l2 = val(t.tbrLevel2Mgdl);
  const list = [...hypos].sort((a, b) => (a.at < b.at ? 1 : -1));
  const perDay = m.days ? Math.round((10 * hypos.length) / m.days) / 10 : 0;

  const bins = useMemo(() => {
    const rows = HYPO_BINS.map(() => ({ l1: 0, l2: 0 }));
    for (const hy of hypos) {
      const hr = Number(String(hy.at).slice(11, 13));
      const idx = Number.isNaN(hr) ? 0 : Math.min(Math.floor(hr / 3), 7);
      if (hy.level === 2) rows[idx].l2 += 1; else rows[idx].l1 += 1;
    }
    return rows;
  }, [hypos]);
  const maxBin = Math.max(1, ...bins.map((b) => b.l1 + b.l2));

  return (
    <div>
      <div className="grid grid-cols-4 gap-2 mb-3 text-center">
        {[['Total hypos', hypos.length, hypos.length ? BAND.veryLow : BAND.inRange], [`Level 2 (< ${l2})`, m.hypoLevel2Count, m.hypoLevel2Count ? BAND.veryLow : '#1f2937'], ['Level 1', hypos.length - m.hypoLevel2Count, '#1f2937'], ['Per day', perDay, '#1f2937']].map(([label, value, color]) => (
          <div key={label} className="p-2 rounded-lg border border-gray-200">
            <p className="text-[9px] font-semibold uppercase tracking-wider text-gray-500">{label}</p>
            <p className="text-lg font-extrabold leading-tight" style={{ color }}>{value}</p>
          </div>
        ))}
      </div>

      {hypos.length === 0 ? (
        <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg py-4 text-center">No hypoglycaemia recorded in this window.</p>
      ) : (
        <>
          <div className="border border-gray-200 rounded-lg p-3 mb-3">
            <p className="text-[10px] text-gray-500 mb-2">Low-glucose events by time of day · darker = level-2 (below {l2} {unitLabel})</p>
            <div className="flex items-end gap-1.5" style={{ height: 90 }}>
              {bins.map((b, i) => (
                <div key={i} className="flex-1 flex flex-col items-center justify-end h-full">
                  <div className="w-full flex flex-col justify-end" style={{ height: '100%' }}>
                    {b.l2 > 0 && <div style={{ height: `${(b.l2 / maxBin) * 100}%`, background: BAND.veryLow }} />}
                    {b.l1 > 0 && <div style={{ height: `${(b.l1 / maxBin) * 100}%`, background: BAND.low }} />}
                  </div>
                  <span className="text-[8px] text-gray-400 mt-1">{HYPO_BINS[i]}</span>
                </div>
              ))}
            </div>
          </div>

          <table className="w-full text-xs">
            <thead><tr className="text-gray-500 text-left border-b border-gray-200"><th className="py-1">When</th><th>Value</th><th>Severity</th><th>Source</th></tr></thead>
            <tbody>
              {list.map((hy, i) => (
                <tr key={i} className="border-b border-gray-100 break-inside-avoid">
                  <td className="py-1 tabular-nums">{fmtWhen(hy.at)}</td>
                  <td className="font-bold" style={{ color: hy.level === 2 ? BAND.veryLow : BAND.low }}>{val(hy.mgdl)} {unitLabel}</td>
                  <td><span className={`text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded-full ${hy.level === 2 ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>Level {hy.level}</span></td>
                  <td className="text-gray-500">{SOURCE_META[hy.source]?.label || hy.source}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Logbook — the running record of every reading and diary entry, newest day
// first. A compact table per day; excluded readings kept, struck through.
// ---------------------------------------------------------------------------
const LogbookSection = ({ data, t, val, unitLabel }) => {
  const days = useMemo(() => {
    const items = [];
    for (const r of (data.readings || [])) items.push({ kind: 'reading', at: r.at, r });
    for (const e of (data.diary || [])) items.push({ kind: 'diary', at: e.at, e });
    items.sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));
    const map = new Map(); const order = [];
    for (const it of items) { const d = it.at.slice(0, 10); if (!map.has(d)) { map.set(d, []); order.push(d); } map.get(d).push(it); }
    return order.map((d) => [d, map.get(d)]);
  }, [data]);

  const excludedCount = (data.readings || []).filter((r) => r.excluded).length;
  if (days.length === 0) return <p className="text-sm text-gray-400 py-6 text-center">Nothing logged in this window.</p>;

  return (
    <div>
      <p className="text-xs text-gray-600 mb-3">{(data.readings || []).length} readings · {(data.diary || []).length} diary entries{excludedCount ? ` · ${excludedCount} excluded (struck through)` : ''}.</p>
      {days.map(([day, items]) => (
        <div key={day} className="mb-3 break-inside-avoid">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">{dayHeading(`${day} 00:00:00`)}</p>
          <table className="w-full text-[11px]">
            <tbody>
              {items.map((it, i) => (it.kind === 'reading'
                ? (() => {
                  const r = it.r; const band = r.mgdl != null ? bandOf(r.mgdl, t) : null;
                  return (
                    <tr key={`r${i}`} className="border-b border-gray-50">
                      <td className="py-0.5 w-12 text-gray-500 tabular-nums align-top">{fmtTime(r.at)}</td>
                      <td className="w-24 text-gray-500 align-top"><span className="inline-block w-2 h-2 rounded-full mr-1 align-middle" style={{ background: SOURCE_META[r.source]?.color }} />{SOURCE_META[r.source]?.label}</td>
                      <td className={`w-20 font-bold align-top ${r.excluded ? 'line-through text-gray-400' : ''}`} style={!r.excluded && band ? { color: BAND[band] } : undefined}>{val(r.mgdl)} <span className="font-normal text-gray-400">{unitLabel}</span></td>
                      <td className="text-gray-500 align-top">{r.tagLabel || r.tag || '—'}{r.excluded ? ` · excluded${r.excludedByName ? ` ${r.excludedByName}` : ''}${r.excludeReason ? ` · ${r.excludeReason}` : ''}` : ''}</td>
                    </tr>
                  );
                })()
                : (() => {
                  const e = it.e; const meta = DIARY_META[e.eventType] || DIARY_META.note; const bits = diaryDetailBits(e).join(' · ');
                  return (
                    <tr key={`d${i}`} className="border-b border-gray-50">
                      <td className="py-0.5 w-12 text-gray-500 tabular-nums align-top">{fmtTime(e.at)}</td>
                      <td className="w-24 align-top font-semibold" style={{ color: meta.color }}><span className="inline-block w-2 h-2 rounded-full mr-1 align-middle" style={{ background: meta.color }} />{meta.label}</td>
                      <td colSpan={2} className="text-gray-700 align-top"><span className="font-semibold">{e.label || meta.label}</span>{bits ? ` · ${bits}` : ''}</td>
                    </tr>
                  );
                })()
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
};

export default GlucoseReportPrint;
