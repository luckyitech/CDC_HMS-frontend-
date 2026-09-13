import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { BAND, SOURCE_META, SourceSwatch, ChartCard, Empty, fmtWhen } from './gmcShared';

/**
 * Hypos — the low-glucose picture, the way the meter's own "Low Glucose Events"
 * report shows it: when in the day hypos happen (a 3-hourly bar chart), how many
 * and how severe (level 1 below range, level 2 below the level-2 threshold),
 * and every event listed. Fed from the server's hypo list (constants/glucose.js
 * flags every countable reading under the in-range floor), so it agrees with the
 * TIR figures on the Indices tab.
 */
const BINS = [
  { h: 0, label: '12am' }, { h: 3, label: '3am' }, { h: 6, label: '6am' }, { h: 9, label: '9am' },
  { h: 12, label: '12pm' }, { h: 15, label: '3pm' }, { h: 18, label: '6pm' }, { h: 21, label: '9pm' },
];

const GlucoseHyposTab = ({ data, m, t, val, unitLabel }) => {
  const hypos = useMemo(() => m?.hypos || [], [m]);
  const l2Threshold = val(t.tbrLevel2Mgdl);

  const binData = useMemo(() => {
    const rows = BINS.map((b) => ({ label: b.label, l1: 0, l2: 0 }));
    for (const hy of hypos) {
      const hr = Number(String(hy.at).slice(11, 13));
      const idx = Number.isNaN(hr) ? 0 : Math.min(Math.floor(hr / 3), 7);
      if (hy.level === 2) rows[idx].l2 += 1; else rows[idx].l1 += 1;
    }
    return rows;
  }, [hypos]);

  const list = useMemo(() => [...hypos].sort((a, b) => (a.at < b.at ? 1 : -1)), [hypos]);
  const perDay = m.days ? Math.round((10 * hypos.length) / m.days) / 10 : 0;

  return (
    <div>
      {/* summary strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
        <Stat label="Total hypos" value={hypos.length} tone={hypos.length ? 'bad' : 'good'} />
        <Stat label={`Level 2 (< ${l2Threshold})`} value={m.hypoLevel2Count} tone={m.hypoLevel2Count ? 'bad' : ''} />
        <Stat label="Level 1" value={hypos.length - m.hypoLevel2Count} />
        <Stat label="Per day" value={perDay} />
      </div>

      <ChartCard title="Low-glucose events by time of day" caption={`Below ${val(t.tirLowMgdl)} ${unitLabel} · ${m.days}-day window · darker = level-2 (below ${l2Threshold})`}>
        {hypos.length === 0 ? (
          <div className="py-8 text-center text-sm text-green-700 bg-green-50 rounded-lg border-2 border-dashed border-green-200">No hypoglycaemia recorded in this window.</div>
        ) : (
          <div style={{ height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={binData} margin={{ top: 10, right: 12, bottom: 4, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#6b7280' }} interval={0} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#6b7280' }} width={28} />
                <Tooltip cursor={false} contentStyle={{ fontSize: 12, borderRadius: 8 }} formatter={(v, n) => [v, n === 'l2' ? 'Level 2' : 'Level 1']} />
                <Bar dataKey="l1" stackId="h" fill={BAND.low} name="l1" radius={[0, 0, 0, 0]} isAnimationActive={false} activeBar={{ stroke: '#7f1d1d', strokeWidth: 1.5 }} />
                <Bar dataKey="l2" stackId="h" fill={BAND.veryLow} name="l2" radius={[3, 3, 0, 0]} isAnimationActive={false} activeBar={{ stroke: '#7f1d1d', strokeWidth: 1.5 }} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600 mt-2">
          <span className="inline-flex items-center gap-1.5"><i className="inline-block w-3 h-3 rounded" style={{ background: BAND.low }} /> Level 1 · below {val(t.tirLowMgdl)} {unitLabel}</span>
          <span className="inline-flex items-center gap-1.5"><i className="inline-block w-3 h-3 rounded" style={{ background: BAND.veryLow }} /> Level 2 · below {l2Threshold} {unitLabel}</span>
        </div>
      </ChartCard>

      {list.length > 0 && (
        <ChartCard title="Every hypo in the window" caption={`${list.length} event${list.length === 1 ? '' : 's'}, newest first`}>
          <div className="space-y-1">
            {list.map((hy, i) => (
              <div key={i} className="flex items-center gap-2.5 p-2 rounded-lg border border-gray-100 bg-white">
                <span className="text-xs text-gray-500 w-28 flex-shrink-0 tabular-nums">{fmtWhen(hy.at)}</span>
                <span className="text-sm font-bold w-20 flex-shrink-0" style={{ color: hy.level === 2 ? BAND.veryLow : BAND.low }}>{val(hy.mgdl)} <span className="font-normal text-gray-400 text-xs">{unitLabel}</span></span>
                <span className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded-full flex-shrink-0 ${hy.level === 2 ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>Level {hy.level}</span>
                <span className="inline-flex items-center gap-1.5 text-xs text-gray-500 flex-1 min-w-0"><SourceSwatch source={hy.source} /> {SOURCE_META[hy.source]?.label || hy.source}</span>
              </div>
            ))}
          </div>
        </ChartCard>
      )}
    </div>
  );
};

const Stat = ({ label, value, tone }) => (
  <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-200 text-center">
    <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">{label}</p>
    <p className={`text-lg font-extrabold leading-tight ${tone === 'good' ? 'text-green-700' : tone === 'bad' ? 'text-red-700' : 'text-gray-800'}`}>{value}</p>
  </div>
);

export default GlucoseHyposTab;
