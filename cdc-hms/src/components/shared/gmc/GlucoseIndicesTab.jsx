import { useState } from 'react';
import { ComposedChart, Bar, ErrorBar, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceArea, ResponsiveContainer } from 'recharts';
import { Target, TrendingUp } from 'lucide-react';
import Button from '../Button';
import { VitalsTrendModal } from '../VitalsGrid';
import { Metric, ChartCard, SOURCE_META, BAND, TwoLineTick, fmtWhen } from './gmcShared';

/**
 * Indices — the analytical dashboard: the consensus glycaemic figures the
 * clinic acts on. Time in / above / below range as a vertical band chart,
 * GMI beside the measured HbA1c (which opens the same HbA1c-history trend the
 * triage vitals grid uses — DRY), SMBG consistency, variability and hypos, the
 * time-of-day profile and the pre-/post-meal split, and the targets these are
 * judged against. Every number is server-computed (constants/glucose.js).
 */
const GlucoseIndicesTab = ({ data, m, t, unit, val, unitLabel, days, isClinician, onEditTargets }) => {
  const dim = m && !m.sufficient ? 'opacity-40' : '';

  // Time in range as a vertical stack of labelled bars (very high → very low).
  const tirRows = [
    { key: 'veryHigh', pct: m.tir.veryHighPct, range: `> ${val(t.tarLevel2Mgdl)}`, ok: m.tir.veryHighPct < t.tar2GoalPct, goal: `< ${t.tar2GoalPct} %` },
    { key: 'high', pct: m.tir.highPct, range: `${val(t.tirHighMgdl)}–${val(t.tarLevel2Mgdl)}`, ok: m.tir.abovePct < t.tarGoalPct, goal: `< ${t.tarGoalPct} %` },
    { key: 'inRange', pct: m.tir.inRangePct, range: `${val(t.tirLowMgdl)}–${val(t.tirHighMgdl)}`, ok: m.tir.inRangePct > t.tirGoalPct, goal: `> ${t.tirGoalPct} %` },
    { key: 'low', pct: m.tir.lowPct, range: `${val(t.tbrLevel2Mgdl)}–${val(t.tirLowMgdl)}`, ok: m.tir.belowPct < t.tbrGoalPct, goal: `< ${t.tbrGoalPct} %` },
    { key: 'veryLow', pct: m.tir.veryLowPct, range: `< ${val(t.tbrLevel2Mgdl)}`, ok: m.tir.veryLowPct < t.tbr2GoalPct, goal: `< ${t.tbr2GoalPct} %` },
  ];

  return (
    <div>
      <div className="grid grid-cols-12 gap-3 mb-4">
        {/* Time in range — vertical band chart */}
        <div className={`col-span-12 p-3 rounded-xl bg-gray-50 border border-gray-200 ${dim}`}>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-2">Time in range · {data.window.days || days}-day window · {unitLabel}</p>
          <div className="space-y-1.5">
            {tirRows.map((r) => (
              <div key={r.key} className="flex items-center gap-2">
                <span className="w-16 sm:w-20 text-right text-[11px] text-gray-500 flex-shrink-0 tabular-nums">{r.range}</span>
                <div className="relative flex-1 h-6 bg-gray-100 rounded overflow-hidden">
                  <div className="h-full rounded" style={{ width: `${Math.max(r.pct, 0)}%`, background: BAND[r.key] }} />
                  <span className="absolute inset-y-0 right-2 flex items-center text-xs font-bold tabular-nums" style={{ color: r.pct >= 88 ? '#fff' : BAND[r.key] }}>{r.pct} %</span>
                </div>
                <span className={`w-24 text-left text-[10px] flex-shrink-0 hidden sm:block ${r.ok ? 'text-green-700' : 'text-red-700'}`}>{r.ok ? '✓' : '✗'} {r.goal}</span>
              </div>
            ))}
          </div>
        </div>

        {/* HbA1c (measured) — clickable → the triage HbA1c-history modal */}
        <Hba1cCard className="col-span-6 lg:col-span-4" data={data} />

        {/* Estimated GMI */}
        <Metric className={`col-span-6 lg:col-span-4 ${dim}`} label="Estimated GMI (SMBG)" big={m.gmiPct !== null ? `${m.gmiPct} %` : '—'}
          note={<>a CGM formula applied to fingersticks — an estimate{data.hba1c ? <>, to read beside the measured HbA1c</> : null}{!m.sufficient && <span className="text-amber-700"> · too little data to quote</span>}</>} />

        <Metric className="col-span-6 lg:col-span-4" label="SMBG consistency" big={<>{m.readingsPerDay}<small className="text-xs font-normal text-gray-500 ml-1">/ day</small></>}
          note={<>{m.readings} readings · {m.days} days{m.sufficient ? <span className="text-green-700"> · ✓ enough for TIR &amp; GMI</span> : <span className="text-amber-700"> · ⚠ below {m.sufficiency.minDays} d / {m.sufficiency.minReadingsPerDay}-a-day</span>}</>} />

        <Metric className="col-span-6 lg:col-span-4" label="Mean" big={<>{val(m.meanMgdl) ?? '—'}<small className="text-xs font-normal text-gray-500 ml-1">{unitLabel}</small></>} note={`SD ${val(m.sdMgdl) ?? '—'}`} />
        <Metric className="col-span-6 lg:col-span-4" label="Variability · CV" big={<span className={m.cvPct === null ? '' : m.cvPct <= t.cvTargetPct ? 'text-green-700' : 'text-amber-700'}>{m.cvPct ?? '—'}<small className="text-xs font-normal text-gray-500 ml-1">%</small></span>} note={`target ≤ ${t.cvTargetPct} %`} />
        <Metric className="col-span-6 lg:col-span-4" label="Hypos" big={<span className={m.hypoCount ? 'text-red-700' : ''}>{m.hypoCount}</span>} note={`${m.hypoLevel2Count} below ${val(t.tbrLevel2Mgdl)} · see the Hypos tab`} />
      </div>

      {/* Pre / post-meal */}
      {m.mealTags && (m.mealTags.pre.n > 0 || m.mealTags.post.n > 0) && (
        <div className="grid grid-cols-2 gap-3 mb-4">
          {[['Pre-meal', m.mealTags.pre], ['Post-meal', m.mealTags.post]].map(([label, mt]) => (
            <div key={label} className="p-3 rounded-xl bg-gray-50 border border-gray-200">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-1">{label} average</p>
              <p className="text-2xl font-extrabold text-gray-800 leading-none">{val(mt.meanMgdl) ?? '—'}<small className="text-xs font-normal text-gray-500 ml-1">{unitLabel}</small></p>
              <p className="text-[11px] text-gray-500 mt-1.5">{mt.inRangePct === null ? '—' : `${mt.inRangePct} % in range`} · n = {mt.n}</p>
            </div>
          ))}
          <p className="col-span-2 text-[11px] text-gray-400">Meal timing from the diary and logbook{m.mealTags.matched ? ` · ${m.mealTags.matched} meter reading${m.mealTags.matched === 1 ? '' : 's'} matched to a diary meal` : ''}. A reading up to 60 min before a meal is pre-meal; 60–180 min after is post-meal.</p>
        </div>
      )}

      {/* Time of day */}
      <ChartCard title="Time-of-day profile" caption="Mean ± SD per period by clock time (logbook by slot) · n under each · greyed when n < 3">
        <div style={{ height: 240 }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={m.timeOfDay.map((b) => ({ ...b, mean: val(b.meanMgdl), sd: val(b.sdMgdl) ?? 0, label: `${b.label}\nn = ${b.n}` }))} margin={{ top: 10, right: 12, bottom: 4, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="label" tick={<TwoLineTick />} interval={0} height={36} />
              <YAxis domain={[0, unit === 'mmol' ? 18 : 324]} tick={{ fontSize: 11, fill: '#6b7280' }} width={34} />
              <ReferenceArea y1={val(t.tirLowMgdl)} y2={val(t.tirHighMgdl)} fill="#dbe8f7" fillOpacity={0.6} />
              <Tooltip cursor={false} formatter={(v, n) => [v, n === 'mean' ? `Mean (${unitLabel})` : n]} labelFormatter={(l) => l.replace('\n', ' · ')} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Bar dataKey="mean" name="mean" radius={[4, 4, 0, 0]} isAnimationActive={false} shape={(p) => <rect x={p.x} y={p.y} width={p.width} height={p.height} rx={4} fill={p.payload.n < 3 ? '#cbd5e1' : SOURCE_META.meter.color} />}>
                <ErrorBar dataKey="sd" width={6} strokeWidth={1.5} stroke="#374151" />
              </Bar>
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      {/* Targets */}
      <ChartCard title="Targets for this patient" caption="Clinic default (in range 4–10 mmol/L) until a doctor sets individual targets · every summary says which set was used"
        action={isClinician && <Button variant="outline" onClick={onEditTargets} className="!px-4 !py-2 text-sm"><Target className="w-4 h-4" /> {data.targets.individualised ? 'Change targets' : 'Set individual targets'}</Button>}>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 text-sm">
          {[
            ['In range · low', val(t.tirLowMgdl), val(data.targets.consensus.tirLowMgdl)], ['In range · high', val(t.tirHighMgdl), val(data.targets.consensus.tirHighMgdl)],
            ['Level-2 low', val(t.tbrLevel2Mgdl), val(data.targets.consensus.tbrLevel2Mgdl)], ['Level-2 high', val(t.tarLevel2Mgdl), val(data.targets.consensus.tarLevel2Mgdl)],
            ['Fasting band', `${val(t.fastingLowMgdl)} – ${val(t.fastingHighMgdl)}`, `${val(data.targets.consensus.fastingLowMgdl)} – ${val(data.targets.consensus.fastingHighMgdl)}`],
            ['TIR goal / CV', `> ${t.tirGoalPct} % · ≤ ${t.cvTargetPct} %`, `> ${data.targets.consensus.tirGoalPct} % · ≤ ${data.targets.consensus.cvTargetPct} %`],
          ].map(([k, v, c]) => (
            <div key={k} className="p-2.5 rounded-lg bg-gray-50 border border-gray-200"><p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">{k}</p><p className="font-bold text-gray-800">{v}</p><p className="text-[11px] text-gray-400">default {c}</p></div>
          ))}
        </div>
        {data.targets.individualised && data.targets.meta && (
          <p className="text-xs text-amber-800 mt-2">Individualised{data.targets.meta.preset ? ` (${data.targets.presets?.[data.targets.meta.preset]?.label || data.targets.meta.preset})` : ''} by {data.targets.meta.setByName || '—'} on {new Date(data.targets.meta.setAt).toLocaleDateString('en-GB')}: &ldquo;{data.targets.meta.rationale}&rdquo;</p>
        )}
      </ChartCard>
    </div>
  );
};

// Measured HbA1c: the latest, clickable to open the SAME HbA1c-history trend
// modal the triage vitals grid uses (DRY). Fed from the summary's hba1cHistory
// (the PatientVital HbA1c records), so it works in every portal — including the
// patient's, which cannot call the clinician-only vitals-history endpoint.
const Hba1cCard = ({ className = '', data }) => {
  const [open, setOpen] = useState(false);
  const hist = data.hba1cHistory || [];
  const latest = data.hba1c;
  const older = hist.slice(1);
  const trendUp = older.length && latest?.value != null && older[0]?.value != null ? latest.value - older[0].value : null;
  const clickable = hist.length > 0;
  const history = hist.map((h) => ({ recordedAt: h.at, hba1c: h.value }));

  return (
    <>
      <div className={`p-3 rounded-xl bg-gray-50 border border-gray-200 min-w-0 ${className} ${clickable ? 'cursor-pointer hover:shadow-sm hover:border-gray-300 transition' : ''}`}
        onClick={clickable ? () => setOpen(true) : undefined} role={clickable ? 'button' : undefined} tabIndex={clickable ? 0 : undefined}
        onKeyDown={clickable ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(true); } } : undefined}>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-1">Measured HbA1c</p>
        {latest?.value != null ? (
          <>
            <p className="text-2xl font-extrabold text-gray-800 leading-none">{latest.value}<small className="text-xs font-normal text-gray-500 ml-1">%</small>
              {trendUp !== null && trendUp !== 0 && <small className={`text-xs font-bold ml-2 ${trendUp > 0 ? 'text-red-600' : 'text-green-600'}`}>{trendUp > 0 ? '▲' : '▼'} {Math.abs(Math.round(trendUp * 10) / 10)}</small>}
            </p>
            <p className="text-[11px] text-gray-500 mt-1.5 flex items-center gap-1">{latest.at ? fmtWhen(latest.at).slice(0, 8) : 'on record'}
              {clickable && <span className="inline-flex items-center gap-0.5 font-semibold text-primary ml-1"><TrendingUp className="w-3 h-3" /> {hist.length} record{hist.length === 1 ? '' : 's'}</span>}
            </p>
          </>
        ) : <p className="text-sm text-gray-400 mt-2">No HbA1c on record.</p>}
      </div>
      {open && <VitalsTrendModal group="hba1c" history={history} loading={false} onClose={() => setOpen(false)} />}
    </>
  );
};

export default GlucoseIndicesTab;
